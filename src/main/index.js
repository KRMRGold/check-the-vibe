import { app, BrowserWindow, shell } from "electron";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { mkdirSync } from "node:fs";
import { openDatabase } from "./db/connection.js";
import { runMigrations } from "./db/migrate.js";
import { startContentServer } from "./contentServer.js";
import { registerAppIpc } from "./ipc/app.js";
const here = dirname(fileURLToPath(import.meta.url));
const rendererDirectory = join(here, "../renderer");
let mainWindow, contentServer, database;
function isAllowedExternalUrl(value) { try { const url = new URL(value); return url.protocol === "https:" && ["www.youtube.com","youtube.com","youtu.be"].includes(url.hostname); } catch { return false; } }
async function createMainWindow() {
  contentServer = await startContentServer(rendererDirectory);
  mainWindow = new BrowserWindow({ width:1280, height:820, minWidth:900, minHeight:620, backgroundColor:"#111116", webPreferences:{ preload:join(here,"../preload/index.cjs"), contextIsolation:true, sandbox:true, nodeIntegration:false, webSecurity:true, autoplayPolicy:"no-user-gesture-required" } });
  mainWindow.webContents.setWindowOpenHandler(({url}) => { if (isAllowedExternalUrl(url)) void shell.openExternal(url); return {action:"deny"}; });
  mainWindow.webContents.on("will-navigate", (event, targetUrl) => { let allowed = false; try { allowed = new URL(targetUrl).origin === contentServer.origin; } catch {} if (!allowed) event.preventDefault(); });
  mainWindow.on("closed", () => { mainWindow = undefined; });
  await mainWindow.loadURL(contentServer.origin);
}
app.whenReady().then(async () => {
  if (process.env.CTV_TEST_USER_DATA) app.setPath("userData", process.env.CTV_TEST_USER_DATA);
  const userData = app.getPath("userData"); mkdirSync(join(userData,"backups"),{recursive:true});
  database = openDatabase(join(userData,"ctv.db"));
  await runMigrations(database,{databasePath:join(userData,"ctv.db"),backupDirectory:join(userData,"backups")});
  const providerMode = process.env.CTV_PROVIDER_MODE ?? "fixture";
  if (!["fixture","live"].includes(providerMode)) throw new Error("CTV_PROVIDER_MODE must be 'fixture' or 'live'.");
  app.setAppUserModelId("com.checkthevibe.desktop"); registerAppIpc(); await createMainWindow();
}).catch((error) => { console.error("Application startup failed:",error); app.quit(); });
app.on("activate", () => { if (BrowserWindow.getAllWindows().length === 0) void createMainWindow(); });
app.on("window-all-closed", () => { if (process.platform !== "darwin") app.quit(); });
app.on("before-quit", () => { database?.close(); if (contentServer) void contentServer.close(); });
