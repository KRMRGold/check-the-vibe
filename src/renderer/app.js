import { getYouTubeErrorMessage, YOUTUBE_PLAYER_STATES } from "./youtube-errors.js";

const $ = (selector) => document.querySelector(selector);
const videoIdInput = $("#video-id");
const loadButton = $("#load-video");
const playButton = $("#play-video");
const pauseButton = $("#pause-video");
const status = $("#player-status");
const detail = $("#player-detail");
const statusDot = $("#status-dot");
const log = $("#event-log");
const placeholder = $("#player-placeholder");

$("#page-origin").textContent = location.origin;

let player;
let apiReady = false;
let playerReady = false;

function addLog(message) {
  const item = document.createElement("li");
  item.textContent = `${new Date().toLocaleTimeString()} · ${message}`;
  log.prepend(item);
  while (log.children.length > 30) log.lastElementChild.remove();
}

function setStatus(title, description, state = "neutral") {
  status.textContent = title;
  detail.textContent = description;
  statusDot.dataset.state = state;
}

function setControls() {
  playButton.disabled = !playerReady;
  pauseButton.disabled = !playerReady;
}

function onYouTubeIframeAPIReady() {
  apiReady = true;
  setStatus("YouTube API ready", "Load a video ID, then press Play explicitly.", "ready");
  addLog("IFrame API ready");
}
window.onYouTubeIframeAPIReady = onYouTubeIframeAPIReady;

function loadApi() {
  if (document.querySelector("#youtube-iframe-api")) return;
  const script = document.createElement("script");
  script.id = "youtube-iframe-api";
  script.src = "https://www.youtube.com/iframe_api";
  script.onerror = () => {
    setStatus("YouTube API failed to load", "Check network access and the script-src Content Security Policy.", "error");
    addLog("IFrame API script failed to load");
  };
  document.head.append(script);
}

function createPlayer(videoId) {
  if (!apiReady) {
    setStatus("YouTube API is not ready", "Wait for the API-ready event, then load the video again.", "error");
    return;
  }

  playerReady = false;
  setControls();
  placeholder.hidden = true;
  setStatus("Creating player…", `Video ID: ${videoId}`);
  addLog(`Creating player for ${videoId}`);

  const options = {
    height: "360",
    width: "640",
    videoId,
    playerVars: {
      enablejsapi: 1,
      origin: location.origin,
      playsinline: 1,
      autoplay: 0
    },
    events: {
      onReady: () => {
        playerReady = true;
        setControls();
        setStatus("Player ready", "Press Play to start playback. Autoplay is not used.", "ready");
        addLog("Player ready");
      },
      onStateChange: (event) => {
        const state = YOUTUBE_PLAYER_STATES[String(event.data)] ?? `UNKNOWN (${event.data})`;
        setStatus(state, `YouTube player state: ${event.data}`, event.data === 1 ? "playing" : "neutral");
        addLog(`Player state: ${state} (${event.data})`);
      },
      onError: (event) => {
        const message = getYouTubeErrorMessage(event.data);
        setStatus(`YouTube error ${event.data}`, message, "error");
        addLog(`Error ${event.data}: ${message}`);
      },
      onAutoplayBlocked: () => {
        setStatus("Playback needs a user gesture", "Press Play in this test screen to start the video.", "error");
        addLog("Autoplay was blocked");
      }
    }
  };

  if (player) {
    player.destroy();
    player = undefined;
  }
  player = new window.YT.Player("player", options);
}

loadButton.addEventListener("click", () => {
  const videoId = videoIdInput.value.trim();
  if (!/^[A-Za-z0-9_-]{11}$/.test(videoId)) {
    setStatus("Invalid video ID format", "A YouTube video ID must be 11 characters.", "error");
    addLog("Rejected malformed video ID");
    return;
  }
  createPlayer(videoId);
});

playButton.addEventListener("click", () => {
  if (!playerReady) return;
  player.playVideo();
  addLog("playVideo() requested by user click");
});

pauseButton.addEventListener("click", () => {
  if (!playerReady) return;
  player.pauseVideo();
  addLog("pauseVideo() requested by user click");
});

$("#clear-log").addEventListener("click", () => {
  log.replaceChildren();
});

try {
  const result = await window.ctv.ping({});
  if (result.ok) addLog("Desktop bridge connected");
  else addLog(`Desktop bridge error: ${result.error.message}`);
} catch {
  addLog("Desktop bridge did not respond");
}

loadApi();