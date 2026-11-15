import test from "node:test";
import assert from "node:assert/strict";
import { mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { basename, join } from "node:path";
import { Readable } from "node:stream";
import { createZstdCompress } from "node:zlib";
import { matchCanonicalArchive } from "../../src/main/musicbrainz/canonical-matcher.js";

function tarHeader(name, size) {
  const header = Buffer.alloc(512);
  header.write(name, 0, 100, "utf8");
  header.write("0000644\0", 100, 8, "ascii");
  header.write("0000000\0", 108, 8, "ascii");
  header.write("0000000\0", 116, 8, "ascii");
  header.write(size.toString(8).padStart(11, "0") + "\0", 124, 12, "ascii");
  header.fill(32, 148, 156);
  header[156] = "0".charCodeAt(0);
  header.write("ustar\0", 257, 6, "ascii");
  header.write("00", 263, 2, "ascii");
  let checksum = 0;
  for (const byte of header) checksum += byte;
  header.write(checksum.toString(8).padStart(6, "0") + "\0 ", 148, 8, "ascii");
  return header;
}

function tarMember(name, value) {
  const body = Buffer.from(value);
  const padding = Buffer.alloc((512 - (body.length % 512)) % 512);
  return Buffer.concat([tarHeader(name, body.length), body, padding]);
}

function csv(headers, rows) {
  return [headers, ...rows].map((row) => row.join(",")).join("\n") + "\n";
}

async function makeArchive(directory, filename, members) {
  const tar = Buffer.concat([...members, Buffer.alloc(1024)]);
  const compressed = [];
  for await (const chunk of Readable.from([tar]).pipe(createZstdCompress())) {
    compressed.push(Buffer.from(chunk));
  }
  const path = join(directory, filename);
  await writeFile(path, Buffer.concat(compressed));
  return path;
}

test("matches canonical and redirect CSV members in one ordered archive stream", async (t) => {
  const directory = await mkdtemp(join(tmpdir(), "ctv-canonical-archive-match-"));
  t.after(() => rm(directory, { recursive: true, force: true }));
  const canonicalHeaders = [
    "id", "artist_credit_id", "artist_mbids", "artist_credit_name",
    "release_mbid", "release_name", "recording_mbid", "recording_name",
    "combined_lookup", "score"
  ];
  const recordingHeaders = [
    "recording_mbid", "canonical_recording_mbid", "canonical_release_mbid"
  ];
  const releaseHeaders = ["release_mbid", "canonical_release_mbid", "release_group_mbid"];
  const archivePath = await makeArchive(directory, "musicbrainz-canonical-test.tar.zst", [
    tarMember("snapshot/TIMESTAMP", "2026-11-03 08:00:03"),
    tarMember("snapshot/COPYING", "CC0"),
    tarMember("snapshot/canonical/canonical_musicbrainz_data.csv", csv(canonicalHeaders, [
      ["1", "1", "artist-1", "The Example", "release-alias", "Example Album", "recording-alias", "A Song", "", "1"]
    ])),
    tarMember("snapshot/canonical/canonical_recording_redirect.csv", csv(recordingHeaders, [
      ["recording-alias", "recording-canonical", "release-canonical"]
    ])),
    tarMember("snapshot/canonical/canonical_release_redirect.csv", csv(releaseHeaders, [
      ["release-alias", "release-canonical", "release-group-1"],
      ["release-canonical", "release-canonical", "release-group-1"]
    ]))
  ]);

  const matched = await matchCanonicalArchive({
    archivePath,
    tracks: [{ artist: "The Example", title: "A Song" }]
  });

  assert.equal(matched.snapshotId, basename(archivePath));
  assert.equal(matched.results[0].matchStatus, "exact_single");
  assert.equal(matched.results[0].candidates[0].recordingMbid, "recording-canonical");
  assert.deepEqual(matched.results[0].candidates[0].releases, [{
    releaseMbid: "release-canonical",
    releaseName: "Example Album",
    releaseGroupMbid: "release-group-1"
  }]);
});
