import { randomUUID } from "node:crypto";

function toSong(row) {
  if (!row) return null;
  return {
    ...row,
    tags: row.tags ? row.tags.split(String.fromCharCode(31)) : [],
    bpm: row.bpm ?? null,
    energy: row.energy ?? null
  };
}

export function createDeckRepository(db) {
  const insertDeck = db.prepare(`
    INSERT INTO decks (id, name, description, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?)
  `);
  const findDeck = db.prepare("SELECT id, name, description, created_at, updated_at FROM decks WHERE id = ?");
  const updateDeck = db.prepare(`
    UPDATE decks SET name = ?, description = ?, updated_at = ? WHERE id = ?
  `);
  const deleteDeck = db.prepare("DELETE FROM decks WHERE id = ?");
  const insertEntry = db.prepare(`
    INSERT INTO deck_entries (id, deck_id, song_id, position, added_at)
    VALUES (?, ?, ?, ?, ?)
  `);
  const findSong = db.prepare("SELECT id FROM songs WHERE id = ?");
  const findEntry = db.prepare("SELECT id, deck_id, song_id, position, notes, added_at FROM deck_entries WHERE id = ?");
  const deleteEntry = db.prepare("DELETE FROM deck_entries WHERE id = ? AND deck_id = ?");
  const compactPositions = db.transaction((deckId) => {
    listEntryIds.all(deckId).forEach((row, position) => updatePosition.run(position, row.id, deckId));
  });
  const removeEntry = db.transaction(({ deckId, entryId }) => {
    if (!findDeck.get(deckId)) throw new Error("DECK_NOT_FOUND");
    const deleted = deleteEntry.run(entryId, deckId).changes > 0;
    if (deleted) compactPositions(deckId);
    return deleted;
  });
  const listEntryRows = db.prepare(`
    SELECT de.id AS entry_id, de.deck_id, de.song_id, de.position,
           de.notes, de.added_at
    FROM deck_entries de
    WHERE de.deck_id = ?
    ORDER BY de.position ASC, de.added_at ASC, de.id ASC
  `);
  const listDeckRows = db.prepare(`
    SELECT d.id, d.name, d.description, d.created_at, d.updated_at,
           COUNT(de.id) AS entry_count
    FROM decks d
    LEFT JOIN deck_entries de ON de.deck_id = d.id
    GROUP BY d.id
    ORDER BY d.updated_at DESC, d.name COLLATE NOCASE ASC, d.id ASC
  `);
  const nextPosition = db.prepare("SELECT COALESCE(MAX(position), -1) + 1 AS position FROM deck_entries WHERE deck_id = ?");
  const updatePosition = db.prepare("UPDATE deck_entries SET position = ? WHERE id = ? AND deck_id = ?");
  const listEntryIds = db.prepare("SELECT id FROM deck_entries WHERE deck_id = ? ORDER BY position, added_at, id");

  const addEntry = db.transaction((deckId, songId) => {
    if (!findDeck.get(deckId)) throw new Error("DECK_NOT_FOUND");
    if (!findSong.get(songId)) throw new Error("SONG_NOT_FOUND");
    const id = randomUUID();
    const addedAt = new Date().toISOString();
    const position = nextPosition.get(deckId).position;
    insertEntry.run(id, deckId, songId, position, addedAt);
    return id;
  });

  const reorderEntries = db.transaction((deckId, entryIds) => {
    if (!findDeck.get(deckId)) throw new Error("DECK_NOT_FOUND");
    const currentIds = listEntryIds.all(deckId).map((row) => row.id);
    if (entryIds.length !== currentIds.length ||
        new Set(entryIds).size !== entryIds.length ||
        entryIds.some((id) => !currentIds.includes(id))) {
      throw new Error("DECK_ORDER_MISMATCH");
    }
    entryIds.forEach((id, position) => updatePosition.run(position, id, deckId));
  });

  return {
    listDecks() {
      return listDeckRows.all();
    },
    getDeck(id) {
      const deck = findDeck.get(id);
      if (!deck) return null;
      return { ...deck, entry_count: db.prepare("SELECT COUNT(*) AS count FROM deck_entries WHERE deck_id = ?").get(id).count };
    },
    createDeck({ name, description = null }) {
      const id = randomUUID();
      const now = new Date().toISOString();
      insertDeck.run(id, name.trim(), description?.trim() || null, now, now);
      return this.getDeck(id);
    },
    updateDeck({ id, name, description = null }) {
      if (!findDeck.get(id)) throw new Error("DECK_NOT_FOUND");
      updateDeck.run(name.trim(), description?.trim() || null, new Date().toISOString(), id);
      return this.getDeck(id);
    },
    deleteDeck(id) {
      return deleteDeck.run(id).changes > 0;
    },
    listEntries(deckId) {
      if (!findDeck.get(deckId)) throw new Error("DECK_NOT_FOUND");
      const getSong = db.prepare(`
        SELECT s.id, s.title, s.artist, s.album, s.release_year, s.duration_ms,
               s.identity_state, s.created_at, s.updated_at,
               COALESCE((SELECT group_concat(value, char(31)) FROM (
                 SELECT value FROM song_tags WHERE song_id = s.id AND source = 'user' ORDER BY rowid
               )), '') AS tags,
               (SELECT value_num FROM attribute_values WHERE song_id = s.id AND attribute = 'bpm' AND source = 'user') AS bpm,
               (SELECT value_num FROM attribute_values WHERE song_id = s.id AND attribute = 'energy' AND source = 'user') AS energy
        FROM songs s WHERE s.id = ?
      `);
      return listEntryRows.all(deckId).map((entry) => ({ ...entry, song: toSong(getSong.get(entry.song_id)) }));
    },
    addEntry: addEntry,
    removeEntry: removeEntry,
    reorderEntries({ deckId, entryIds }) {
      reorderEntries(deckId, entryIds);
      return this.listEntries(deckId);
    },
    getEntry(id) {
      return findEntry.get(id) ?? null;
    }
  };
}
