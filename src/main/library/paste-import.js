import { randomUUID } from "node:crypto";

const MAX_LINES = 500;
const MAX_LINE_LENGTH = 1000;
const SEPARATOR = /\s+[—–-]\s+/u;

export function parsePastedTrackLines(text) {
  if (typeof text !== "string") throw new TypeError("Paste input must be text.");
  const lines = text.split(/\r\n|\n|\r/u);
  if (lines.length > MAX_LINES) throw new Error("PASTE_TOO_MANY_LINES");

  return lines.map((sourceLine, index) => {
    const position = index + 1;
    if (sourceLine.length > MAX_LINE_LENGTH) {
      return { position, sourceLine, artist: null, title: null, parseError: "LINE_TOO_LONG" };
    }
    if (!sourceLine.trim()) {
      return { position, sourceLine, artist: null, title: null, parseError: "EMPTY_LINE" };
    }
    const match = sourceLine.match(SEPARATOR);
    if (!match) {
      return { position, sourceLine, artist: null, title: null, parseError: "EXPECTED_ARTIST_SEPARATOR_TITLE" };
    }
    const splitAt = match.index;
    const artist = sourceLine.slice(0, splitAt).trim();
    const title = sourceLine.slice(splitAt + match[0].length).trim();
    if (!artist || !title) {
      return { position, sourceLine, artist: null, title: null, parseError: "EXPECTED_ARTIST_SEPARATOR_TITLE" };
    }
    return { position, sourceLine, artist, title, parseError: null };
  });
}

export function createPasteImportRepository(db) {
  const insertJob = db.prepare(\`
    INSERT INTO import_jobs (
      id, provider, source_ref, status, total, matched, needs_review,
      unavailable, created_at
    ) VALUES (?, 'paste', ?, 'done', ?, 0, 0, 0, ?)
  \`);
  const insertItem = db.prepare(\`
    INSERT INTO import_items (
      id, job_id, position, video_id, source_line, parse_error, state,
      parsed_artist, parsed_title, candidates_json
    ) VALUES (?, ?, ?, NULL, ?, ?, ?, ?, ?, '[]')
  \`);

  const create = db.transaction((text) => {
    const items = parsePastedTrackLines(text);
    const jobId = randomUUID();
    const now = new Date().toISOString();
    insertJob.run(jobId, \`paste:\${jobId}\`, items.length, now);
    for (const item of items) {
      const invalid = item.parseError !== null;
      insertItem.run(
        randomUUID(), jobId, item.position, item.sourceLine, item.parseError,
        invalid ? "unmatched" : "pending", item.artist, item.title
      );
    }
    return {
      id: jobId,
      provider: "paste",
      status: "done",
      total: items.length,
      items
    };
  });

  return { create };
}