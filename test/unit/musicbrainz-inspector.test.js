import test from "node:test";
import assert from "node:assert/strict";
import {
  getRecordingArtistCredit, normalizeText, parseChecksumManifest
} from "../../scripts/inspect-musicbrainz.js";

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
