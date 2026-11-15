import test from "node:test";
import assert from "node:assert/strict";
import { copyFile, mkdir, mkdtemp, rm, stat } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import Database from "better-sqlite3";
import { openDatabase } from "../../src/main/db/connection.js";
import { runMigrations } from "../../src/main/db/migrate.js";

const temp = () => mkdtemp(join(tmpdir(), "ctv-m0-"));

test("schema creates required tables and indexes", async () => {
  const dir = await temp();
  const path = join(dir, "ctv.db");
  const db = openDatabase(path);
  try {
    await runMigrations(db, { databasePath: path });
    const tables = db.prepare("SELECT name FROM sqlite_master WHERE type IN ('table','view')").all().map((row) => row.name);
    for (const name of [
      "schema_migrations", "songs", "song_tags", "attribute_values", "song_links",
      "provider_records", "decks", "deck_entries", "import_jobs", "import_items",
      "musicbrainz_recordings", "musicbrainz_releases", "musicbrainz_recording_releases",
      "matches", "match_events", "quota_usage", "settings", "songs_fts"
    ]) assert.ok(tables.includes(name), "Missing table: " + name);

    const indexes = db.prepare("SELECT name FROM sqlite_master WHERE type='index'").all().map((row) => row.name);
    for (const name of [
      "songs_mbid", "songs_isrc", "song_tags_lookup", "song_links_one_primary",
      "deck_entries_pos", "import_items_job_pos", "musicbrainz_recording_releases_release",
      "match_events_match_seq"
    ]) assert.ok(indexes.includes(name), "Missing index: " + name);

    const itemColumns = db.prepare("PRAGMA table_info(import_items)").all();
    assert.equal(itemColumns.find((column) => column.name === "video_id").notnull, 0);
    assert.ok(itemColumns.some((column) => column.name === "source_line"));
    assert.ok(itemColumns.some((column) => column.name === "parse_error"));
  } finally {
    db.close();
    await rm(dir, { recursive: true, force: true });
  }
});

test("foreign keys are enabled and enforced", async () => {
  const dir = await temp();
  const path = join(dir, "ctv.db");
  const db = openDatabase(path);
  try {
    await runMigrations(db, { databasePath: path });
    assert.equal(db.pragma("foreign_keys", { simple: true }), 1);
    assert.throws(() => db.prepare("INSERT INTO deck_entries(id,deck_id,song_id,position,added_at) VALUES ('e','missing','missing',0,'now')").run(), /FOREIGN KEY constraint failed/);
  } finally {
    db.close();
    await rm(dir, { recursive: true, force: true });
  }
});

test("migrations apply once and are idempotent", async () => {
  const dir = await temp();
  const path = join(dir, "ctv.db");
  const db = openDatabase(path);
  try {
    const first = await runMigrations(db, { databasePath: path });
    const second = await runMigrations(db, { databasePath: path });
    assert.deepEqual(first.applied, [1, 2]);
    assert.deepEqual(second.applied, []);
    assert.equal(db.prepare("SELECT COUNT(*) AS count FROM schema_migrations").get().count, 2);
  } finally {
    db.close();
    await rm(dir, { recursive: true, force: true });
  }
});

test("migration preserves existing YouTube import items", async () => {
  const dir = await temp();
  const path = join(dir, "ctv.db");
  const legacyMigrations = join(dir, "legacy-migrations");
  await mkdir(legacyMigrations);
  await copyFile(
    fileURLToPath(new URL("../../src/main/db/migrations/0001_init.sql", import.meta.url)),
    join(legacyMigrations, "0001_init.sql")
  );
  const db = openDatabase(path);
  try {
    await runMigrations(db, { databasePath: path, migrationsPath: legacyMigrations });
    db.prepare("INSERT INTO import_jobs (id, provider, source_ref, status, created_at) VALUES ('job-1', 'youtube', 'playlist-1', 'done', 'now')").run();
    db.prepare("INSERT INTO import_items (id, job_id, position, video_id, state) VALUES ('item-1', 'job-1', 1, 'video-1', 'matched')").run();

    const result = await runMigrations(db, { databasePath: path });
    assert.deepEqual(result.applied, [2]);
    assert.deepEqual(
      db.prepare("SELECT video_id, source_line, state FROM import_items WHERE id = 'item-1'").get(),
      { video_id: "video-1", source_line: null, state: "matched" }
    );
  } finally {
    db.close();
    await rm(dir, { recursive: true, force: true });
  }
});

test("SQLite-aware pre-migration backup can be restored", async () => {
  const dir = await temp();
  const path = join(dir, "ctv.db");
  const backups = join(dir, "backups");
  const db = openDatabase(path);
  try {
    db.exec("CREATE TABLE preexisting_marker(value TEXT NOT NULL); INSERT INTO preexisting_marker VALUES ('before-migration');");
    const result = await runMigrations(db, { databasePath: path, backupDirectory: backups });
    assert.ok(result.backupPath);
    await stat(result.backupPath);
    const backup = new Database(result.backupPath);
    try {
      assert.equal(backup.prepare("SELECT value FROM preexisting_marker").get().value, "before-migration");
      assert.equal(backup.prepare("SELECT name FROM sqlite_master WHERE name='songs'").get(), undefined);
    } finally {
      backup.close();
    }
  } finally {
    db.close();
    await rm(dir, { recursive: true, force: true });
  }
});