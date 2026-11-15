import assert from "node:assert/strict";
import { Readable } from "node:stream";
import { createZstdCompressSync, createZstdDecompress } from "node:zlib";

const original = Buffer.from("Check The Vibe native Zstandard runtime probe");
const compressed = createZstdCompressSync(original);
const chunks = [];
for await (const chunk of Readable.from(compressed).pipe(createZstdDecompress())) {
  chunks.push(chunk);
}
assert.deepEqual(Buffer.concat(chunks), original);
process.stdout.write(`Electron embedded Node ${process.versions.node}: native Zstandard stream PASS\\n`);
