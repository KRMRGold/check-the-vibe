import { createReadStream } from "node:fs";
import { stat } from "node:fs/promises";
import { PassThrough, Readable } from "node:stream";
import { createZstdDecompress } from "node:zlib";

const BLOCK_SIZE = 512;
const TAR_ZERO_BLOCK = Buffer.alloc(BLOCK_SIZE);
const MAX_EXTENSION_SIZE = 1024 * 1024;

function readOctal(field, label) {
  const text = field.toString("ascii").replace(/\0.*$/s, "").trim();
  if (!text) return 0;
  if (/^[0-7]+$/.test(text)) return Number.parseInt(text, 8);
  throw new Error(`Unsupported TAR ${label} encoding.`);
}

function parseHeader(header) {
  const storedChecksum = readOctal(header.subarray(148, 156), "checksum");
  let checksum = 0;
  for (let index = 0; index < BLOCK_SIZE; index += 1) {
    checksum += index >= 148 && index < 156 ? 32 : header[index];
  }
  if (checksum !== storedChecksum) throw new Error("TAR header checksum is invalid.");

  const name = header.subarray(0, 100).toString("utf8").replace(/\0.*$/s, "");
  const prefix = header.subarray(345, 500).toString("utf8").replace(/\0.*$/s, "");
  const fullName = prefix ? `${prefix}/${name}` : name;
  const size = readOctal(header.subarray(124, 136), "size");
  const typeFlag = String.fromCharCode(header[156] || 48);
  const extensionTypes = { x: "pax-local", g: "pax-global", L: "gnu-long-name", K: "gnu-long-link" };

  if (!fullName) throw new Error("TAR member has an empty name.");
  return {
    name: fullName,
    size,
    typeFlag,
    extensionType: extensionTypes[typeFlag] ?? null,
    type: typeFlag === "5" ? "directory" : typeFlag === "0" || typeFlag === "7" ? "file" : "other"
  };
}

function parsePaxRecords(buffer) {
  const records = {};
  let offset = 0;
  while (offset < buffer.length) {
    const space = buffer.indexOf(0x20, offset);
    if (space < 0) throw new Error("Malformed PAX TAR metadata record.");
    const lengthText = buffer.subarray(offset, space).toString("ascii");
    const length = Number.parseInt(lengthText, 10);
    if (!/^\d+$/.test(lengthText) || !Number.isInteger(length) || length <= space - offset + 1) {
      throw new Error("Malformed PAX TAR metadata record length.");
    }
    const recordEnd = offset + length;
    if (recordEnd > buffer.length) throw new Error("Truncated PAX TAR metadata record.");
    const recordBytes = buffer.subarray(space + 1, recordEnd);
    const record = recordBytes.subarray(0, recordBytes.at(-1) === 0x0a ? -1 : undefined).toString("utf8");
    const equals = record.indexOf("=");
    if (equals > 0) records[record.slice(0, equals)] = record.slice(equals + 1);
    offset = recordEnd;
  }
  return records;
}

function decodeExtension(type, chunks) {
  const payload = Buffer.concat(chunks);
  if (payload.length > MAX_EXTENSION_SIZE) {
    throw new Error("TAR extension metadata exceeds the 1 MiB safety limit.");
  }
  if (type === "pax-local" || type === "pax-global") return parsePaxRecords(payload);
  if (type === "gnu-long-name" || type === "gnu-long-link") {
    return { value: payload.toString("utf8").replace(/[\0\n]+$/, "") };
  }
  return {};
}

function applyExtensions(member, globalPax, localPax, longName) {
  const name = longName ?? localPax.path ?? globalPax.path ?? member.name;
  return { name, size: member.size, type: member.type };
}

function hasZeroBlock(buffer) {
  return buffer.equals(TAR_ZERO_BLOCK);
}

function assertZstdAvailable() {
  if (typeof createZstdDecompress !== "function") {
    const error = new Error("This Node.js runtime does not provide native Zstandard decompression.");
    error.code = "ZSTD_UNAVAILABLE";
    throw error;
  }
}

function createAbortError() {
  const error = new Error("Canonical archive processing was cancelled.");
  error.name = "AbortError";
  error.code = "ABORT_ERR";
  return error;
}

function throwIfAborted(signal) {
  if (signal?.aborted) throw createAbortError();
}

async function* decompressedTarChunks(archivePath, {
  signal,
  onProgress,
  phase = "archive_index"
} = {}) {
  throwIfAborted(signal);
  const totalBytes = (await stat(archivePath)).size;
  throwIfAborted(signal);
  const source = createReadStream(archivePath);
  const decompressed = createZstdDecompress();
  let reportedBytes = 0;
  const reportInterval = 16 * 1024 * 1024;
  const onAbort = () => {
    const error = createAbortError();
    source.destroy(error);
    decompressed.destroy(error);
  };
  signal?.addEventListener("abort", onAbort, { once: true });
  source.on("error", (error) => decompressed.destroy(error));
  source.pipe(decompressed);
  try {
    throwIfAborted(signal);
    for await (const chunk of decompressed) {
      throwIfAborted(signal);
      const bytesProcessed = source.bytesRead;
      if (onProgress && bytesProcessed - reportedBytes >= reportInterval) {
        reportedBytes = bytesProcessed;
        onProgress({ phase, bytesProcessed, totalBytes });
      }
      yield chunk;
    }
    if (onProgress && source.bytesRead !== reportedBytes) {
      onProgress({ phase, bytesProcessed: source.bytesRead, totalBytes });
    }
  } finally {
    signal?.removeEventListener("abort", onAbort);
    source.destroy();
    decompressed.destroy();
  }
}

/**
 * Lists TAR headers from a Zstandard-compressed archive.
 * Payload bytes are discarded as they stream past; archive members are never extracted.
 * PAX path metadata and GNU long-name records are interpreted without extracting them.
 */
export async function listZstdTarMembers(archivePath, { signal, onProgress } = {}) {
  assertZstdAvailable();
  const members = [];
  let pending = Buffer.alloc(0);
  let payloadRemaining = 0;
  let currentSize = 0;
  let paddingRemaining = 0;
  let reachedEnd = false;
  let extensionType = null;
  let extensionChunks = [];
  let globalPax = {};
  let localPax = {};
  let longName = null;

  for await (const chunk of decompressedTarChunks(archivePath, { signal, onProgress, phase: "archive_index" })) {
    throwIfAborted(signal);
    pending = pending.length ? Buffer.concat([pending, chunk]) : chunk;
    while (true) {
      if (reachedEnd) { pending = Buffer.alloc(0); break; }
      if (payloadRemaining > 0) {
        const consumed = Math.min(payloadRemaining, pending.length);
        if (extensionType && consumed) {
          const part = pending.subarray(0, consumed);
          extensionChunks.push(Buffer.from(part));
          if (extensionChunks.reduce((sum, item) => sum + item.length, 0) > MAX_EXTENSION_SIZE) {
            throw new Error("TAR extension metadata exceeds the 1 MiB safety limit.");
          }
        }
        pending = pending.subarray(consumed);
        payloadRemaining -= consumed;
        if (payloadRemaining > 0) break;
        if (extensionType) {
          const decoded = decodeExtension(extensionType, extensionChunks);
          if (extensionType === "pax-global") globalPax = { ...globalPax, ...decoded };
          else if (extensionType === "pax-local") localPax = decoded;
          else if (extensionType === "gnu-long-name") longName = decoded.value;
          extensionType = null;
          extensionChunks = [];
        }
        paddingRemaining = (BLOCK_SIZE - (currentSize % BLOCK_SIZE)) % BLOCK_SIZE;
        continue;
      }
      if (paddingRemaining > 0) {
        const consumed = Math.min(paddingRemaining, pending.length);
        pending = pending.subarray(consumed);
        paddingRemaining -= consumed;
        if (paddingRemaining > 0) break;
        continue;
      }
      if (pending.length < BLOCK_SIZE) break;
      const header = pending.subarray(0, BLOCK_SIZE);
      pending = pending.subarray(BLOCK_SIZE);
      if (hasZeroBlock(header)) { reachedEnd = true; continue; }
      const member = parseHeader(header);
      currentSize = member.size;
      payloadRemaining = member.size;
      if (member.extensionType) {
        extensionType = member.extensionType;
        extensionChunks = [];
        if (payloadRemaining === 0) {
          const decoded = decodeExtension(extensionType, extensionChunks);
          if (extensionType === "pax-global") globalPax = { ...globalPax, ...decoded };
          else if (extensionType === "pax-local") localPax = decoded;
          else if (extensionType === "gnu-long-name") longName = decoded.value;
          extensionType = null;
        }
      } else {
        members.push(applyExtensions(member, globalPax, localPax, longName));
        localPax = {};
        longName = null;
      }
    }
  }
  if (!reachedEnd || payloadRemaining > 0 || paddingRemaining > 0 || pending.length > 0) {
    throw new Error("Zstandard TAR archive ended before a complete TAR end marker.");
  }
  return members;
}

async function* selectedTarMemberChunks(archivePath, memberName, signal) {
  let pending = Buffer.alloc(0);
  let payloadRemaining = 0;
  let currentMemberSize = 0;
  let paddingRemaining = 0;
  let selected = false;
  let found = false;
  let reachedEnd = false;
  let extensionType = null;
  let extensionChunks = [];
  let globalPax = {};
  let localPax = {};
  let longName = null;

  for await (const chunk of decompressedTarChunks(archivePath, { signal })) {
    throwIfAborted(signal);
    pending = pending.length ? Buffer.concat([pending, chunk]) : chunk;
    while (true) {
      if (payloadRemaining > 0) {
        const consumed = Math.min(payloadRemaining, pending.length);
        if (extensionType && consumed) {
          extensionChunks.push(Buffer.from(pending.subarray(0, consumed)));
          if (extensionChunks.reduce((sum, item) => sum + item.length, 0) > MAX_EXTENSION_SIZE) {
            throw new Error("TAR extension metadata exceeds the 1 MiB safety limit.");
          }
        } else if (selected && consumed) {
          yield pending.subarray(0, consumed);
        }
        pending = pending.subarray(consumed);
        payloadRemaining -= consumed;
        if (payloadRemaining > 0) break;
        if (extensionType) {
          const decoded = decodeExtension(extensionType, extensionChunks);
          if (extensionType === "pax-global") globalPax = { ...globalPax, ...decoded };
          else if (extensionType === "pax-local") localPax = decoded;
          else if (extensionType === "gnu-long-name") longName = decoded.value;
          extensionType = null;
          extensionChunks = [];
        }
        paddingRemaining = (BLOCK_SIZE - (currentMemberSize % BLOCK_SIZE)) % BLOCK_SIZE;
        if (selected) return;
        continue;
      }
      if (paddingRemaining > 0) {
        const consumed = Math.min(paddingRemaining, pending.length);
        pending = pending.subarray(consumed);
        paddingRemaining -= consumed;
        if (paddingRemaining > 0) break;
        continue;
      }
      if (pending.length < BLOCK_SIZE) break;
      const header = pending.subarray(0, BLOCK_SIZE);
      pending = pending.subarray(BLOCK_SIZE);
      if (hasZeroBlock(header)) { reachedEnd = true; break; }
      const member = parseHeader(header);
      currentMemberSize = member.size;
      payloadRemaining = member.size;
      if (member.extensionType) {
        extensionType = member.extensionType;
        extensionChunks = [];
        if (payloadRemaining === 0) {
          const decoded = decodeExtension(extensionType, extensionChunks);
          if (extensionType === "pax-global") globalPax = { ...globalPax, ...decoded };
          else if (extensionType === "pax-local") localPax = decoded;
          else if (extensionType === "gnu-long-name") longName = decoded.value;
          extensionType = null;
        }
        selected = false;
      } else {
        const resolved = applyExtensions(member, globalPax, localPax, longName);
        selected = resolved.name === memberName;
        localPax = {};
        longName = null;
        if (selected) {
          if (resolved.type !== "file") throw new Error(`TAR member "${memberName}" is not a regular file.`);
          found = true;
          if (payloadRemaining === 0) return;
        }
      }
    }
    if (reachedEnd) break;
  }
  if (payloadRemaining > 0 || paddingRemaining > 0) {
    throw new Error(`TAR member "${memberName}" is truncated.`);
  }
  if (!reachedEnd) throw new Error("Zstandard TAR archive ended before a complete TAR end marker.");
  if (!found) throw new Error(`TAR member "${memberName}" was not found.`);
}


async function* selectedTarMembersChunks(archivePath, memberNames, signal) {
  const selectedNames = new Set(memberNames);
  const found = new Set();
  let pending = Buffer.alloc(0);
  let payloadRemaining = 0;
  let currentMemberSize = 0;
  let paddingRemaining = 0;
  let selectedName = null;
  let reachedEnd = false;
  let extensionType = null;
  let extensionChunks = [];
  let globalPax = {};
  let localPax = {};
  let longName = null;

  for await (const chunk of decompressedTarChunks(archivePath, { signal })) {
    throwIfAborted(signal);
    pending = pending.length ? Buffer.concat([pending, chunk]) : chunk;
    while (true) {
      if (payloadRemaining > 0) {
        const consumed = Math.min(payloadRemaining, pending.length);
        if (extensionType && consumed) {
          extensionChunks.push(Buffer.from(pending.subarray(0, consumed)));
          if (extensionChunks.reduce((sum, item) => sum + item.length, 0) > MAX_EXTENSION_SIZE) {
            throw new Error("TAR extension metadata exceeds the 1 MiB safety limit.");
          }
        } else if (selectedName && consumed) {
          yield { memberName: selectedName, chunk: Buffer.from(pending.subarray(0, consumed)) };
        }
        pending = pending.subarray(consumed);
        payloadRemaining -= consumed;
        if (payloadRemaining > 0) break;
        if (extensionType) {
          const decoded = decodeExtension(extensionType, extensionChunks);
          if (extensionType === "pax-global") globalPax = { ...globalPax, ...decoded };
          else if (extensionType === "pax-local") localPax = decoded;
          else if (extensionType === "gnu-long-name") longName = decoded.value;
          extensionType = null;
          extensionChunks = [];
        } else if (selectedName) {
          yield { memberName: selectedName, chunk: null };
          selectedName = null;
        }
        paddingRemaining = (BLOCK_SIZE - (currentMemberSize % BLOCK_SIZE)) % BLOCK_SIZE;
        continue;
      }
      if (paddingRemaining > 0) {
        const consumed = Math.min(paddingRemaining, pending.length);
        pending = pending.subarray(consumed);
        paddingRemaining -= consumed;
        if (paddingRemaining > 0) break;
        continue;
      }
      if (pending.length < BLOCK_SIZE) break;
      const header = pending.subarray(0, BLOCK_SIZE);
      pending = pending.subarray(BLOCK_SIZE);
      if (hasZeroBlock(header)) {
        reachedEnd = true;
        break;
      }
      const member = parseHeader(header);
      currentMemberSize = member.size;
      payloadRemaining = member.size;
      if (member.extensionType) {
        extensionType = member.extensionType;
        extensionChunks = [];
        if (payloadRemaining === 0) {
          const decoded = decodeExtension(extensionType, extensionChunks);
          if (extensionType === "pax-global") globalPax = { ...globalPax, ...decoded };
          else if (extensionType === "pax-local") localPax = decoded;
          else if (extensionType === "gnu-long-name") longName = decoded.value;
          extensionType = null;
        }
        selectedName = null;
      } else {
        const resolved = applyExtensions(member, globalPax, localPax, longName);
        selectedName = selectedNames.has(resolved.name) ? resolved.name : null;
        localPax = {};
        longName = null;
        if (selectedName) {
          if (found.has(selectedName)) throw new Error(`TAR member "${selectedName}" occurs more than once.`);
          if (resolved.type !== "file") throw new Error(`TAR member "${selectedName}" is not a regular file.`);
          found.add(selectedName);
          if (payloadRemaining === 0) {
            yield { memberName: selectedName, chunk: null };
            selectedName = null;
          }
        }
      }
    }
    if (reachedEnd) break;
  }

  if (payloadRemaining > 0 || paddingRemaining > 0) {
    throw new Error("A selected TAR member or archive payload is truncated.");
  }
  if (!reachedEnd) throw new Error("Zstandard TAR archive ended before a complete TAR end marker.");
  for (const name of selectedNames) {
    if (!found.has(name)) throw new Error(`TAR member "${name}" was not found.`);
  }
}

function writeWithBackpressure(stream, chunk) {
  if (stream.destroyed) return Promise.reject(new Error("A selected TAR member stream was closed."));
  if (stream.write(chunk)) return Promise.resolve();
  return new Promise((resolve, reject) => {
    const cleanup = () => {
      stream.off("drain", onDrain);
      stream.off("error", onError);
      stream.off("close", onClose);
    };
    const onDrain = () => { cleanup(); resolve(); };
    const onError = (error) => { cleanup(); reject(error); };
    const onClose = () => { cleanup(); reject(new Error("A selected TAR member stream was closed.")); };
    stream.once("drain", onDrain);
    stream.once("error", onError);
    stream.once("close", onClose);
  });
}

/**
 * Opens several selected regular-file members during one archive traversal.
 * Each returned stream applies backpressure to the shared TAR reader.
 */
export function openZstdTarMembers(archivePath, memberNames, { signal } = {}) {
  if (typeof archivePath !== "string" || !archivePath) throw new TypeError("An archive path is required.");
  if (!Array.isArray(memberNames) || memberNames.length < 1 ||
      memberNames.some((name) => typeof name !== "string" || !name) ||
      new Set(memberNames).size !== memberNames.length) {
    throw new TypeError("One or more unique TAR member names are required.");
  }
  assertZstdAvailable();

  const streams = new Map(memberNames.map((name) => {
    const stream = new PassThrough();
    // A later selected member may fail before its consumer starts; keep that error observable
    // through the stream iterator without allowing an unhandled EventEmitter error.
    stream.on("error", () => {});
    return [name, stream];
  }));
  const done = (async () => {
    try {
      for await (const event of selectedTarMembersChunks(archivePath, memberNames, signal)) {
        const stream = streams.get(event.memberName);
        if (event.chunk === null) stream.end();
        else await writeWithBackpressure(stream, event.chunk);
      }
    } catch (error) {
      for (const stream of streams.values()) {
        if (!stream.destroyed) stream.destroy(error);
      }
      throw error;
    }
  })();
  // The caller awaits the completion promise; attach a handler while CSV consumers finish.
  done.catch(() => {});

  return {
    streams,
    done,
    destroy(error = new Error("Selected TAR member streams were cancelled.")) {
      for (const stream of streams.values()) {
        if (!stream.destroyed) stream.destroy(error);
      }
    }
  };
}

export function openZstdTarMember(archivePath, memberName, { signal } = {}) {
  if (typeof archivePath !== "string" || !archivePath) throw new TypeError("An archive path is required.");
  if (typeof memberName !== "string" || !memberName) throw new TypeError("A TAR member name is required.");
  assertZstdAvailable();
  return Readable.from(selectedTarMemberChunks(archivePath, memberName, signal), { objectMode: false });
}
