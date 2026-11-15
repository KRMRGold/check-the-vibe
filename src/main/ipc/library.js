import { ipcMain } from "electron";
import { z } from "zod";
import { createLibraryRepository } from "../library/repository.js";

const SongInput = z.object({
  id: z.string().uuid().optional(),
  title: z.string().trim().min(1).max(240),
  artist: z.string().trim().min(1).max(240),
  album: z.string().trim().max(240).nullable().optional(),
  releaseYear: z.number().int().min(1800).max(2200).nullable().optional(),
  durationMs: z.number().int().positive().max(86400000).nullable().optional(),
  bpm: z.number().min(1).max(400).nullable().optional(),
  energy: z.number().min(0).max(1).nullable().optional(),
  tags: z.array(z.string().trim().min(1).max(48)).max(30).default([])
}).strict();

const ListInput = z.object({
  query: z.string().max(200).default(""),
  sort: z.enum(["recent", "title", "artist"]).default("recent")
}).strict();

function failure(code, message) {
  return { ok: false, error: { code, message } };
}

export function registerLibraryIpc(db) {
  const library = createLibraryRepository(db);
  ipcMain.handle("library:list", async (_event, payload) => {
    const parsed = ListInput.safeParse(payload);
    if (!parsed.success) return failure("INVALID_PAYLOAD", "The library query is invalid.");
    try { return { ok: true, data: { songs: library.listSongs(parsed.data) } }; }
    catch { return failure("LIBRARY_QUERY_FAILED", "The library could not be loaded."); }
  });
  ipcMain.handle("library:save-song", async (_event, payload) => {
    const parsed = SongInput.safeParse(payload);
    if (!parsed.success) return failure("INVALID_PAYLOAD", "The song details are invalid.");
    try {
      const id = library.saveSong(parsed.data);
      return { ok: true, data: { song: library.getSong(id) } };
    } catch (error) {
      if (error.message === "SONG_NOT_FOUND") return failure("NOT_FOUND", "That song no longer exists.");
      return failure("SONG_SAVE_FAILED", "The song could not be saved.");
    }
  });
}
