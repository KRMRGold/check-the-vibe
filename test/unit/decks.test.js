import test from "node:test";
import assert from "node:assert/strict";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { openDatabase } from "../../src/main/db/connection.js";
import { runMigrations } from "../../src/main/db/migrate.js";
import { createLibraryRepository } from "../../src/main/library/repository.js";
import { createDeckRepository } from "../../src/main/library/deck-repository.js";

async function setup(t) {
  const dir = await mkdtemp(join(tmpdir(), "ctv-decks-"));
  const path = join(dir, "ctv.db");
  let db = openDatabase(path);
  await runMigrations(db, { databasePath: path });
  t.after(() => {
    if (db?.open) db.close();
    return rm(dir, { recursive: true, force: true });
  });
  return {
    path,
    get db() { return db; },
    reopen() {
      db.close();
      db = openDatabase(path);
      return createDeckRepository(db);
    },
    library: createLibraryRepository(db),
    decks: createDeckRepository(db)
  };
}

function song(library, title = "Glass Garden") {
  return library.saveSong({ title, artist: "Mira", tags: ["dream pop"] });
}

test("decks can be created, renamed, listed, and deleted", async (t) => {
  const ctx = await setup(t);
  const created = ctx.decks.createDeck({ name: "Late Night", description: "After dark" });
  assert.equal(created.name, "Late Night");
  assert.equal(created.description, "After dark");
  assert.equal(created.entry_count, 0);
  const updated = ctx.decks.updateDeck({ id: created.id, name: "Night Drive", description: null });
  assert.equal(updated.name, "Night Drive");
  assert.equal(updated.description, null);
  assert.equal(ctx.decks.listDecks()[0].name, "Night Drive");
  assert.equal(ctx.decks.deleteDeck(created.id), true);
  assert.equal(ctx.decks.deleteDeck(created.id), false);
  assert.deepEqual(ctx.decks.listDecks(), []);
});

test("one song can appear multiple times in one deck and in multiple decks", async (t) => {
  const ctx = await setup(t);
  const songId = song(ctx.library);
  const first = ctx.decks.createDeck({ name: "First" });
  const second = ctx.decks.createDeck({ name: "Second" });

  const firstOccurrence = ctx.decks.addEntry(first.id, songId);
  const secondOccurrence = ctx.decks.addEntry(first.id, songId);
  const otherDeckOccurrence = ctx.decks.addEntry(second.id, songId);

  assert.notEqual(firstOccurrence, secondOccurrence);
  assert.notEqual(firstOccurrence, otherDeckOccurrence);
  assert.deepEqual(ctx.decks.listEntries(first.id).map((entry) => entry.song_id), [songId, songId]);
  assert.deepEqual(ctx.decks.listEntries(second.id).map((entry) => entry.song_id), [songId]);
  assert.equal(ctx.decks.listDecks().find((deck) => deck.id === first.id).entry_count, 2);
});

test("removing one occurrence leaves other occurrences and the library song intact", async (t) => {
  const ctx = await setup(t);
  const songId = song(ctx.library);
  const deck = ctx.decks.createDeck({ name: "Repeat Test" });
  const first = ctx.decks.addEntry(deck.id, songId);
  const second = ctx.decks.addEntry(deck.id, songId);

  assert.equal(ctx.decks.removeEntry({ deckId: deck.id, entryId: first }), true);
  assert.deepEqual(ctx.decks.listEntries(deck.id).map((entry) => entry.id), [second]);
  assert.equal(ctx.library.getSong(songId).title, "Glass Garden");
  assert.equal(ctx.decks.getEntry(first), null);
});

test("reordering renumbers entries and survives a database restart", async (t) => {
  const ctx = await setup(t);
  const deck = ctx.decks.createDeck({ name: "Order" });
  const ids = [
    song(ctx.library, "One"),
    song(ctx.library, "Two"),
    song(ctx.library, "Three")
  ].map((songId) => ctx.decks.addEntry(deck.id, songId));

  const ordered = ctx.decks.reorderEntries({ deckId: deck.id, entryIds: [ids[2], ids[0], ids[1]] });
  assert.deepEqual(ordered.map((entry) => entry.id), [ids[2], ids[0], ids[1]]);
  assert.deepEqual(ordered.map((entry) => entry.position), [0, 1, 2]);

  const reopened = ctx.reopen();
  const afterRestart = reopened.listEntries(deck.id);
  assert.deepEqual(afterRestart.map((entry) => entry.id), [ids[2], ids[0], ids[1]]);
  assert.deepEqual(afterRestart.map((entry) => entry.position), [0, 1, 2]);
});

test("reordering rejects incomplete, duplicate, or foreign entry lists without changing order", async (t) => {
  const ctx = await setup(t);
  const deck = ctx.decks.createDeck({ name: "Order Guard" });
  const songA = song(ctx.library, "A");
  const songB = song(ctx.library, "B");
  const a = ctx.decks.addEntry(deck.id, songA);
  const b = ctx.decks.addEntry(deck.id, songB);

  assert.throws(() => ctx.decks.reorderEntries({ deckId: deck.id, entryIds: [a] }), /DECK_ORDER_MISMATCH/);
  assert.throws(() => ctx.decks.reorderEntries({ deckId: deck.id, entryIds: [a, a] }), /DECK_ORDER_MISMATCH/);
  assert.deepEqual(ctx.decks.listEntries(deck.id).map((entry) => entry.id), [a, b]);
});

test("deleting a deck removes its entries but preserves songs and other decks", async (t) => {
  const ctx = await setup(t);
  const songId = song(ctx.library);
  const first = ctx.decks.createDeck({ name: "Delete Me" });
  const second = ctx.decks.createDeck({ name: "Keep Me" });
  ctx.decks.addEntry(first.id, songId);
  const remainingEntry = ctx.decks.addEntry(second.id, songId);

  assert.equal(ctx.decks.deleteDeck(first.id), true);
  assert.deepEqual(ctx.decks.listEntries(second.id).map((entry) => entry.id), [remainingEntry]);
  assert.equal(ctx.library.getSong(songId).title, "Glass Garden");
});
