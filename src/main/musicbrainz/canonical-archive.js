import { createReadStream } from "node:fs";
import { Readable } from "node:stream";
import { createZstdDecompress } from "node:zlib";

const BLOCK_SIZE = 512;
const TAR_ZERO_BLOCK = Buffer.alloc(BLOCK_SIZE);

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
  if (checksum !== storedChecksum) {
    throw new Error("TAR header checksum is invalid.");
  }

  const name = header.subarray(0, 100).toString("utf8").replace(/\0.*$/s, "");
  const prefix = header.subarray(345, 500).toString("utf8").replace(/\0.*$/s, "");
  const fullName = prefix ? `${prefix}/${name}` : name;
  const size = readOctal(header.subarray(124, 136), "size");
  const typeFlag = String.fromCharCode(header[156] || 48);

  if (!fullName) throw new Error("TAR member has an empty name.");
  if (["L", "K", "x", "g"].includes(typeFlag)) {
    throw new Error("PAX and GNU long-name TAR extensions are not supported by this reader.");
  }

  return {
    name: fullName,
    size,
    type: typeFlag === "5" ? "directory" : typeFlag === "0" || typeFlag === "7" ? "file" : "other"
  };
}

function hasZeroBlock(buffer) {
  return buffer.equals(TAR_ZERO_BLOCK);
}

/**
 * Lists TAR headers from a Zstandard-compressed archive.
 * Payload bytes are discarded as they stream past; archive members are never extracted.
 */
export async function listZstdTarMembers(archivePath) {
  if (typeof createZstdDecompress !== "function") {
    const error = new Error("This Node.js runtime does not provide native Zstandard decompression.");
    error.code = "ZSTD_UNAVAILABLE";
    throw error;
  }

  const source = createReadStream(archivePath);
  const decompressed = createZstdDecompress();
  source.on("error", (error) => decompressed.destroy(error));
  source.pipe(decompressed);
  const members = [];
  let pending = Buffer.alloc(0);
  let payloadRemaining = 0;
  let currentSize = 0;
  let paddingRemaining = 0;
  let reachedEnd = false;

  for await (const chunk of decompressed) {
    pending = pending.length ? Buffer.concat([pending, chunk]) : chunk;

    while (true) {
      if (reachedEnd) {
        pending = Buffer.alloc(0);
        break;
      }

      if (payloadRemaining > 0) {
        const consumed = Math.min(payloadRemaining, pending.length);
        pending = pending.subarray(consumed);
        payloadRemaining -= consumed;
        if (payloadRemaining > 0) break;
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
      if (hasZeroBlock(header)) {
        reachedEnd = true;
        continue;
      }

      const member = parseHeader(header);
      members.push(member);
      currentSize = member.size;
      payloadRemaining = member.size;
      if (payloadRemaining === 0) {
        paddingRemaining = 0;
      }
    }
  }

  if (!reachedEnd || payloadRemaining > 0 || paddingRemaining > 0 || pending.length > 0) {
    throw new Error("Zstandard TAR archive ended before a complete TAR end marker.");
  }

  return members;
}


async function* selectedTarMemberChunks(archivePath, memberName) {
  const source = createReadStream(archivePath);
  const decompressed = createZstdDecompress();
  source.on("error", (error) => decompressed.destroy(error));
  source.pipe(decompressed);

  let pending = Buffer.alloc(0);
  let payloadRemaining = 0;
  let currentMemberSize = 0;
  let paddingRemaining = 0;
  let selected = false;
  let found = false;
  let reachedEnd = false;

  try {
    for await (const chunk of decompressed) {
      pending = pending.length ? Buffer.concat([pending, chunk]) : chunk;

      while (true) {
        if (payloadRemaining > 0) {
          const consumed = Math.min(payloadRemaining, pending.length);
          if (selected && consumed > 0) yield pending.subarray(0, consumed);
          pending = pending.subarray(consumed);
          payloadRemaining -= consumed;
          if (payloadRemaining > 0) break;
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
        if (hasZeroBlock(header)) {
          reachedEnd = true;
          break;
        }

        const member = parseHeader(header);
        selected = member.name === memberName;
        if (selected) {
          if (member.type !== "file") {
            throw new Error(`TAR member "${memberName}" is not a regular file.`);
          }
          found = true;
        }
        currentMemberSize = member.size;
        payloadRemaining = member.size;
        if (payloadRemaining === 0 && selected) return;
      }

      if (reachedEnd) break;
    }
  } finally {
    source.destroy();
    decompressed.destroy();
  }

  if (payloadRemaining > 0 || paddingRemaining > 0) {
    throw new Error(`TAR member "${memberName}" is truncated.`);
  }
  if (!reachedEnd) {
    throw new Error("Zstandard TAR archive ended before a complete TAR end marker.");
  }
  if (!found) throw new Error(`TAR member "${memberName}" was not found.`);
}

export function openZstdTarMember(archivePath, memberName) {
  if (typeof archivePath !== "string" || !archivePath) {
    throw new TypeError("An archive path is required.");
  }
  if (typeof memberName !== "string" || !memberName) {
    throw new TypeError("A TAR member name is required.");
  }
  if (typeof createZstdDecompress !== "function") {
    const error = new Error("This Node.js runtime does not provide native Zstandard decompression.");
    error.code = "ZSTD_UNAVAILABLE";
    throw error;
  }
  return Readable.from(selectedTarMemberChunks(archivePath, memberName), { objectMode: false });
}
