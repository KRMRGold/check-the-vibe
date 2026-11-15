import { ipcMain } from "electron";
import { z } from "zod";
import { createDeckRepository } from "../library/deck-repository.js";

const DeckId = z.string().uuid();
const DeckInput = z.object({
  name: z.string().trim().min(1).max(120),
  description: z.string().trim().max(1000).nullable().optional()
}).strict();
const UpdateDeckInput = DeckInput.extend({ id: DeckId }).strict();
const DeckIdInput = z.object({ id: DeckId }).strict();
const EmptyInput = z.object({}).strict();
const AddEntryInput = z.object({ deckId: DeckId, songId: DeckId }).strict();
const RemoveEntryInput = z.object({ deckId: DeckId, entryId: DeckId }).strict();
const ReorderEntriesInput = z.object({
  deckId: DeckId,
  entryIds: z.array(DeckId).max(5000)
}).strict();

function failure(code, message) {
  return { ok: false, error: { code, message } };
}

function mapError(error) {
  if (error.message === "DECK_NOT_FOUND") return failure("NOT_FOUND", "That deck no longer exists.");
  if (error.message === "SONG_NOT_FOUND") return failure("SONG_NOT_FOUND", "That song no longer exists.");
  if (error.message === "DECK_ORDER_MISMATCH") return failure("INVALID_ORDER", "The deck entries changed. Reload the deck before reordering.");
  return failure("DECK_OPERATION_FAILED", "The deck could not be updated.");
}

export function registerDeckIpc(db) {
  const decks = createDeckRepository(db);

  ipcMain.handle("decks:list", async (_event, payload) => {
    if (!EmptyInput.safeParse(payload ?? {}).success) {
      return failure("INVALID_PAYLOAD", "The deck query is invalid.");
    }
    try { return { ok: true, data: { decks: decks.listDecks() } }; }
    catch { return failure("DECK_QUERY_FAILED", "The decks could not be loaded."); }
  });

  ipcMain.handle("decks:create", async (_event, payload) => {
    const parsed = DeckInput.safeParse(payload);
    if (!parsed.success) return failure("INVALID_PAYLOAD", "The deck details are invalid.");
    try { return { ok: true, data: { deck: decks.createDeck(parsed.data) } }; }
    catch { return failure("DECK_CREATE_FAILED", "The deck could not be created."); }
  });

  ipcMain.handle("decks:update", async (_event, payload) => {
    const parsed = UpdateDeckInput.safeParse(payload);
    if (!parsed.success) return failure("INVALID_PAYLOAD", "The deck details are invalid.");
    try { return { ok: true, data: { deck: decks.updateDeck(parsed.data) } }; }
    catch (error) { return mapError(error); }
  });

  ipcMain.handle("decks:delete", async (_event, payload) => {
    const parsed = DeckIdInput.safeParse(payload);
    if (!parsed.success) return failure("INVALID_PAYLOAD", "The deck identifier is invalid.");
    try {
      if (!decks.deleteDeck(parsed.data.id)) return failure("NOT_FOUND", "That deck no longer exists.");
      return { ok: true, data: { deleted: true } };
    } catch { return failure("DECK_DELETE_FAILED", "The deck could not be deleted."); }
  });

  ipcMain.handle("decks:list-entries", async (_event, payload) => {
    const parsed = DeckIdInput.safeParse(payload);
    if (!parsed.success) return failure("INVALID_PAYLOAD", "The deck identifier is invalid.");
    try { return { ok: true, data: { entries: decks.listEntries(parsed.data.id) } }; }
    catch (error) { return mapError(error); }
  });

  ipcMain.handle("decks:add-entry", async (_event, payload) => {
    const parsed = AddEntryInput.safeParse(payload);
    if (!parsed.success) return failure("INVALID_PAYLOAD", "The deck entry is invalid.");
    try {
      const id = decks.addEntry(parsed.data.deckId, parsed.data.songId);
      return { ok: true, data: { entry: decks.getEntry(id) } };
    } catch (error) { return mapError(error); }
  });

  ipcMain.handle("decks:remove-entry", async (_event, payload) => {
    const parsed = RemoveEntryInput.safeParse(payload);
    if (!parsed.success) return failure("INVALID_PAYLOAD", "The deck entry is invalid.");
    try {
      if (!decks.removeEntry(parsed.data)) return failure("NOT_FOUND", "That deck entry no longer exists.");
      return { ok: true, data: { removed: true } };
    } catch (error) { return mapError(error); }
  });

  ipcMain.handle("decks:reorder-entries", async (_event, payload) => {
    const parsed = ReorderEntriesInput.safeParse(payload);
    if (!parsed.success) return failure("INVALID_PAYLOAD", "The deck order is invalid.");
    try { return { ok: true, data: { entries: decks.reorderEntries(parsed.data) } }; }
    catch (error) { return mapError(error); }
  });
}
