"use strict";
const { contextBridge, ipcRenderer } = require("electron");
contextBridge.exposeInMainWorld("ctv", Object.freeze({
  ping: (payload) => ipcRenderer.invoke("app:ping", payload),
  library: Object.freeze({
    list: (payload) => ipcRenderer.invoke("library:list", payload),
    saveSong: (payload) => ipcRenderer.invoke("library:save-song", payload)
  })
}));
