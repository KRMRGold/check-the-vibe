import test from "node:test";
import assert from "node:assert/strict";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { openDatabase } from "../../src/main/db/connection.js";
import { runMigrations } from "../../src/main/db/migrate.js";
import { createLibraryRepository } from "../../src/main/library/repository.js";

async function setup(t) {
  const dir = await mkdtemp(join(tmpdir(), "ctv-library-"));
  const path = join(dir, "ctv.db");
  const db = openDatabase(path);
  await runMigrations(db, { databasePath: path });
  t.after(() => { db.close(); return rm(dir, { recursive: true, force: true }); });
  return createLibraryRepository(db);
}

test("manual songs persist tags and user attributes", async (t) => {
  const library = await setup(t);
  const id = library.saveSong({
    title: "Night Drive", artist: "Example Artist", album: "After Hours",
    bpm: 118, energy: 0.72, tags: ["Synthpop", "Night", "synthpop"]
  });
  const song = library.getSong(id);
  assert.equal(song.title, "Night Drive");
  assert.equal(song.identity_state, "manual");
  assert.equal(song.bpm, 118);
  assert.equal(song.energy, 0.72);
  assert.deepEqual(song.tags, ["synthpop", "night"]);
});

test("editing a song replaces its user tags and attributes without duplicating it", async (t) => {
  const library = await setup(t);
  const id = library.saveSong({ title: "First", artist: "Artist", bpm: 100, energy: 0.2, tags: ["old"] });
  library.saveSong({ id, title: "Updated", artist: "Artist", bpm: 122, energy: null, tags: ["new"] });
  const songs = library.listSongs();
  assert.equal(songs.length, 1);
  assert.equal(songs[0].title, "Updated");
  assert.equal(songs[0].bpm, 122);
  assert.equal(songs[0].energy, null);
  assert.deepEqual(songs[0].tags, ["new"]);
});

test("library search matches title, artist and user tags", async (t) => {
  const library = await setup(t);
  library.saveSong({ title: "Glass Garden", artist: "Mira", tags: ["dream pop"] });
  library.saveSong({ title: "Red Signal", artist: "Static Bloom", tags: ["post punk"] });
  assert.equal(library.listSongs({ query: "Glass" }).length, 1);
  assert.equal(library.listSongs({ query: "Static" }).length, 1);
  assert.equal(library.listSongs({ query: "dream" }).length, 1);
  assert.equal(library.listSongs({ query: "missing" }).length, 0);
});

test("library sorting is deterministic", async (t) => {
  const library = await setup(t);
  library.saveSong({ title: "Zulu", artist: "B" });
  library.saveSong({ title: "Alpha", artist: "A" });
  assert.deepEqual(library.listSongs({ sort: "title" }).map((song) => song.title), ["Alpha", "Zulu"]);
  assert.deepEqual(library.listSongs({ sort: "artist" }).map((song) => song.artist), ["A", "B"]);
});

test("library sorts BPM and energy with unknown values last, and date added newest first", async (t) => {
  const library = await setup(t);
  library.saveSong({ title: "Unknown", artist: "A" });
  library.saveSong({ title: "Fast", artist: "A", bpm: 150, energy: 0.8 });
  library.saveSong({ title: "Slow", artist: "A", bpm: 90, energy: 0.2 });
  assert.deepEqual(library.listSongs({ sort: "bpm" }).map((song) => song.title), ["Slow", "Fast", "Unknown"]);
  assert.deepEqual(library.listSongs({ sort: "energy" }).map((song) => song.title), ["Slow", "Fast", "Unknown"]);
  assert.deepEqual(library.listSongs({ sort: "added" }).map((song) => song.title), ["Slow", "Fast", "Unknown"]);
});
