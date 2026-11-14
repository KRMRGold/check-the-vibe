"use strict";
const { contextBridge, ipcRenderer } = require("electron");
contextBridge.exposeInMainWorld("ctv", Object.freeze({
  ping: (payload) => ipcRenderer.invoke("app:ping", payload)
}));
