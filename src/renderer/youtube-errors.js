const ERROR_MESSAGES = Object.freeze({
  2: "Invalid video ID or player parameter.",
  5: "The HTML5 player encountered a playback error.",
  100: "This video was not found or is private.",
  101: "The video owner does not allow playback in embedded players.",
  150: "The video owner does not allow playback in embedded players.",
  153: "YouTube did not receive a valid HTTP Referer or equivalent client identification. Check loopback origin and referrer behavior."
});

export function getYouTubeErrorMessage(code) {
  return ERROR_MESSAGES[Number(code)] ?? `Unknown YouTube player error (${String(code)}).`;
}

export const YOUTUBE_PLAYER_STATES = Object.freeze({
  "-1": "UNSTARTED",
  "0": "ENDED",
  "1": "PLAYING",
  "2": "PAUSED",
  "3": "BUFFERING",
  "5": "CUED"
});