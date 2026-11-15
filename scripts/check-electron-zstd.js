import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import electronPath from "electron";

const child = fileURLToPath(new URL("./check-electron-zstd-child.js", import.meta.url));
const result = spawnSync(electronPath, [child], {
  encoding: "utf8",
  env: { ...process.env, ELECTRON_RUN_AS_NODE: "1" }
});

if (result.stdout) process.stdout.write(result.stdout);
if (result.stderr) process.stderr.write(result.stderr);
if (result.error) throw result.error;
if (result.status !== 0) {
  process.exitCode = result.status ?? 1;
}
