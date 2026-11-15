import { createReadStream } from "node:fs";
import { Readable } from "node:stream";
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
  const text = buffer.toString("utf8");
  const records = {};
  let offset = 0;
  while (offset < Buffer.byteLength(text, "utf8")) {
    const space = text.indexOf(" ", offset);
    if (space < 0) throw new Error("Malformed PAX TAR metadata record.");
    const length = Number.parseInt(text.slice(offset, space), 10);
    if (!Number.isInteger(length) || length <= space - offset + 1) {
      throw new Error("Malformed PAX TAR metadata record length.");
    }
    const recordEnd = offset + length;
    const record = Buffer.from(text, "utf8").subarray(space + 1, recordEnd).toString("utf8");
    const equals = record.indexOf("=");
    if (equals > 0) records[record.slice(0, equals)] = record.slice(equals + 1).replace(/\n$/, "");
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

async function* decompressedTarChunks(archivePath) {
  const source = createReadStream(archivePath);
  const decompressed = createZstdDecompress();
  source.on("error", (error) => decompressed.destroy(error));
  source.pipe(decompressed);
  try {
    for await (const chunk of decompressed) yield chunk;
  } finally {
    source.destroy();
    decompressed.destroy();
  }
}

/**
 * Lists TAR headers from a Zstandard-compressed archive.
 * Payload bytes are discarded as they stream past; archive members are never extracted.
 * PAX path metadata and GNU long-name records are interpreted without extracting them.
 */
export async function listZstdTarMembers(archivePath) {
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

  for await (const chunk of decompressedTarChunks(archivePath)) {
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

async function* selectedTarMemberChunks(archivePath, memberName) {
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

  for await (const chunk of decompressedTarChunks(archivePath)) {
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

export function openZstdTarMember(archivePath, memberName) {
  if (typeof archivePath !== "string" || !archivePath) throw new TypeError("An archive path is required.");
  if (typeof memberName !== "string" || !memberName) throw new TypeError("A TAR member name is required.");
  assertZstdAvailable();
  return Readable.from(selectedTarMemberChunks(archivePath, memberName), { objectMode: false });
}
