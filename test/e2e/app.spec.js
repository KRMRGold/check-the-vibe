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
    await window.evaluate(() => {
      const originalNow = Date.now;
      let now = 10000;
      Date.now = () => now;
      const tap = document.querySelector("#tap-tempo-button");
      tap.click();
      now += 500;
      tap.click();
      now += 500;
      tap.click();
      Date.now = originalNow;
    });
    await expect(window.locator("#bpm-input")).toHaveValue("120");
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

    await window.locator("#library-search").fill("");
    await window.locator("#add-song-button").click();
    await window.locator('[name="title"]').fill("Moonlit Arcade");
    await window.locator('[name="artist"]').fill("Static Bloom");
    await window.locator("#song-form button[type=submit]").click();
    await window.locator("#create-deck-button").click();
    await window.locator('#deck-form [name="name"]').fill("Night drives");
    await window.locator('#deck-form [name="description"]').fill("After dark");
    await window.locator("#deck-form button[type=submit]").click();
    await expect(window.locator("#page-title")).toHaveText("Night drives.");
    await window.locator("#deck-song-search").fill("Glass Garden");
    const addGlass = window.getByRole("button", { name: "Add Glass Garden to deck" });
    await addGlass.click();
    await addGlass.click();
    await window.locator("#deck-song-search").fill("Moonlit Arcade");
    await window.getByRole("button", { name: "Add Moonlit Arcade to deck" }).click();
    await expect(window.locator(".deck-entry")).toHaveCount(3);
    await window.getByRole("button", { name: "Move Moonlit Arcade up" }).click();
    await expect(window.locator(".deck-entry .song-title")).toHaveText([
      "Glass Garden", "Moonlit Arcade", "Glass Garden"
    ]);
    await window.locator(".deck-entry").first().getByRole("button", { name: "Remove Glass Garden from deck" }).click();
    await expect(window.locator(".deck-entry")).toHaveCount(2);
    await window.locator("#library-nav").click();
    await window.locator("#library-search").fill("");
    await window.locator("#filter-tag").fill("dream pop");
    await expect(window.locator("#song-count")).toHaveText("1 of 2 songs");
    await expect(window.locator("#song-list .song-title")).toHaveText("Glass Garden");
    await window.locator("#filter-bpm-min").fill("121");
    await expect(window.locator(".empty-state h2")).toHaveText("No matches yet.");
    await window.locator("#filter-bpm-min").fill("110");
    await expect(window.locator("#song-list .song-title")).toHaveText("Glass Garden");
    await window.locator('[data-view="grid"]').click();
    await expect(window.locator("#song-list")).toHaveClass(/song-grid/);
    await expect(window.locator("#song-list .song-title")).toHaveText("Glass Garden");
    await window.locator('[data-view="list"]').click();
    await expect(window.locator("#song-list")).toHaveClass(/song-list/);
    await window.locator("#clear-library-filters").click();
    await expect(window.locator("#song-count")).toHaveText("2 songs");
  } finally {
    if (app) await app.close();
    await rm(userData, { recursive: true, force: true });
  }
});
