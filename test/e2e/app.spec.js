import { test, expect } from "@playwright/test";
import { _electron as electron } from "playwright";
import electronPath from "electron";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";

test("desktop library creates and searches a local song with isolated renderer", async () => {
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
    await expect(window.locator("h1")).toHaveText("Your library.");
    await expect(window.locator("#song-count")).toHaveText("0 songs");
    await window.locator("#add-song-button").click();
    await window.locator('[name="title"]').fill("Glass Garden");
    await window.locator('[name="artist"]').fill("Mira");
    await window.locator('[name="tags"]').fill("dream pop, night drive");
    await window.locator('[name="bpm"]').fill("118");
    await window.locator("#song-form button[type=submit]").click();
    await expect(window.locator(".song-title")).toHaveText("Glass Garden");
    await expect(window.locator(".song-artist")).toContainText("Mira");
    await expect(window.locator("#song-count")).toHaveText("1 song");
    await window.locator("#library-search").fill("dream");
    await expect(window.locator(".song-title")).toHaveText("Glass Garden");
    await window.locator("#library-search").fill("not here");
    await expect(window.locator(".empty-state h2")).toHaveText("No matches yet.");
    const globals = await window.evaluate(() => ({
      requireType: typeof window.require,
      processType: typeof window.process
    }));
    expect(globals).toEqual({ requireType: "undefined", processType: "undefined" });
    const invalid = await window.evaluate(() => window.ctv.ping("invalid"));
    expect(invalid.ok).toBe(false);
    expect(invalid.error.code).toBe("INVALID_PAYLOAD");
  } finally {
    if (app) await app.close();
    await rm(userData, { recursive: true, force: true });
  }
});
