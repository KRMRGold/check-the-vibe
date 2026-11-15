DROP INDEX IF EXISTS import_items_job_pos;

ALTER TABLE import_items RENAME TO import_items_previous;

CREATE TABLE import_items (
  id TEXT PRIMARY KEY,
  job_id TEXT NOT NULL REFERENCES import_jobs(id) ON DELETE CASCADE,
  position INTEGER NOT NULL,
  video_id TEXT,
  source_line TEXT,
  parse_error TEXT,
  state TEXT NOT NULL CHECK (state IN ('pending','matched','needs_review','unmatched','unavailable','resolved')),
  parsed_artist TEXT,
  parsed_title TEXT,
  candidates_json TEXT,
  chosen_song_id TEXT REFERENCES songs(id)
);

INSERT INTO import_items (
  id, job_id, position, video_id, state, parsed_artist, parsed_title,
  candidates_json, chosen_song_id
)
SELECT
  id, job_id, position, video_id, state, parsed_artist, parsed_title,
  candidates_json, chosen_song_id
FROM import_items_previous;

DROP TABLE import_items_previous;

CREATE INDEX import_items_job_pos ON import_items(job_id, position);

CREATE TABLE musicbrainz_recordings (
  recording_mbid TEXT PRIMARY KEY,
  recording_name TEXT NOT NULL,
  artist_credit_name TEXT NOT NULL,
  artist_mbids_json TEXT,
  snapshot_id TEXT NOT NULL,
  imported_at TEXT NOT NULL
);

CREATE TABLE musicbrainz_releases (
  release_mbid TEXT PRIMARY KEY,
  release_name TEXT NOT NULL,
  release_group_mbid TEXT,
  snapshot_id TEXT NOT NULL,
  imported_at TEXT NOT NULL
);

CREATE TABLE musicbrainz_recording_releases (
  recording_mbid TEXT NOT NULL REFERENCES musicbrainz_recordings(recording_mbid) ON DELETE CASCADE,
  release_mbid TEXT NOT NULL REFERENCES musicbrainz_releases(release_mbid) ON DELETE CASCADE,
  PRIMARY KEY (recording_mbid, release_mbid)
);

CREATE INDEX musicbrainz_recording_releases_release
  ON musicbrainz_recording_releases(release_mbid);