import { randomUUID } from "node:crypto";

const SEARCH_SQL = `
  SELECT s.id, s.title, s.artist, s.album, s.release_year, s.duration_ms,
         s.identity_state, s.created_at, s.updated_at,
         COALESCE((SELECT group_concat(value, char(31)) FROM (
                     SELECT value FROM song_tags
                     WHERE song_id = s.id AND source = 'user'
                     ORDER BY rowid
                   )), '') AS tags,
         (SELECT value_num FROM attribute_values
          WHERE song_id = s.id AND attribute = 'bpm' AND source = 'user') AS bpm,
         (SELECT value_num FROM attribute_values
          WHERE song_id = s.id AND attribute = 'energy' AND source = 'user') AS energy
  FROM songs s
`;

function toSong(row) {
  return {
    ...row,
    tags: row.tags ? row.tags.split(String.fromCharCode(31)) : [],
    bpm: row.bpm ?? null,
    energy: row.energy ?? null
  };
}

export function createLibraryRepository(db) {
  const upsertSong = db.prepare(`
    INSERT INTO songs (id, title, artist, album, release_year, duration_ms,
                       identity_state, created_at, updated_at)
    VALUES (@id, @title, @artist, @album, @release_year, @duration_ms,
            'manual', @created_at, @updated_at)
    ON CONFLICT(id) DO UPDATE SET
      title=excluded.title, artist=excluded.artist, album=excluded.album,
      release_year=excluded.release_year, duration_ms=excluded.duration_ms,
      updated_at=excluded.updated_at
  `);
  const findRowid = db.prepare("SELECT rowid FROM songs WHERE id = ?");
  const deleteFts = db.prepare("DELETE FROM songs_fts WHERE rowid = ?");
  const insertFts = db.prepare("INSERT INTO songs_fts(rowid, title, artist, album, tags) VALUES (?, ?, ?, ?, ?)");
  const deleteUserTags = db.prepare("DELETE FROM song_tags WHERE song_id = ? AND source = 'user'");
  const insertTag = db.prepare("INSERT OR IGNORE INTO song_tags(song_id, kind, value, source) VALUES (?, 'tag', ?, 'user')");
  const deleteUserAttributes = db.prepare("DELETE FROM attribute_values WHERE song_id = ? AND source = 'user' AND attribute IN ('bpm','energy')");
  const insertAttribute = db.prepare(`
    INSERT INTO attribute_values(id, song_id, attribute, value_num, value_text, source, confidence, fetched_at)
    VALUES (?, ?, ?, ?, NULL, 'user', 1, ?)
  `);

  const save = db.transaction((input) => {
    const now = new Date().toISOString();
    const id = input.id ?? randomUUID();
    const existing = db.prepare("SELECT id FROM songs WHERE id = ?").get(id);
    if (input.id && !existing) throw new Error("SONG_NOT_FOUND");
    upsertSong.run({
      id, title: input.title.trim(), artist: input.artist.trim(),
      album: input.album?.trim() || null, release_year: input.releaseYear ?? null,
      duration_ms: input.durationMs ?? null,
      created_at: existing ? db.prepare("SELECT created_at FROM songs WHERE id = ?").get(id).created_at : now,
      updated_at: now
    });
    deleteUserTags.run(id);
    const tags = [...new Set((input.tags ?? []).map((tag) => tag.trim().toLocaleLowerCase()).filter(Boolean))];
    for (const tag of tags) insertTag.run(id, tag);
    deleteUserAttributes.run(id);
    if (input.bpm !== null && input.bpm !== undefined) insertAttribute.run(randomUUID(), id, "bpm", input.bpm, now);
    if (input.energy !== null && input.energy !== undefined) insertAttribute.run(randomUUID(), id, "energy", input.energy, now);

    const rowid = findRowid.get(id).rowid;
    deleteFts.run(rowid);
    insertFts.run(rowid, input.title.trim(), input.artist.trim(), input.album?.trim() ?? "", tags.join(" "));
    return id;
  });

  return {
    listSongs({ query = "", sort = "recent" } = {}) {
      const sortSql = {
        recent: "s.updated_at DESC, s.title COLLATE NOCASE ASC",
        title: "s.title COLLATE NOCASE ASC, s.artist COLLATE NOCASE ASC",
        artist: "s.artist COLLATE NOCASE ASC, s.title COLLATE NOCASE ASC",
        added: "s.created_at DESC, s.title COLLATE NOCASE ASC",
        bpm: "bpm IS NULL ASC, bpm ASC, s.title COLLATE NOCASE ASC",
        energy: "energy IS NULL ASC, energy ASC, s.title COLLATE NOCASE ASC"
      }[sort] ?? "s.updated_at DESC";
      let rows;
      const clean = query.trim().replaceAll('"', '""').split(/\s+/).filter(Boolean);
      if (clean.length) {
        const match = clean.map((part) => `"${part}"*`).join(" AND ");
        rows = db.prepare(`${SEARCH_SQL}
          JOIN songs_fts ON songs_fts.rowid = s.rowid
          WHERE songs_fts MATCH ?
          ORDER BY ${sortSql}`).all(match);
      } else {
        rows = db.prepare(`${SEARCH_SQL} ORDER BY ${sortSql}`).all();
      }
      return rows.map(toSong);
    },
    saveSong: save,
    getSong(id) {
      const row = db.prepare(`${SEARCH_SQL} WHERE s.id = ?`).get(id);
      return row ? toSong(row) : null;
    }
  };
}
