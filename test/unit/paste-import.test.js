import test from "node:test";
import assert from "node:assert/strict";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { openDatabase } from "../../src/main/db/connection.js";
import { runMigrations } from "../../src/main/db/migrate.js";
import { createPasteImportRepository, parsePastedTrackLines } from "../../src/main/library/paste-import.js";

async function setup(t) {
  const directory = await mkdtemp(join(tmpdir(), "ctv-paste-import-"));
  const path = join(directory, "ctv.db");
  const db = openDatabase(path);
  await runMigrations(db, { databasePath: path });
  t.after(() => { db.close(); return rm(directory, { recursive: true, force: true }); });
  return { db, repository: createPasteImportRepository(db) };
}

test("parses artist — title lines while preserving original text and order", () => {
  const items = parsePastedTrackLines("Artist One — First Song\r\nArtist Two - Second Song");
  assert.deepEqual(items.map(({ position, sourceLine, artist, title, parseError }) => ({
    position, sourceLine, artist, title, parseError
  })), [
    { position: 1, sourceLine: "Artist One — First Song", artist: "Artist One", title: "First Song", parseError: null },
    { position: 2, sourceLine: "Artist Two - Second Song", artist: "Artist Two", title: "Second Song", parseError: null }
  ]);
});

test("keeps blank and malformed lines as ordered reviewable import items", () => {
  const items = parsePastedTrackLines("Artist — Title\n\nnot a track");
  assert.equal(items.length, 3);
  assert.equal(items[1].sourceLine, "");
  assert.equal(items[1].parseError, "EMPTY_LINE");
  assert.equal(items[2].parseError, "EXPECTED_ARTIST_SEPARATOR_TITLE");
});

test("rejects paste batches above the line limit", () => {
  assert.throws(() => parsePastedTrackLines(Array(501).fill("A — B").join("\n")), /PASTE_TOO_MANY_LINES/);
});

test("creates a paste job without video IDs and preserves every source line", async (t) => {
  const { db, repository } = await setup(t);
  const job = repository.create("Artist — Title\n\nmalformed");
  assert.equal(job.provider, "paste");
  assert.equal(job.total, 3);
  const stored = db.prepare("SELECT position, video_id, source_line, parse_error, state FROM import_items WHERE job_id = ? ORDER BY position").all(job.id);
  assert.deepEqual(stored, [
    { position: 1, video_id: null, source_line: "Artist — Title", parse_error: null, state: "pending" },
    { position: 2, video_id: null, source_line: "", parse_error: "EMPTY_LINE", state: "unmatched" },
    { position: 3, video_id: null, source_line: "malformed", parse_error: "EXPECTED_ARTIST_SEPARATOR_TITLE", state: "unmatched" }
  ]);
});

test("keeps canonical recordings and releases separate with many-to-many associations", async (t) => {
  const { db } = await setup(t);
  db.prepare("INSERT INTO musicbrainz_recordings VALUES (?, ?, ?, ?, ?, ?)").run("recording-1", "Canonical title", "Canonical artist", "[]", "snapshot-1", "now");
  db.prepare("INSERT INTO musicbrainz_releases VALUES (?, ?, ?, ?, ?)").run("release-1", "Edition one", "group-1", "snapshot-1", "now");
  db.prepare("INSERT INTO musicbrainz_releases VALUES (?, ?, ?, ?, ?)").run("release-2", "Edition two", "group-1", "snapshot-1", "now");
  const link = db.prepare("INSERT INTO musicbrainz_recording_releases VALUES (?, ?)");
  link.run("recording-1", "release-1");
  link.run("recording-1", "release-2");
  assert.equal(db.prepare("SELECT COUNT(*) AS count FROM musicbrainz_recording_releases WHERE recording_mbid = ?").get("recording-1").count, 2);
});