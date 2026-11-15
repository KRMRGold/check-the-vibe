import { createReadStream } from "node:fs";
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

  const decompressed = createReadStream(archivePath).pipe(createZstdDecompress());
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
