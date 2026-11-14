import test from "node:test";
import assert from "node:assert/strict";
import {
  assembleJsonlRecords, buildTarArgs, describeMalformedJsonLine, getRecordingArtistCredit, normalizeText, parseChecksumManifest
} from "../../scripts/inspect-musicbrainz.js";

test("JSONL assembler preserves physical newlines inside quoted annotation strings", async () => {
  const physicalLines = [
    '{"id":"one","annotation":"first line',
    '',
    'second line with \\"quoted text\\""}',
    '{"id":"two","title":"Next record"}'
  ];
  async function* source() { yield* physicalLines; }
  const records = [];
  for await (const record of assembleJsonlRecords(source())) records.push(record);

  assert.equal(records.length, 2);
  assert.equal(records[0].lineNumber, 1);
  assert.equal(JSON.parse(records[0].line).annotation, "first line\n\nsecond line with \\"quoted text\\"");
  assert.equal(JSON.parse(records[1].line).title, "Next record");
  assert.equal(records[1].lineNumber, 4);
});

test("malformed JSON diagnostics include a bounded excerpt around the parser error", () => {
  const line = '{"title":"' + "x".repeat(200) + 'BROKEN';
  const result = describeMalformedJsonLine(line, 35622, new SyntaxError("Unterminated string in JSON at position 205"));
  assert.equal(result.line, 35622);
  assert.equal(result.length, line.length);
  assert.equal(result.errorPosition, 205);
  assert.ok(result.excerpt.length <= 240);
  assert.ok(result.excerpt.includes("BROKEN"));
});

test("tar commands force local handling of Windows drive-letter paths", () => {
  const archive = "C:\\Users\\jo\\Desktop\\Active\\checkTheVibe\\data\\cache\\musicbrainz\\recording.tar.xz";
  assert.deepEqual(buildTarArgs("list", archive), ["--force-local", "-tf", archive]);
  assert.deepEqual(buildTarArgs("extract", archive, "recording"), ["--force-local", "-xOf", archive, "recording"]);
});

test("tar extraction requires a member and rejects unknown operations", () => {
  assert.throws(() => buildTarArgs("extract", "recording.tar.xz"), /member name is required/);
  assert.throws(() => buildTarArgs("delete", "recording.tar.xz"), /Unsupported tar operation/);
});

test("artist credit joins credited names and join phrases", () => {
  assert.equal(getRecordingArtistCredit({
    "artist-credit": [
      { name: "Artist One", joinphrase: " & " },
      { name: "Artist Two", artist: { name: "Artist Two" } }
    ]
  }), "Artist One & Artist Two");
});

test("artist credit supports common alternate field shapes", () => {
  assert.equal(getRecordingArtistCredit({ artist_credit: [{ artist: { name: "Example" } }] }), "Example");
  assert.equal(getRecordingArtistCredit({ artistCredit: "Solo Artist" }), "Solo Artist");
  assert.equal(getRecordingArtistCredit({ "artist-credit": [{ name: "Credit Name" }] }), "Credit Name");
  assert.equal(getRecordingArtistCredit({}), "");
});

test("normalization is compatible with the project's strict FMA matcher", () => {
  assert.equal(normalizeText("Beyoncé & Faithless!"), "beyonce and faithless");
});

test("checksum parser selects the archive basename and accepts GNU checksum format", () => {
  const manifest = [
    `${"a".repeat(64)}  other.tar.xz`,
    `${"b".repeat(64)} *recording.tar.xz`
  ].join("\n");
  assert.equal(parseChecksumManifest(manifest, "data/cache/musicbrainz/recording.tar.xz"), "b".repeat(64));
});

test("checksum parser rejects a manifest without the requested archive", () => {
  assert.throws(() => parseChecksumManifest(`${"a".repeat(64)}  another.tar.xz`, "recording.tar.xz"), /No SHA-256 entry/);
});
