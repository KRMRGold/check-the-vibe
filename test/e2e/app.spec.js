import { test, expect } from "@playwright/test";
import { _electron as electron } from "playwright";
import electronPath from "electron";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";

test("desktop shell launches with isolated renderer and validated IPC", async () => {
  const userData = await mkdtemp(join(tmpdir(), "ctv-e2e-"));
  let app;
  try {
    app = await electron.launch({
      executablePath: electronPath,
      args: ["."],
      env: {
        ...process.env,
        CTV_PROVIDER_MODE: "fixture",
        CTV_TEST_USER_DATA: userData
      }
    });
    const window = await app.firstWindow();
    await expect(window.locator("h1")).toHaveText("Check the Vibe");
    await expect(window.locator("#welcome-title")).toHaveText("Can this player live here?");
    await expect(window.locator("#event-log")).toContainText("Desktop bridge connected");
    const globals = await window.evaluate(() => ({
      requireType: typeof window.require,
      processType: typeof window.process
    }));
    expect(globals).toEqual({
      requireType: "undefined",
      processType: "undefined"
    });
    const invalid = await window.evaluate(() => window.ctv.ping("invalid"));
    expect(invalid.ok).toBe(false);
    expect(invalid.error.code).toBe("INVALID_PAYLOAD");
  } finally {
    if (app) await app.close();
    await rm(userData, { recursive: true, force: true });
  }
});