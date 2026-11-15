ALTER TABLE import_jobs ADD COLUMN snapshot_id TEXT;
ALTER TABLE import_items ADD COLUMN matched_recording_mbid TEXT
  REFERENCES musicbrainz_recordings(recording_mbid);
