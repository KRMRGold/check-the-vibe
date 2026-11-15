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
const deckFormPanel = $("#deck-form-panel");
const deckForm = $("#deck-form");
const deckFormError = $("#deck-form-error");
let songs = [];
let editingId = null;
let view = "list";
let decks = [];
let selectedDeckId = null;
let editingDeckId = null;
let deckEntries = [];

function showError(message = "") { formError.textContent = message; }
function showDeckError(message = "") { deckFormError.textContent = message; }

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

function setDeckFormOpen(open) {
  deckFormPanel.hidden = !open;
  if (!open) {
    deckForm.reset();
    editingDeckId = null;
    $("#deck-form-title").textContent = "Create a deck";
    $("#save-deck-button").textContent = "Create deck";
    showDeckError();
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

function setPageTitle(title, description) {
  const heading = $("#page-title");
  heading.replaceChildren(document.createTextNode(title));
  const period = document.createElement("span");
  period.className = "heading-period";
  period.textContent = ".";
  heading.append(period);
  $(".page-description").textContent = description;
}

function showLibrary() {
  selectedDeckId = null;
  $("#library-view").hidden = false;
  $("#deck-view").hidden = true;
  $("#add-song-button").hidden = false;
  $("#library-nav").classList.add("active");
  $("#library-nav").setAttribute("aria-current", "page");
  setPageTitle("Your library", "A home for the tracks that make you feel something.");
  setDeckFormOpen(false);
  renderDecks();
}

function showDeck(deckId) {
  selectedDeckId = deckId;
  const deck = decks.find((item) => item.id === deckId);
  if (!deck) return showLibrary();
  $("#library-view").hidden = true;
  $("#deck-view").hidden = false;
  $("#add-song-button").hidden = true;
  $("#library-nav").classList.remove("active");
  $("#library-nav").removeAttribute("aria-current");
  setPageTitle(deck.name, deck.description || "A collection of tracks, in your order.");
  setFormOpen(false);
  setDeckFormOpen(false);
  renderDecks();
  void loadDeck();
  $("#deck-song-search").value = "";
  void loadDeckCandidates();
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

async function loadDecks() {
  const result = await window.ctv.decks.list();
  if (!result.ok) {
    $("#deck-list").replaceChildren();
    addText($("#deck-list"), "p", "sidebar-error", result.error.message);
    return;
  }
  decks = result.data.decks;
  renderDecks();
  if (selectedDeckId && decks.some((deck) => deck.id === selectedDeckId)) {
    const deck = decks.find((item) => item.id === selectedDeckId);
    setPageTitle(deck.name, deck.description || "A collection of tracks, in your order.");
  } else if (selectedDeckId) {
    showLibrary();
  }
}

function renderDecks() {
  const list = $("#deck-list");
  list.replaceChildren();
  if (!decks.length) {
    addText(list, "p", "deck-nav-empty", "No decks yet");
    return;
  }
  for (const deck of decks) {
    const button = addText(list, "button", "deck-nav-item", "");
    button.type = "button";
    button.setAttribute("aria-pressed", String(deck.id === selectedDeckId));
    button.classList.toggle("active", deck.id === selectedDeckId);
    addText(button, "span", "deck-nav-name", deck.name);
    addText(button, "span", "deck-nav-count", String(deck.entry_count));
    button.addEventListener("click", () => showDeck(deck.id));
  }
}

async function loadDeck() {
  if (!selectedDeckId) return;
  const result = await window.ctv.decks.listEntries({ id: selectedDeckId });
  if (!result.ok) {
    $("#deck-entry-list").replaceChildren();
    addText($("#deck-entry-list"), "p", "load-error", result.error.message);
    return;
  }
  deckEntries = result.data.entries;
  renderDeckEntries();
  $("#deck-count").textContent = `${deckEntries.length} ${deckEntries.length === 1 ? "track" : "tracks"}`;
  await loadDecks();
}

function renderDeckEntries() {
  const list = $("#deck-entry-list");
  list.replaceChildren();
  if (!deckEntries.length) {
    const empty = document.createElement("div");
    empty.className = "empty-state";
    addText(empty, "span", "empty-symbol", "♫");
    addText(empty, "h2", "", "This deck is still open.");
    addText(empty, "p", "", "Add tracks from your library below.");
    list.append(empty);
    return;
  }
  deckEntries.forEach((entry, index) => {
    const row = document.createElement("article");
    row.className = "deck-entry";
    addText(row, "span", "deck-entry-position", String(index + 1).padStart(2, "0"));
    const copy = addText(row, "div", "song-copy", "");
    addText(copy, "h3", "song-title", entry.song.title);
    addText(copy, "p", "song-artist", songMeta(entry.song));
    const details = addText(row, "div", "song-details", "");
    if (entry.song.bpm !== null) addText(details, "span", "detail-pill", `${entry.song.bpm} BPM`);
    if (entry.song.tags.length) addText(details, "span", "detail-tags", entry.song.tags.slice(0, 3).join(" · "));
    const actions = addText(row, "div", "deck-entry-actions", "");
    const up = addText(actions, "button", "row-edit", "↑");
    up.type = "button";
    up.disabled = index === 0;
    up.setAttribute("aria-label", `Move ${entry.song.title} up`);
    up.addEventListener("click", () => moveEntry(index, -1));
    const down = addText(actions, "button", "row-edit", "↓");
    down.type = "button";
    down.disabled = index === deckEntries.length - 1;
    down.setAttribute("aria-label", `Move ${entry.song.title} down`);
    down.addEventListener("click", () => moveEntry(index, 1));
    const remove = addText(actions, "button", "row-remove", "Remove");
    remove.type = "button";
    remove.setAttribute("aria-label", `Remove ${entry.song.title} from deck`);
    remove.addEventListener("click", () => removeEntry(entry.id));
    list.append(row);
  });
}

async function moveEntry(index, direction) {
  const ids = deckEntries.map((entry) => entry.id);
  const target = index + direction;
  [ids[index], ids[target]] = [ids[target], ids[index]];
  const result = await window.ctv.decks.reorderEntries({ deckId: selectedDeckId, entryIds: ids });
  if (!result.ok) return showDeckError(result.error.message);
  deckEntries = result.data.entries;
  renderDeckEntries();
}

async function removeEntry(entryId) {
  const result = await window.ctv.decks.removeEntry({ deckId: selectedDeckId, entryId });
  if (!result.ok) return showDeckError(result.error.message);
  await loadDeck();
}

async function loadDeckCandidates() {
  const target = $("#deck-song-results");
  const result = await window.ctv.library.list({ query: $("#deck-song-search").value, sort: "title" });
  if (!result.ok) {
    target.replaceChildren();
    addText(target, "p", "load-error", result.error.message);
    return;
  }
  const candidates = result.data.songs.slice(0, 20);
  target.replaceChildren();
  if (!candidates.length) {
    addText(target, "p", "deck-nav-empty", "No matching songs in your library.");
    return;
  }
  for (const song of candidates) {
    const row = addText(target, "div", "deck-song-result", "");
    const copy = addText(row, "div", "song-copy", "");
    addText(copy, "strong", "song-title", song.title);
    addText(copy, "span", "song-artist", songMeta(song));
    const add = addText(row, "button", "row-edit", "Add");
    add.type = "button";
    add.setAttribute("aria-label", `Add ${song.title} to deck`);
    add.addEventListener("click", async () => {
      add.disabled = true;
      const added = await window.ctv.decks.addEntry({ deckId: selectedDeckId, songId: song.id });
      if (!added.ok) {
        add.disabled = false;
        return showDeckError(added.error.message);
      }
      await loadDeck();
    });
  }
}

function openDeckForm(deck = null) {
  editingDeckId = deck?.id ?? null;
  $("#deck-form-title").textContent = deck ? "Edit deck" : "Create a deck";
  $("#save-deck-button").textContent = deck ? "Save changes" : "Create deck";
  deckForm.elements.name.value = deck?.name ?? "";
  deckForm.elements.description.value = deck?.description ?? "";
  showDeckError();
  deckFormPanel.hidden = false;
  deckForm.elements.name.focus();
}

deckForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  showDeckError();
  const payload = {
    name: deckForm.elements.name.value.trim(),
    description: deckForm.elements.description.value.trim() || null
  };
  const result = editingDeckId
    ? await window.ctv.decks.update({ ...payload, id: editingDeckId })
    : await window.ctv.decks.create(payload);
  if (!result.ok) return showDeckError(result.error.message);
  const deckId = result.data.deck.id;
  setDeckFormOpen(false);
  await loadDecks();
  showDeck(deckId);
});

$("#create-deck-button").addEventListener("click", () => openDeckForm());
$("#close-deck-form").addEventListener("click", () => setDeckFormOpen(false));
$("#cancel-deck-form").addEventListener("click", () => setDeckFormOpen(false));
$("#edit-deck-button").addEventListener("click", () => {
  const deck = decks.find((item) => item.id === selectedDeckId);
  if (deck) openDeckForm(deck);
});
$("#delete-deck-button").addEventListener("click", async () => {
  const deck = decks.find((item) => item.id === selectedDeckId);
  if (!deck || !window.confirm(`Delete "${deck.name}"? Its entries will be removed, but the songs stay in your library.`)) return;
  const result = await window.ctv.decks.delete({ id: deck.id });
  if (!result.ok) return showDeckError(result.error.message);
  await loadDecks();
  showLibrary();
});
$("#library-nav").addEventListener("click", (event) => {
  event.preventDefault();
  showLibrary();
});
$("#deck-song-search").addEventListener("input", () => void loadDeckCandidates());

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
  await loadDecks();
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

await Promise.all([loadSongs(), loadDecks()]);
