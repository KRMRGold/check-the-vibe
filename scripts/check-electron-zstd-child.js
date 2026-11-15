import assert from "node:assert/strict";
import { Readable } from "node:stream";
import { createZstdCompress, createZstdDecompress } from "node:zlib";

const original = Buffer.from("Check The Vibe native Zstandard runtime probe");
const compressedChunks = [];
for await (const chunk of Readable.from([original]).pipe(createZstdCompress())) {
  compressedChunks.push(Buffer.from(chunk));
}
const compressed = Buffer.concat(compressedChunks);
const decompressedChunks = [];
for await (const chunk of Readable.from(compressed).pipe(createZstdDecompress())) {
  decompressedChunks.push(Buffer.from(chunk));
}
assert.deepEqual(Buffer.concat(decompressedChunks), original);
process.stdout.write(`Electron embedded Node ${process.versions.node}: native Zstandard stream PASS\n`);
