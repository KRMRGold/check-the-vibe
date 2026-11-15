import test from "node:test";
import assert from "node:assert/strict";
import { createTapTempo } from "../../src/renderer/tap-tempo.js";

test("tap tempo averages recent intervals and rounds to BPM", () => {
  const tempo = createTapTempo();
  assert.equal(tempo.tap(1000), null);
  assert.equal(tempo.tap(1500), 120);
  assert.equal(tempo.tap(2000), 120);
  assert.equal(tempo.tap(2500), 120);
});

test("tap tempo resets after a pause and after explicit reset", () => {
  const tempo = createTapTempo();
  assert.equal(tempo.tap(1000), null);
  assert.equal(tempo.tap(1500), 120);
  assert.equal(tempo.tap(4000), null);
  assert.equal(tempo.tap(4500), 120);
  tempo.reset();
  assert.equal(tempo.tap(5000), null);
});

test("tap tempo clamps output to the supported BPM range", () => {
  const tempo = createTapTempo();
  assert.equal(tempo.tap(1000), null);
  assert.equal(tempo.tap(1050), 400);
});
