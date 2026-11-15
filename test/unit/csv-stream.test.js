import test from "node:test";
import assert from "node:assert/strict";
import { Readable } from "node:stream";
import { parseCsvStream } from "../../src/main/musicbrainz/csv-stream.js";

test("preserves multilingual text when UTF-8 characters cross chunk boundaries", async () => {
  const bytes = Buffer.from('artist,title\n"Björk","乡愁四韵"\n"日本語","Café"\n', "utf8");
  const chunks = [];
  for (let index = 0; index < bytes.length; index += 1) chunks.push(bytes.subarray(index, index + 1));
  const rows = [];
  for await (const row of parseCsvStream(Readable.from(chunks))) rows.push(row);
  assert.deepEqual(rows, [
    ["artist", "title"],
    ["Björk", "乡愁四韵"],
    ["日本語", "Café"]
  ]);
});

test("handles quoted commas, escaped quotes, and quoted newlines across chunks", async () => {
  const input = 'artist,title\n"Artist, Inc.","A ""quoted""\ntitle"\n';
  const rows = [];
  for await (const row of parseCsvStream(Readable.from([...Buffer.from(input)].map((byte) => Buffer.from([byte]))))) rows.push(row);
  assert.deepEqual(rows, [["artist", "title"], ["Artist, Inc.", 'A "quoted"\ntitle']]);
});