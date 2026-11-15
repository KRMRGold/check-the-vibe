import { matchCanonicalArchive } from "../musicbrainz/canonical-matcher.js";

const MATCH_STATES = new Set([
  "exact_single",
  "multiple_exact",
  "fuzzy_candidates",
  "title_only_candidate",
  "multiple_title_only_candidates",
  "candidate_limit_exceeded",
  "no_match"
]);

export function createPasteImportMatchingRepository(db, {
  matchArchive = matchCanonicalArchive
} = {}) {
  const processing = new Set();

  const loadJob = db.prepare(
    "SELECT id, provider, status FROM import_jobs WHERE id = ?"
  );
  const loadItems = db.prepare(
    "SELECT id, position, parsed_artist, parsed_title, parse_error, state " +
    "FROM import_items WHERE job_id = ? ORDER BY position"
  );
  const saveRecording = db.prepare(`
    INSERT INTO musicbrainz_recordings (
      recording_mbid, recording_name, artist_credit_name,
      artist_mbids_json, snapshot_id, imported_at
    ) VALUES (?, ?, ?, ?, ?, ?)
    ON CONFLICT(recording_mbid) DO UPDATE SET
      recording_name = excluded.recording_name,
      artist_credit_name = excluded.artist_credit_name,
      artist_mbids_json = excluded.artist_mbids_json,
      snapshot_id = excluded.snapshot_id,
      imported_at = excluded.imported_at
  `);
  const saveRelease = db.prepare(`
    INSERT INTO musicbrainz_releases (
      release_mbid, release_name, release_group_mbid, snapshot_id, imported_at
    ) VALUES (?, ?, ?, ?, ?)
    ON CONFLICT(release_mbid) DO UPDATE SET
      release_name = excluded.release_name,
      release_group_mbid = excluded.release_group_mbid,
      snapshot_id = excluded.snapshot_id,
      imported_at = excluded.imported_at
  `);
  const linkRelease = db.prepare(
    "INSERT OR IGNORE INTO musicbrainz_recording_releases (recording_mbid, release_mbid) VALUES (?, ?)"
  );
  const saveItem = db.prepare(`
    UPDATE import_items
    SET state = ?, candidates_json = ?, matched_recording_mbid = ?
    WHERE id = ? AND job_id = ?
  `);
  const finishJob = db.prepare(`
    UPDATE import_jobs
    SET status = 'done', snapshot_id = ?, matched = ?, needs_review = ?,
        unavailable = ?, error = NULL
    WHERE id = ?
  `);
  const markFailed = db.prepare(
    "UPDATE import_jobs SET status = 'failed', error = ? WHERE id = ?"
  );

  const persist = db.transaction(({ jobId, snapshotId, items, results }) => {
    const now = new Date().toISOString();
    let matched = 0;
    let needsReview = 0;
    let unavailable = 0;

    for (let index = 0; index < results.length; index += 1) {
      const item = items[index];
      const result = results[index];
      if (!MATCH_STATES.has(result.matchStatus) || !Array.isArray(result.candidates)) {
        throw new Error("CANONICAL_MATCH_RESULT_INVALID");
      }

      let state = "unmatched";
      let matchedRecordingMbid = null;
      if (result.matchStatus === "exact_single" && result.candidates.length === 1) {
        state = "matched";
        matchedRecordingMbid = result.candidates[0].recordingMbid;
        matched += 1;
      } else if (result.matchStatus !== "no_match") {
        state = "needs_review";
        needsReview += 1;
      } else {
        unavailable += 1;
      }

      for (const candidate of result.candidates) {
        if (!candidate.recordingMbid || !candidate.recordingName || !candidate.artistCreditName) {
          throw new Error("CANONICAL_CANDIDATE_INVALID");
        }
        saveRecording.run(
          candidate.recordingMbid,
          candidate.recordingName,
          candidate.artistCreditName,
          null,
          snapshotId,
          now
        );

        for (const release of candidate.releases ?? []) {
          if (!release.releaseMbid) continue;
          saveRelease.run(
            release.releaseMbid,
            release.releaseName ?? "",
            release.releaseGroupMbid ?? null,
            snapshotId,
            now
          );
          linkRelease.run(candidate.recordingMbid, release.releaseMbid);
        }
      }

      saveItem.run(
        state,
        JSON.stringify({
          snapshotId,
          matchStatus: result.matchStatus,
          exactMatchCount: result.exactMatchCount,
          titleOnlyCandidateCount: result.titleOnlyCandidateCount,
          candidateLimitType: result.candidateLimitType ?? null,
          candidates: result.candidates
        }),
        matchedRecordingMbid,
        item.id,
        jobId
      );
    }

    const alreadyUnmatched = items.length === 0
      ? 0
      : db.prepare("SELECT COUNT(*) AS count FROM import_items WHERE job_id = ? AND state = 'unmatched'").get(jobId).count - unavailable;
    finishJob.run(snapshotId, matched, needsReview, unavailable + Math.max(0, alreadyUnmatched), jobId);
    return { matched, needsReview, unavailable: unavailable + Math.max(0, alreadyUnmatched) };
  });

  function getJob(jobId) {
    const job = db.prepare("SELECT * FROM import_jobs WHERE id = ?").get(jobId);
    if (!job) return null;
    return {
      ...job,
      items: db.prepare(
        "SELECT id, position, source_line, parse_error, state, parsed_artist, parsed_title, " +
        "candidates_json, matched_recording_mbid, chosen_song_id " +
        "FROM import_items WHERE job_id = ? ORDER BY position"
      ).all(jobId).map((item) => ({
        ...item,
        candidates: item.candidates_json ? JSON.parse(item.candidates_json) : null
      }))
    };
  }

  return {
    get: getJob,
    async process(jobId, { archivePath } = {}) {
      if (typeof jobId !== "string" || !jobId) throw new TypeError("An import job ID is required.");
      if (typeof archivePath !== "string" || !archivePath) throw new TypeError("A canonical archive path is required.");
      if (processing.has(jobId)) throw new Error("PASTE_IMPORT_ALREADY_PROCESSING");

      const job = loadJob.get(jobId);
      if (!job || job.provider !== "paste") throw new Error("PASTE_IMPORT_NOT_FOUND");
      if (job.status === "done") throw new Error("PASTE_IMPORT_ALREADY_DONE");
      if (job.status === "cancelled") throw new Error("PASTE_IMPORT_CANCELLED");

      processing.add(jobId);
      try {
        const items = loadItems.all(jobId);
        const pending = items.filter((item) => item.parse_error === null && item.parsed_artist && item.parsed_title);
        if (!pending.length) {
          db.prepare(
            "UPDATE import_jobs SET status = 'done', matched = 0, needs_review = 0, " +
            "unavailable = ?, error = NULL WHERE id = ?"
          ).run(items.length, jobId);
          return getJob(jobId);
        }

        db.prepare("UPDATE import_jobs SET status = 'running', error = NULL WHERE id = ?").run(jobId);
        const matched = await matchArchive({
          archivePath,
          tracks: pending.map((item) => ({ artist: item.parsed_artist, title: item.parsed_title }))
        });
        if (!matched || !Array.isArray(matched.results) || matched.results.length !== pending.length ||
            typeof matched.snapshotId !== "string" || !matched.snapshotId) {
          throw new Error("CANONICAL_MATCH_RESULT_COUNT_MISMATCH");
        }

        const summary = persist({
          jobId,
          snapshotId: matched.snapshotId,
          items: pending,
          results: matched.results
        });
        return { ...getJob(jobId), summary };
      } catch (error) {
        markFailed.run(error.message || "PASTE_IMPORT_MATCH_FAILED", jobId);
        throw error;
      } finally {
        processing.delete(jobId);
      }
    }
  };
}
