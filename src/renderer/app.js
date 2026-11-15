const $ = (selector) => document.querySelector(selector);
const formPanel = $("#song-form-panel");
const form = $("#song-form");
const formTitle = $("#form-title");
const formError = $("#form-error");
const songList = $("#song-list");
const searchInput = $("#library-search");
const sortSelect = $("#library-sort");
const energyInput = $("#energy");
const energyValue = $("#energy-value");
let songs = [];
let editingId = null;
let view = "list";

function showError(message = "") { formError.textContent = message; }

function setFormOpen(open) {
  formPanel.hidden = !open;
  if (!open) {
    form.reset();
    editingId = null;
    formTitle.textContent = "Add a song";
    $("#save-song-button").textContent = "Save song";
    energyValue.textContent = "Not set";
    showError();
  }
}

function setEnergyLabel() {
  energyValue.textContent = Number(energyInput.value).toFixed(2);
}
energyInput.addEventListener("input", setEnergyLabel);

function addText(parent, tag, className, value) {
  const element = document.createElement(tag);
  if (className) element.className = className;
  element.textContent = value;
  parent.append(element);
  return element;
}

function songMeta(song) {
  const pieces = [song.artist, song.album].filter(Boolean);
  return pieces.join(" · ") || "Artist not set";
}

function editSong(song) {
  editingId = song.id;
  formTitle.textContent = "Edit song";
  $("#save-song-button").textContent = "Save changes";
  form.elements.title.value = song.title;
  form.elements.artist.value = song.artist;
  form.elements.album.value = song.album ?? "";
  form.elements.releaseYear.value = song.release_year ?? "";
  form.elements.durationSeconds.value = song.duration_ms ? Math.round(song.duration_ms / 1000) : "";
  form.elements.bpm.value = song.bpm ?? "";
  form.elements.tags.value = song.tags.join(", ");
  if (song.energy === null) energyValue.textContent = "Not set";
  else {
    energyInput.value = String(song.energy);
    setEnergyLabel();
  }
  setFormOpen(true);
  form.elements.title.focus();
}

function renderSong(song) {
  const article = document.createElement("article");
  article.className = "song-row";
  const art = addText(article, "div", "song-art", "♫");
  art.setAttribute("aria-hidden", "true");
  const copy = addText(article, "div", "song-copy", "");
  addText(copy, "h3", "song-title", song.title);
  addText(copy, "p", "song-artist", songMeta(song));
  const details = addText(article, "div", "song-details", "");
  if (song.bpm !== null) addText(details, "span", "detail-pill", `${song.bpm} BPM`);
  if (song.tags.length) addText(details, "span", "detail-tags", song.tags.slice(0, 3).join(" · "));
  const edit = addText(article, "button", "row-edit", "Edit");
  edit.type = "button";
  edit.setAttribute("aria-label", `Edit ${song.title}`);
  edit.addEventListener("click", () => editSong(song));
  return article;
}

function renderSongs() {
  $("#song-count").textContent = `${songs.length} ${songs.length === 1 ? "song" : "songs"}`;
  songList.className = view === "grid" ? "song-grid" : "song-list";
  songList.replaceChildren();
  if (!songs.length) {
    const empty = document.createElement("div");
    empty.className = "empty-state";
    addText(empty, "span", "empty-symbol", "♫");
    addText(empty, "h2", "", searchInput.value ? "No matches yet." : "Your library is waiting.");
    addText(empty, "p", "", searchInput.value ? "Try another title, artist, or tag." : "Add a song to start building your collection.");
    songList.append(empty);
    return;
  }
  for (const song of songs) songList.append(renderSong(song));
}

async function loadSongs() {
  const result = await window.ctv.library.list({ query: searchInput.value, sort: sortSelect.value });
  if (!result.ok) {
    songList.replaceChildren();
    addText(songList, "p", "load-error", result.error.message);
    return;
  }
  songs = result.data.songs;
  renderSongs();
}

function readOptionalNumber(value, divisor = 1) {
  if (value.trim() === "") return null;
  const number = Number(value);
  return Number.isFinite(number) ? number / divisor : null;
}

form.addEventListener("submit", async (event) => {
  event.preventDefault();
  showError();
  const data = new FormData(form);
  const payload = {
    ...(editingId ? { id: editingId } : {}),
    title: String(data.get("title")).trim(),
    artist: String(data.get("artist")).trim(),
    album: String(data.get("album")).trim() || null,
    releaseYear: readOptionalNumber(String(data.get("releaseYear"))),
    durationMs: readOptionalNumber(String(data.get("durationSeconds")), 1 / 1000),
    bpm: readOptionalNumber(String(data.get("bpm"))),
    energy: energyValue.textContent === "Not set" ? null : Number(energyInput.value),
    tags: String(data.get("tags")).split(",").map((tag) => tag.trim()).filter(Boolean)
  };
  const result = await window.ctv.library.saveSong(payload);
  if (!result.ok) {
    showError(result.error.message);
    return;
  }
  setFormOpen(false);
  await loadSongs();
});

$("#add-song-button").addEventListener("click", () => {
  setFormOpen(true);
  form.elements.title.focus();
});
$("#close-form").addEventListener("click", () => setFormOpen(false));
$("#cancel-form").addEventListener("click", () => setFormOpen(false));
searchInput.addEventListener("input", () => void loadSongs());
sortSelect.addEventListener("change", () => void loadSongs());

for (const button of document.querySelectorAll("[data-view]")) {
  button.addEventListener("click", () => {
    view = button.dataset.view;
    for (const item of document.querySelectorAll("[data-view]")) {
      const active = item === button;
      item.classList.toggle("active", active);
      item.setAttribute("aria-pressed", String(active));
    }
    renderSongs();
  });
}

await loadSongs();
