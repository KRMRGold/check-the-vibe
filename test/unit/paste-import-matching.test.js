import test from "node:test";
import assert from "node:assert/strict";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { openDatabase } from "../../src/main/db/connection.js";
import { runMigrations } from "../../src/main/db/migrate.js";
import { createPasteImportRepository } from "../../src/main/library/paste-import.js";
import { createPasteImportMatchingRepository } from "../../src/main/library/paste-import-matching.js";

async function setup(t, matchArchive) {
  const directory = await mkdtemp(join(tmpdir(), "ctv-paste-match-"));
  const path = join(directory, "ctv.db");
  const db = openDatabase(path);
  await runMigrations(db, { databasePath: path });
  t.after(() => { db.close(); return rm(directory, { recursive: true, force: true }); });
  return {
    db,
    imports: createPasteImportRepository(db),
    matching: createPasteImportMatchingRepository(db, { matchArchive })
  };
}

function candidate(overrides = {}) {
  return {
    recordingMbid: "recording-1",
    recordingName: "Canonical Song",
    artistCreditName: "Canonical Artist",
    artistMbidsRaw: "artist-mbid-1",
    releases: [{
      releaseMbid: "release-1",
      releaseName: "Canonical Album",
      releaseGroupMbid: "release-group-1"
    }],
    matchType: "exact",
    artistSimilarity: 1,
    titleSimilarity: 1,
    combinedSimilarity: 1,
    ...overrides
  };
}

test("processes paste rows, persists snapshot candidates, and separates identity confirmation from song creation", async (t) => {
  let received;
  const { db, imports, matching } = await setup(t, async (input) => {
    received = input;
    return {
      snapshotId: "musicbrainz-snapshot-2026-11-03",
      results: [
        { matchStatus: "exact_single", exactMatchCount: 1, titleOnlyCandidateCount: 0, candidates: [candidate()] },
        { matchStatus: "fuzzy_candidates", exactMatchCount: 0, titleOnlyCandidateCount: 0, candidates: [candidate({ recordingMbid: "recording-2", matchType: "fuzzy" })] },
        { matchStatus: "no_match", exactMatchCount: 0, titleOnlyCandidateCount: 0, candidates: [] }
      ]
    };
  });

  const created = imports.create("Artist — Song\nAnother Artist — Maybe\nUnknown — Missing\n");
  const job = await matching.process(created.id, { archivePath: "/snapshot/musicbrainz.tar.zst" });

  assert.equal(received.archivePath, "/snapshot/musicbrainz.tar.zst");
  assert.deepEqual(received.tracks, [
    { artist: "Artist", title: "Song" },
    { artist: "Another Artist", title: "Maybe" },
    { artist: "Unknown", title: "Missing" }
  ]);
  assert.equal(job.status, "done");
  assert.equal(job.snapshot_id, "musicbrainz-snapshot-2026-11-03");
  assert.deepEqual(job.summary, { matched: 1, needsReview: 1, unavailable: 1 });

  const [exact, fuzzy, missing] = job.items;
  assert.equal(exact.state, "matched");
  assert.equal(exact.matched_recording_mbid, "recording-1");
  assert.equal(exact.chosen_song_id, null);
  assert.equal(exact.candidates.snapshotId, "musicbrainz-snapshot-2026-11-03");
  assert.equal(exact.candidates.candidates[0].recordingMbid, "recording-1");
  assert.equal(exact.candidates.candidates[0].artistMbidsRaw, "artist-mbid-1");
  assert.equal(fuzzy.state, "needs_review");
  assert.equal(fuzzy.matched_recording_mbid, null);
  assert.equal(missing.state, "unmatched");

  assert.deepEqual(
    db.prepare("SELECT recording_name, artist_credit_name, artist_mbids_json, snapshot_id FROM musicbrainz_recordings WHERE recording_mbid = 'recording-1'").get(),
    { recording_name: "Canonical Song", artist_credit_name: "Canonical Artist", artist_mbids_json: null, snapshot_id: "musicbrainz-snapshot-2026-11-03" }
  );
  assert.deepEqual(
    db.prepare("SELECT release_name, release_group_mbid FROM musicbrainz_releases WHERE release_mbid = 'release-1'").get(),
    { release_name: "Canonical Album", release_group_mbid: "release-group-1" }
  );
  assert.equal(db.prepare("SELECT COUNT(*) AS count FROM musicbrainz_recording_releases WHERE recording_mbid = 'recording-1'").get().count, 1);
  assert.equal(db.prepare("SELECT COUNT(*) AS count FROM songs").get().count, 0);
});

test("retains malformed source rows as unavailable when the remaining tracks are matched", async (t) => {
  const { imports, matching } = await setup(t, async () => ({
    snapshotId: "snapshot-1",
    results: [{ matchStatus: "no_match", exactMatchCount: 0, titleOnlyCandidateCount: 0, candidates: [] }]
  }));
  const created = imports.create("Artist — Song\nmalformed");
  const job = await matching.process(created.id, { archivePath: "/snapshot.tar.zst" });
  assert.equal(job.status, "done");
  assert.equal(job.unavailable, 2);
  assert.equal(job.items[1].source_line, "malformed");
  assert.equal(job.items[1].parse_error, "EXPECTED_ARTIST_SEPARATOR_TITLE");
});

test("failed matching leaves staged rows untouched and the job retryable", async (t) => {
  let attempts = 0;
  const { db, imports, matching } = await setup(t, async () => {
    attempts += 1;
    if (attempts === 1) throw new Error("SNAPSHOT_READ_FAILED");
    return {
      snapshotId: "snapshot-retry",
      results: [{ matchStatus: "no_match", exactMatchCount: 0, titleOnlyCandidateCount: 0, candidates: [] }]
    };
  });
  const created = imports.create("Artist — Song");
  await assert.rejects(
    matching.process(created.id, { archivePath: "/missing.tar.zst" }),
    /SNAPSHOT_READ_FAILED/
  );
  assert.equal(db.prepare("SELECT status FROM import_jobs WHERE id = ?").get(created.id).status, "failed");
  assert.equal(db.prepare("SELECT state FROM import_items WHERE job_id = ?").get(created.id).state, "pending");
  assert.equal(db.prepare("SELECT COUNT(*) AS count FROM musicbrainz_recordings").get().count, 0);

  const retried = await matching.process(created.id, { archivePath: "/valid.tar.zst" });
  assert.equal(retried.status, "done");
  assert.equal(retried.snapshot_id, "snapshot-retry");
  assert.equal(attempts, 2);
});

test("rejects reprocessing a completed paste job", async (t) => {
  const { imports, matching } = await setup(t, async () => ({
    snapshotId: "snapshot-1",
    results: [{ matchStatus: "no_match", exactMatchCount: 0, titleOnlyCandidateCount: 0, candidates: [] }]
  }));
  const created = imports.create("Artist — Song");
  await matching.process(created.id, { archivePath: "/snapshot.tar.zst" });
  await assert.rejects(
    matching.process(created.id, { archivePath: "/snapshot.tar.zst" }),
    /PASTE_IMPORT_ALREADY_DONE/
  );
});


test("candidate-limit overflow is persisted as needs-review and never auto-confirmed", async (t) => {
  const { db, imports, matching } = await setup(t, async () => ({
    snapshotId: "snapshot-limited",
    results: [{
      matchStatus: "candidate_limit_exceeded",
      exactMatchCount: null,
      titleOnlyCandidateCount: 0,
      candidateLimitType: "exact",
      candidates: [candidate()]
    }]
  }));
  const created = imports.create("Artist — Song");
  const job = await matching.process(created.id, { archivePath: "/snapshot.tar.zst" });
  const [item] = job.items;

  assert.equal(item.state, "needs_review");
  assert.equal(item.matched_recording_mbid, null);
  assert.equal(item.candidates.matchStatus, "candidate_limit_exceeded");
  assert.equal(item.candidates.candidateLimitType, "exact");
  assert.equal(db.prepare("SELECT COUNT(*) AS count FROM songs").get().count, 0);
});


test("cancelling a canonical match marks the job cancelled and preserves staged rows", async (t) => {
  let receivedSignal;
  const { db, imports, matching } = await setup(t, async ({ signal, onProgress }) => {
    receivedSignal = signal;
    onProgress({ phase: "catalog", rowsProcessed: 100000 });
    return new Promise((_resolve, reject) => {
      signal.addEventListener("abort", () => reject(signal.reason), { once: true });
    });
  });
  const created = imports.create("Artist — Song");
  const controller = new AbortController();
  const progress = [];
  const pending = matching.process(created.id, {
    archivePath: "/snapshot.tar.zst",
    signal: controller.signal,
    onProgress: (entry) => progress.push(entry)
  });
  await new Promise((resolve) => setImmediate(resolve));
  controller.abort();
  await assert.rejects(pending, /PASTE_IMPORT_CANCELLED/);

  assert.equal(receivedSignal, controller.signal);
  assert.deepEqual(progress, [{ phase: "catalog", rowsProcessed: 100000 }]);
  assert.equal(db.prepare("SELECT status FROM import_jobs WHERE id = ?").get(created.id).status, "cancelled");
  assert.equal(db.prepare("SELECT state FROM import_items WHERE job_id = ?").get(created.id).state, "pending");
  assert.equal(db.prepare("SELECT COUNT(*) AS count FROM musicbrainz_recordings").get().count, 0);
});
