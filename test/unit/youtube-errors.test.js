import test from "node:test";
import assert from "node:assert/strict";
import { getYouTubeErrorMessage, YOUTUBE_PLAYER_STATES } from "../../src/renderer/youtube-errors.js";

test("known YouTube player errors map to the specified user-facing messages", () => {
  assert.match(getYouTubeErrorMessage(2), /Invalid video ID/);
  assert.match(getYouTubeErrorMessage(5), /HTML5 player/);
  assert.match(getYouTubeErrorMessage(100), /not found or is private/);
  assert.match(getYouTubeErrorMessage(101), /does not allow playback/);
  assert.match(getYouTubeErrorMessage(150), /does not allow playback/);
  assert.match(getYouTubeErrorMessage(153), /Referer or equivalent client identification/);
});

test("error mapping accepts numeric strings and handles unknown codes", () => {
  assert.equal(getYouTubeErrorMessage("100"), getYouTubeErrorMessage(100));
  assert.equal(getYouTubeErrorMessage(999), "Unknown YouTube player error (999).");
});

test("player state labels cover the IFrame API state values", () => {
  assert.deepEqual(YOUTUBE_PLAYER_STATES, {
    "-1": "UNSTARTED",
    "0": "ENDED",
    "1": "PLAYING",
    "2": "PAUSED",
    "3": "BUFFERING",
    "5": "CUED"
  });
});