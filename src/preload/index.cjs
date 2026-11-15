"use strict";
const { contextBridge, ipcRenderer } = require("electron");
contextBridge.exposeInMainWorld("ctv", Object.freeze({
  ping: (payload) => ipcRenderer.invoke("app:ping", payload),
  library: Object.freeze({
    list: (payload) => ipcRenderer.invoke("library:list", payload),
    saveSong: (payload) => ipcRenderer.invoke("library:save-song", payload),
    importPaste: (payload) => ipcRenderer.invoke("library:import-paste", payload),
    matchPaste: (payload) => ipcRenderer.invoke("library:match-paste", payload),
    cancelPasteMatch: (payload) => ipcRenderer.invoke("library:cancel-paste-match", payload),
    onMatchProgress: (callback) => {
      if (typeof callback !== "function") throw new TypeError("A progress callback is required.");
      const listener = (_event, progress) => callback(progress);
      ipcRenderer.on("library:match-progress", listener);
      return () => ipcRenderer.removeListener("library:match-progress", listener);
    }
  }),
  decks: Object.freeze({
    list: () => ipcRenderer.invoke("decks:list"),
    create: (payload) => ipcRenderer.invoke("decks:create", payload),
    update: (payload) => ipcRenderer.invoke("decks:update", payload),
    delete: (payload) => ipcRenderer.invoke("decks:delete", payload),
    listEntries: (payload) => ipcRenderer.invoke("decks:list-entries", payload),
    addEntry: (payload) => ipcRenderer.invoke("decks:add-entry", payload),
    removeEntry: (payload) => ipcRenderer.invoke("decks:remove-entry", payload),
    reorderEntries: (payload) => ipcRenderer.invoke("decks:reorder-entries", payload)
  })
}));