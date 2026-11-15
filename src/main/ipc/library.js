import { dialog, ipcMain } from "electron";
import { z } from "zod";
import { createLibraryRepository } from "../library/repository.js";
import { createPasteImportRepository } from "../library/paste-import.js";
import { createPasteImportMatchingRepository } from "../library/paste-import-matching.js";

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
  sort: z.enum(["recent", "added", "title", "artist", "bpm", "energy"]).default("recent")
}).strict();

const PasteInput = z.object({
  text: z.string().min(1).max(500000)
}).strict();

const PasteJobInput = z.object({ id: z.string().uuid() }).strict();

function failure(code, message) {
  return { ok: false, error: { code, message } };
}

export function registerLibraryIpc(db) {
  const library = createLibraryRepository(db);
  const pasteImports = createPasteImportRepository(db);
  const pasteMatching = createPasteImportMatchingRepository(db);
  const activePasteMatches = new Map();
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
  ipcMain.handle("library:match-paste", async (event, payload) => {
    const parsed = PasteJobInput.safeParse(payload);
    if (!parsed.success) return failure("INVALID_PAYLOAD", "The paste import job is invalid.");
    const selected = await dialog.showOpenDialog({
      title: "Select MusicBrainz Canonical Data snapshot",
      properties: ["openFile"],
      filters: [{ name: "Zstandard snapshot archives", extensions: ["zst"] }]
    });
    if (selected.canceled || !selected.filePaths[0]) return failure("CANCELLED", "Snapshot selection was cancelled.");
    const controller = new AbortController();
    activePasteMatches.set(parsed.data.id, controller);
    try {
      const job = await pasteMatching.process(parsed.data.id, {
        archivePath: selected.filePaths[0],
        signal: controller.signal,
        onProgress: (progress) => {
          if (!event.sender.isDestroyed()) {
            event.sender.send("library:match-progress", { jobId: parsed.data.id, ...progress });
          }
        }
      });
      return { ok: true, data: { job } };
    } catch (error) {
      if (error.message === "PASTE_IMPORT_NOT_FOUND") return failure("NOT_FOUND", "That paste import does not exist.");
      if (error.message === "PASTE_IMPORT_ALREADY_DONE") return failure("ALREADY_PROCESSED", "That paste import has already been matched.");
      if (error.message === "PASTE_IMPORT_ALREADY_PROCESSING") return failure("ALREADY_PROCESSING", "That paste import is already being matched.");
      if (error.message === "PASTE_IMPORT_CANCELLED") return failure("CANCELLED", "Matching was cancelled. Your pasted rows are still available.");
      return failure("PASTE_MATCH_FAILED", "The pasted tracks could not be matched against that snapshot.");
    } finally {
      activePasteMatches.delete(parsed.data.id);
    }
  });
  ipcMain.handle("library:cancel-paste-match", async (_event, payload) => {
    const parsed = PasteJobInput.safeParse(payload);
    if (!parsed.success) return failure("INVALID_PAYLOAD", "The paste import job is invalid.");
    const controller = activePasteMatches.get(parsed.data.id);
    if (!controller) return failure("NOT_RUNNING", "That paste import is not currently being matched.");
    controller.abort();
    return { ok: true, data: { cancelRequested: true } };
  });
  ipcMain.handle("library:import-paste", async (_event, payload) => {
    const parsed = PasteInput.safeParse(payload);
    if (!parsed.success) return failure("INVALID_PAYLOAD", "Paste text is missing or too large.");
    try {
      return { ok: true, data: { job: pasteImports.create(parsed.data.text) } };
    } catch (error) {
      if (error.message === "PASTE_TOO_MANY_LINES") return failure("TOO_MANY_LINES", "A paste import can contain at most 500 lines.");
      return failure("PASTE_IMPORT_FAILED", "The pasted tracks could not be imported.");
    }
  });
}