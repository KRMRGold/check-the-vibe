import test from "node:test";
import assert from "node:assert/strict";
import { Readable } from "node:stream";
import {
  buildHeaders, compareSample, normalizeText, parseCsv, parseCsvStream, parseFmaTracks
} from "../../scripts/compare-fma.js";

test("CSV parser handles quoted commas, escaped quotes, and embedded newlines", () => {
  assert.deepEqual(parseCsv('a,b\n1,"two, too"\n2,"say ""hi"""'), [
    ["a", "b"], ["1", "two, too"], ["2", 'say "hi"']
  ]);
  assert.deepEqual(parseCsv('a,b\n1,"two\nlines"'), [["a", "b"], ["1", "two\nlines"]]);
});

test("streaming CSV parser handles quoted fields split across chunks", async () => {
  const chunks = [
    'a,b\n1,"two,',
    ' too"\n2,"say ""',
    'hi"""\n3,"two\n',
    'lines"'
  ];
  const rows = [];
  for await (const row of parseCsvStream(Readable.from(chunks))) rows.push(row);
  assert.deepEqual(rows, [
    ["a", "b"], ["1", "two, too"], ["2", 'say "hi"'], ["3", "two\nlines"]
  ]);
});

test("FMA two-row headers are combined into field names", () => {
  assert.deepEqual(buildHeaders([
    ["track", "artist", "artist"], ["id", "id", "name"], ["1", "2", "Example Artist"]
  ]), { headers: ["track_id", "artist_id", "artist_name"], dataStart: 2 });
});

test("normalization ignores case, accents, punctuation, and ampersand spelling", () => {
  assert.equal(normalizeText("Beyoncé & Example!"), "beyonce and example");
});

test("FMA rows expose genres and tags", () => {
  const csv = [
    "track,artist,artist,track,track,track",
    "id,id,name,title,genres,tags",
    '10,2,"Example Artist","A Song","[{""genre_id"":3,""genre_title"":""Rock""}]","[""indie"",""live""]"'
  ].join("\n");
  const tracks = parseFmaTracks(csv);
  assert.equal(tracks.length, 1);
  assert.equal(tracks[0].fmaTrackId, "10");
  assert.deepEqual(tracks[0].genres, ["Rock"]);
  assert.deepEqual(tracks[0].tags, ["indie", "live"]);
});

test("title-only candidates are not accepted as exact matches", () => {
  const result = compareSample(
    [{ id: 1, artist: "Artist A", title: "Song" }],
    [{ fmaTrackId: "2", artist: "Different Artist", title: "Song", genres: [], tags: [], sourceFields: {} }]
  );
  assert.equal(result[0].matchStatus, "title_only_candidate");
});
