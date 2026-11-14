---
name: Check the Vibe Build Spec
type: build-spec
version: 0.2.0
status: ready-to-implement (S3)
workflow: Development State Machine Workflow
workflow_version: 1.6.0
source_design: design-doc.md (v0.7.2)
---

# Check the Vibe: Build Specification (Desktop MVP)

`design-doc.md` says what the product is. This document says exactly what to build first, in what order, with which data sources, and how to prove each step works. Where the two disagree for the MVP, this document wins, and every disagreement is listed in section 14.

---

## 0. Instructions for the LLM builder

1. **Build one milestone at a time** (section 12). Do not start milestone N+1 until every acceptance test for milestone N passes.
2. **Section 2 decisions are locked.** Do not substitute libraries. Adding a dependency not listed needs a one-line justification in `docs/decisions.md`.
3. **Do not build anything in section 13 (Non-goals).** Extension points exist so those can be added later.
4. **Deterministic code owns:** validation, IDs, SQL, rate limiting, quota counting, scoring, game rules, and security checks. Never put these behind a model call. (This app has no model calls at all.)
5. **Never claim a check passed unless you ran it against the exact commit.** Mark checks you cannot run as BLOCKED or NOT RUN with the reason and the minimum human action needed (section 1A).
6. **Spikes come first.** M1 (YouTube embed) and M2 (data providers) test the two riskiest assumptions with real calls. If a spike fails, stop, write what you found in `docs/decisions.md`, and apply the fallback written in that milestone rather than improvising.
7. If a requirement is ambiguous, pick the simplest reading, record it in `docs/decisions.md`, and continue.
8. Tests are part of the deliverable. Code without tests for its acceptance criteria is not done.
9. At the start of every session, read `docs/MAINTENANCE.md` and `docs/TEST_RECORD.md` to recover current state. If something needed is missing or inconsistent, say so and recover from Git before asking the user.
10. Never put an API key, token or secret in source, logs, fixtures, test output or the database (section 9.4).

---

## 1. Product definition (MVP)

A desktop app where **songs are cards, playlists are decks, and decks can be played in a small deck-building game.** No account is needed for ordinary use.

### What "done" means for the MVP

A user can:

1. Paste a **YouTube playlist** link and get a **deck** (original order and source links preserved) plus **reusable song cards** in the library. No audio is downloaded.
2. See each song **identified** (artist, title, release year, artwork) using MusicBrainz, and review or fix uncertain matches.
3. See **card stats** (genres, moods, energy, BPM where available) with a visible source for every value, and set their own values that always win.
4. Browse the library as a **list or a card grid**, build any number of decks from the same cards, and reorder them.
5. **Play** songs in the app through the YouTube iframe player (queue, next/previous, unavailable-video handling).
6. Play a **local hot-seat deck-building game** (2 to 6 players, one computer) using their decks, with automatic scoring, an optional host judge, a visible Crowd Vibe and separate Player Reputation.
7. **Save a finished match's played songs as a new deck.**
8. **Export a deck to a YouTube playlist** in their own account (M10).
9. Back up and restore their whole library as JSON.

### Explicitly later

Phones and party mode, physical cards, audience/live-chat judging, booster/draft, local-file playback, Apple Music, sharing and public decks, cloud anything. See section 13.

---

## 1A. Workflow adoption (Development State Machine)

Recorded per the workflow's setup rules. The reusable workflow lives in the Meta-Modules repository (`workflows/Development-State-Machine-Workflow.md`) and is linked, not copied. If the builder cannot access it, say so and follow this section.

| Item | Value |
|---|---|
| Adopted workflow | Development State Machine Workflow, internal `version: 1.6.0` (adoption provenance; follow the current canonical workflow unless a pin with a Git SHA or tag is recorded here) |
| Optional modules | Testing and Verification; Context Continuity |
| Initial design | `design-doc.md` |
| Ready-to-implement spec (S3) | this file |
| Maintenance document | `docs/MAINTENANCE.md` |
| Latest test record | `docs/TEST_RECORD.md` |
| Milestone document | `docs/MILESTONE.md`, created only at S11 |
| Decisions log | `docs/decisions.md` |

Adaptations:

1. **Milestones are workflow passes.** Each of M0 to M11 is one pass through S3 to S10. The acceptance tests under a milestone are its S3 criteria, so the builder starts at S4. Bug fixes inside a milestone use the lightweight path.
2. **Versioning (SemVer, independent sequences).** The app (`package.json`), the database schema (migration number) and the game ruleset (`ruleset.version`, saved with every match for replay) are versioned separately. The app stays `0.x.y` until M11 is accepted, then becomes `1.0.0`. A milestone candidate bumps MINOR; a repair bumps PATCH. Example: M3 gives `app-v0.3.0`, and its repair is `app-v0.3.1`.
3. **Candidate, failed, accepted.** Tag every candidate in Git (`app-v0.3.0`). Never move or reuse a tag. A failed candidate keeps its tag and evidence; the repair gets a new tag. Acceptance status is recorded in `docs/MAINTENANCE.md`, never implied by a version number.
4. **Living documents.** `design-doc.md`, this file, `docs/MAINTENANCE.md`, `docs/TEST_RECORD.md`, `docs/decisions.md` and `docs/MILESTONE.md` each exist as exactly one file, updated in place. Git history is the archive. No `-v2`, `-old` or backup copies.
5. **Evidence.** The builder runs every check the environment allows and records PASS, FAIL, BLOCKED or NOT RUN per check in `docs/TEST_RECORD.md`, with the commit, commands and results. A BLOCKED critical check prevents accepting that milestone unless the user explicitly accepts the documented limitation.
6. **Expected human-run checks:** anything on a clean Windows machine (installer, packaged app), anything needing the user's Google Cloud key or OAuth sign-in, and any live provider call if the builder has no network.
7. **Milestone document (S11).** When the user declares the MVP complete (after M11), reconcile `design-doc.md`, this file, `docs/MAINTENANCE.md` and the accepted code into `docs/MILESTONE.md`, then test whether a fresh LLM session can reconstruct the app from it.

---

## 2. Locked decisions

| Area | Decision |
|---|---|
| Desktop shell | **Electron**, Windows-first, developed cross-platform. Electron Forge is configured early for an unpacked M1 smoke build; the final Windows installer remains M11. |
| Renderer | **HTML, CSS and plain JavaScript (native ES modules).** No UI framework, no bundler required. |
| Main process | Node.js (ESM). All privileged work, network calls, SQL and secrets live here. |
| Storage | **SQLite via `better-sqlite3`**, WAL mode. Plain SQL in a thin repository layer, no ORM. Numbered `.sql` migrations. JSON is the **export/import** format. *(Deviation from design-doc §7.3, see section 14.)* |
| IDs, time | UUIDv7 text IDs and UTC ISO-8601 timestamps, generated in code only. |
| Validation | `zod` for every IPC payload and every external API response. |
| Tests | Node built-in test runner (`node --test`) for main-process and game-engine logic; **Playwright** with Electron support is installed and configured in M0, then used for game-flow E2E in M9 and final smoke tests in M11. |
| Providers | `MusicBrainz` (identity), `Cover Art Archive` (artwork), `YouTube Data API v3` (import/export), `YouTube IFrame Player API` (playback), plus a pluggable **audio-feature provider chain** (section 5). **No Spotify, in any form** (API, scrapers or datasets derived from it). |
| Provider modes | `CTV_PROVIDER_MODE=live` or `fixture`. Tests run in `fixture` mode from recorded JSON in `test/fixtures/` and need no network. |
| Credentials | **Bring your own:** the user supplies their own Google Cloud API key (and later OAuth client ID) in Settings. The app ships with none. |
| Game | Local hot-seat only. Pure, deterministic engine (reducer plus seeded RNG) with an event log. No networking in the MVP. |

Allowed dependencies: `electron`, `better-sqlite3`, `zod`, `@electron-forge/*`, `@playwright/test`. Install/configure test and packaging tools at the earliest milestone that needs them; never defer a test dependency until after the milestone that uses it. Anything else needs a justification.

---

## 3. Repository layout

```
check-the-vibe/
├── design-doc.md   build-spec.md   README.md
├── docs/ decisions.md  MAINTENANCE.md  TEST_RECORD.md  MILESTONE.md   # last created at S11
├── package.json  forge.config.js
├── src/
│   ├── main/
│   │   ├── index.js                 # app lifecycle, window, security handlers
│   │   ├── contentServer.js         # loopback HTTP server that serves renderer files (section 8.1)
│   │   ├── ipc/                     # one file per channel group; zod-validated
│   │   ├── db/ connection.js  migrations/0001_init.sql ...
│   │   ├── repos/                   # songs, decks, imports, attributes, matches, settings
│   │   ├── providers/
│   │   │   ├── http.js              # fetch wrapper: timeout, retry, throttle, fixture mode
│   │   │   ├── musicbrainz.js  coverart.js  youtube.js  youtubeAuth.js
│   │   │   └── features/ index.js  (chain)  reccobeats.js  soundstat.js  soundcharts.js  getsongbpm.js  acousticbrainz.js
│   │   ├── services/ identify.js  importPlaylist.js  enrich.js  quota.js  expiry.js  backup.js
│   │   ├── game/ engine.js  rulesets/vibe-check.json  rng.js  selectors.js
│   │   └── secrets.js               # safeStorage-backed secret store
│   ├── preload/ index.js            # exposes window.ctv (explicit methods only)
│   └── renderer/
│       ├── index.html  app.css  app.js
│       ├── views/ library.js  decks.js  deck.js  import.js  review.js  game-setup.js  game-table.js  settings.js
│       ├── components/ card.js  songRow.js  statChips.js  playerBar.js  toast.js
│       └── lib/ store.js  bus.js  dom.js
└── test/ unit/  integration/  e2e/  fixtures/{youtube,musicbrainz,features}/
```

---

## 4. Data sources (what supplies each field)

This is the answer to "where does the data come from". Every stored value records its source; none is silently overwritten.

| Data | Source | How | Notes |
|---|---|---|---|
| Playlist order, video IDs, thumbnails, durations, embeddable flag | **YouTube Data API v3** | `playlistItems.list`, `videos.list`, user's own API key | Expiring data, see 4.2. M5 imports public playlists using the user's API key; private playlist access and export are deferred until OAuth is implemented in M10. |
| Playback | **YouTube IFrame Player API** | Embedded player, visible, with events and error codes | Not a metadata source. Playback can fail per video. |
| Song identity: artist, title, length, release year, ISRC, MBID | **MusicBrainz Web Service v2** | Recording search then lookup | Free, no key, needs a meaningful `User-Agent`, about 1 request/second, cache everything. Confirm terms before any commercial use. |
| Artwork | **Cover Art Archive** by release MBID | `https://coverartarchive.org/release/{mbid}/front-250` | Not every release has art. Fallback: YouTube thumbnail (hotlinked, not stored). Do not assume images are freely redistributable. |
| Genres | MusicBrainz genres/tags on the recording (top 3 by vote count), plus user tags | Part of the recording lookup | Sparse for obscure songs. User tags always accepted. |
| BPM, energy, valence, danceability, key, mode | **External audio-feature provider chain** (section 5) | Looked up by ISRC, MBID or artist+title, whichever the provider supports | Values are supplied by external catalog/metadata services; the app does not analyze audio files. Machine estimates can be wrong and are always labeled. **Provider choice is decided by the M2 spike.** |
| Mood tags | User-authored (primary). Optional provider-derived mood where a provider offers it | Card editor | The game must work with moods blank. |
| Energy rating 1 to 5, tap-tempo BPM | **User** | Card editor | Highest priority over any provider. |

### 4.1 Value precedence

For each attribute, the resolved value is the first available of: **user value, then providers in configured priority order, then unknown.** Unknown is a first-class state: it is shown as "?" and never treated as zero. Provider values are stored next to each other in `attribute_values`, so changing priority never needs a refetch.

Numeric provider values are stored raw. The card shows **energy as 1 to 5** computed as `clamp(ceil(value * 5), 1, 5)`. A user-set energy is stored as the 1 to 5 integer. Musical key and mode are categorical values (for example, `C♯` and `minor`), not numbers.

### 4.2 Expiring (YouTube-derived) data

The design doc notes YouTube API data generally must be refreshed or deleted within 30 days. Implement this conservatively and re-verify the current policy text during M5:

- All raw YouTube API payloads live only in `provider_records` with `expires_at = fetched_at + 30 days`.
- Canonical `songs.title` and `songs.artist` are written **only** from MusicBrainz or from the user. Parsed YouTube titles are never copied into canonical columns.
- A song that is not yet identified (state `unmatched`) displays its title from its live provider record. If that record expires and cannot be refreshed, the card shows "Unidentified video (id)" until refreshed or identified.
- `services/expiry.js` runs at startup: refresh records within 5 days of expiry if online and a key exists; purge `payload_json` of expired records; keep `external_id` and `fetched_at`.
- Video IDs and deck order are references and are kept.
- Follow YouTube's branding, attribution and terms requirements, and never scrape or bypass embed restrictions.

### 4.3 What is deliberately not used

Spotify (policy: no games, no derived metrics; includes any scraper that "restores" Spotify data), the iTunes Search API and Apple Music (deferred), and any audio download or analysis of YouTube audio (not allowed and not needed).

---

## 5. Audio-feature provider chain

```js
// providers/features/index.js
// Provider: { id, label, supports: { isrc, mbid, nameLookup }, rateLimit, async lookup(songRef) -> Features|null }
// Features: { bpm?, energy?, valence?, danceability?, acousticness?, instrumentalness?, key?, mode?, confidence? }
```

Rules:

- The chain tries enabled providers in the user's priority order for each missing attribute, stops when the needed attributes are filled, and writes **one row per provider per attribute** to `attribute_values`.
- A provider returning nothing or erroring never blocks the others. Misses are cached (`provider_records` with a short TTL) so they are not re-requested every launch.
- Providers are individually enable/disable switchable in Settings. With none enabled, the app is fully usable with user-set values.
- Lookups need a stable key. Prefer **ISRC or MBID** from the identification step. Name-based lookup is a last resort and is flagged lower confidence.

### Candidate providers (what is known, and what M2 must verify)

The user selected a **multi-provider approach** and rejected MeloData. Do not use MeloData. Do not use live APIs or services with quotas, request caps, or other usage-limited access. Prefer openly licensed static datasets that can be downloaded once and queried locally.

| Provider / dataset | Potential role | Access and known constraints | M2 must verify |
|---|---|---|---|
| **AcousticBrainz static archive** | BPM, key, mode, rhythm, danceability, acoustic/mood features | CC0. Frozen dataset dated 2022-07-06; indexed by MusicBrainz recording MBID. Contains 29,460,584 submissions across about 7.56 million unique recordings. Static JSON dumps and feature CSVs are published. The official live API is rate-limited (typically 10 requests per 10 seconds per IP), so **do not use the live API**. The 100,000-item low-level JSON sample is listed at 2 GB; full feature CSV sizes have not been verified. | Find a practical static subset or a manageable local import path. Measure coverage for 10 test recordings by MBID and inspect duplicate submissions, missing fields, confidence/quality indicators, and BPM/key semantics. No download or coverage test has been run. |
| **Free Music Archive (FMA) metadata** | Supplemental genres and community tags | Static dataset; 106,574 tracks. Metadata archive is listed at 342 MiB compressed. Metadata is CC BY 4.0 and requires attribution. Match is likely by normalized title+artist because an MBID mapping is not established. **Do not use `echonest.csv`**: it contains Echo Nest features (now associated with Spotify). Use only FMA metadata/tags/genres. | Inspect exact metadata columns, attribution requirements, track coverage, and false-match risk across 10 known recordings. Determine whether its size and catalog fit justify a local optional dataset. No download or coverage test has been run. |
| **MusicBrainz genres/tags** | Existing baseline for genres and identity | Already part of the app design. Existing API is rate-limited and should remain governed by its current adapter's documented throttling; no new duplicate adapter is needed. | Reuse the existing source; measure its tag coverage in the same 10-track comparison. |
| **Wikidata** | Possible structured BPM fallback | P1725 exists for numerical BPM and P1558 for qualitative tempo. The public Query Service imposes processing-time and throttling limits, so do not query it live. A full static dump is not currently justified for this app. | Excluded from the MVP candidate chain unless a small, openly licensed, static extract with useful coverage is identified. Property existence alone is not coverage evidence. |
| **FMAK key/mode annotations** | Possible key/mode reference dataset | 5,489 manually annotated FMA tracks. Its annotation file includes Spotify URI mappings; the project rule is no Spotify in any form, so **exclude this dataset** rather than risk consuming or retaining those identifiers. | No test. Excluded on the no-Spotify boundary. |

### Excluded candidates

- **MeloData:** rejected by the user. Do not use or reintroduce it.
- **Last.fm:** free API key required; API terms limit use to non-commercial purposes and API access is subject to usage controls. Do not use it for this project under the no-usage-limited-services boundary.
- **GetSongBPM:** free API but quota-limited (3,000 requests/hour) and requires a backlink. Do not use.
- **ReccoBeats:** excluded because its terms disclose Spotify-derived core track metadata.
- **Audiometa:** excluded until field-level provenance can prove that any consumed values are independent of Spotify and Spotify-derived data.
- **SoundStat / Soundcharts:** excluded as paid services.

### Proposed multi-provider field chain (provisional; not selected until measured)

- **Identity:** MusicBrainz.
- **Genres/tags:** MusicBrainz → FMA metadata (optional local dataset) → user tags.
- **BPM/key/mode/rhythm/danceability:** AcousticBrainz static archive (optional local dataset) → user values.
- **Mood descriptors:** AcousticBrainz high-level archive where present → user tags.
- **Energy:** user-set energy remains the reliable primary value; do not invent a normalized provider value where the source does not define a compatible measure.

All provider values retain source and provenance. User-entered values always win. Missing data remains unknown. The app must remain usable if optional datasets are absent. No dataset or adapter is selected until the same 10-track test establishes actual coverage, field quality, matching reliability, licensing and practical dataset size.


---

## 6. Data model (SQLite)

All timestamps are UTC ISO-8601 text. Enable `PRAGMA foreign_keys=ON; journal_mode=WAL;` on every connection. Before applying a migration, create a consistent SQLite backup using the `better-sqlite3` backup API (or another SQLite-aware online backup mechanism) at `backups/ctv-<timestamp>-pre-migration.db`. Do not copy only the main database file while WAL is active.

```sql
CREATE TABLE schema_migrations (version INTEGER PRIMARY KEY, applied_at TEXT NOT NULL);

CREATE TABLE songs (
  id TEXT PRIMARY KEY,
  title TEXT, artist TEXT, album TEXT,                 -- canonical: MusicBrainz or user ONLY (see 4.2)
  release_year INTEGER, duration_ms INTEGER,
  mbid_recording TEXT, isrc TEXT,
  identity_state TEXT NOT NULL CHECK (identity_state IN ('matched','needs_review','unmatched','manual')),
  notes TEXT, created_at TEXT NOT NULL, updated_at TEXT NOT NULL
);
CREATE UNIQUE INDEX songs_mbid ON songs(mbid_recording) WHERE mbid_recording IS NOT NULL;
CREATE INDEX songs_isrc ON songs(isrc);
-- songs_fts (FTS5: title, artist, album, tags) is rebuilt per song by the repository layer in the same transaction as the write.

CREATE TABLE song_tags (
  song_id TEXT NOT NULL REFERENCES songs(id) ON DELETE CASCADE,
  kind TEXT NOT NULL CHECK (kind IN ('genre','mood','tag')),
  value TEXT NOT NULL,                                 -- lowercase, trimmed
  source TEXT NOT NULL,                                -- 'user' | 'musicbrainz' | provider id
  weight REAL,
  PRIMARY KEY (song_id, kind, value, source)
);

CREATE TABLE attribute_values (                        -- one row per source per attribute; never overwritten across sources
  id TEXT PRIMARY KEY,
  song_id TEXT NOT NULL REFERENCES songs(id) ON DELETE CASCADE,
  attribute TEXT NOT NULL CHECK (attribute IN ('bpm','energy','valence','danceability','acousticness','instrumentalness','key','mode')),
  value_num REAL,
  value_text TEXT,
  source TEXT NOT NULL,                                -- 'user' | provider id
  confidence REAL CHECK (confidence BETWEEN 0 AND 1),
  fetched_at TEXT NOT NULL,
  CHECK (
    (attribute IN ('key','mode') AND value_text IS NOT NULL AND value_num IS NULL) OR
    (attribute NOT IN ('key','mode') AND value_num IS NOT NULL AND value_text IS NULL)
  ),
  UNIQUE (song_id, attribute, source)
);

CREATE TABLE song_links (                              -- a song can have several videos (live, alternate versions)
  id TEXT PRIMARY KEY,
  song_id TEXT NOT NULL REFERENCES songs(id) ON DELETE CASCADE,
  provider TEXT NOT NULL,                              -- 'youtube'
  external_id TEXT NOT NULL,                           -- video ID
  is_primary INTEGER NOT NULL DEFAULT 0,
  match_state TEXT NOT NULL CHECK (match_state IN ('confirmed','candidate','rejected')),
  match_score REAL, embeddable INTEGER,
  created_at TEXT NOT NULL,
  UNIQUE (provider, external_id, song_id)
);
CREATE UNIQUE INDEX song_links_one_primary ON song_links(song_id, provider) WHERE is_primary = 1;

CREATE TABLE provider_records (                        -- raw provider payloads, cache, and expiry (4.2)
  id TEXT PRIMARY KEY,
  provider TEXT NOT NULL, kind TEXT NOT NULL, external_id TEXT NOT NULL,
  payload_json TEXT, fetched_at TEXT NOT NULL, expires_at TEXT,
  UNIQUE (provider, kind, external_id)
);

CREATE TABLE decks (
  id TEXT PRIMARY KEY, name TEXT NOT NULL, description TEXT,
  visibility TEXT NOT NULL DEFAULT 'private' CHECK (visibility IN ('private','link','public')),  -- only 'private' is enforced in the MVP
  source_provider TEXT, source_playlist_id TEXT, imported_at TEXT,
  created_at TEXT NOT NULL, updated_at TEXT NOT NULL
);
CREATE TABLE deck_entries (                            -- each playlist occurrence is a distinct entry; songs are reusable
  id TEXT PRIMARY KEY,
  deck_id TEXT NOT NULL REFERENCES decks(id) ON DELETE CASCADE,
  song_id TEXT NOT NULL REFERENCES songs(id),
  position INTEGER NOT NULL,                           -- ordered occurrence; duplicates are allowed
  notes TEXT, source_item_id TEXT, source_video_id TEXT, added_at TEXT NOT NULL
);
CREATE INDEX deck_entries_pos ON deck_entries(deck_id, position);

CREATE TABLE import_jobs (
  id TEXT PRIMARY KEY, provider TEXT NOT NULL, source_ref TEXT NOT NULL, deck_id TEXT REFERENCES decks(id),
  status TEXT NOT NULL CHECK (status IN ('running','done','failed','cancelled')),
  total INTEGER, matched INTEGER, needs_review INTEGER, unavailable INTEGER, error TEXT, created_at TEXT NOT NULL
);
CREATE TABLE import_items (                            -- the review queue
  id TEXT PRIMARY KEY, job_id TEXT NOT NULL REFERENCES import_jobs(id) ON DELETE CASCADE,
  position INTEGER NOT NULL, video_id TEXT NOT NULL,
  state TEXT NOT NULL CHECK (state IN ('pending','matched','needs_review','unmatched','unavailable','resolved')),
  parsed_artist TEXT, parsed_title TEXT,               -- transient: cleared when the provider record expires
  candidates_json TEXT, chosen_song_id TEXT REFERENCES songs(id)
);

CREATE TABLE matches (                                 -- game
  id TEXT PRIMARY KEY, ruleset_id TEXT NOT NULL, ruleset_version TEXT NOT NULL, seed INTEGER NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('active','ended','abandoned')), created_at TEXT NOT NULL, ended_at TEXT
);
CREATE TABLE match_events (                            -- source of truth for a match; replayable
  id TEXT PRIMARY KEY, match_id TEXT NOT NULL REFERENCES matches(id) ON DELETE CASCADE,
  seq INTEGER NOT NULL, type TEXT NOT NULL, payload_json TEXT NOT NULL, created_at TEXT NOT NULL,
  UNIQUE (match_id, seq)
);

CREATE TABLE quota_usage (day_pt TEXT PRIMARY KEY, units INTEGER NOT NULL);   -- YouTube quota day is Pacific time
CREATE TABLE settings (key TEXT PRIMARY KEY, value_json TEXT NOT NULL, updated_at TEXT NOT NULL);
```

Duplicate rule (`services/identify.js`): before creating a song, look up an existing one by `mbid_recording`, then `isrc`, then normalized artist and title with duration within 3 seconds. A match adds a `song_links` row to the existing song, never a second song.

---

## 7. Identification pipeline (YouTube video to song)

### 7.1 Parse

`parseVideo({title, channel})` returns `{artist, title, confidence}`:

1. Strip noise from the title: `(Official Video)`, `[HD]`, `(Lyrics)`, `Official Audio`, `(Remastered ...)` and similar, case-insensitive.
2. If the channel ends in ` - Topic`, then artist is the channel minus the suffix and title is the cleaned video title (high confidence).
3. If the title matches `^(.+?)\s[-–—]\s(.+)$`, then artist is group 1 and title is group 2.
4. Otherwise title is the whole cleaned title and artist is the channel name minus `VEVO` / `Official` (low confidence).
5. Split `feat.` / `ft.` / `featuring` into a separate credit, so it does not pollute the title.

### 7.2 Match

1. Query MusicBrainz recording search with `recording:"<title>" AND artist:"<artist>"`, `limit=5`, `fmt=json`.
2. Score each candidate: `score = 0.5*titleSim + 0.3*artistSim + 0.2*durationScore`.
   - `titleSim` and `artistSim` are normalized-Levenshtein similarity after lowercasing, stripping diacritics and punctuation, and removing bracketed suffixes.
   - `durationScore` is 1 if the YouTube and MusicBrainz lengths differ by 3 seconds or less, falls linearly to 0 at 15 seconds, and is 0.5 when either length is missing.
3. Thresholds (tunable constants in one file): **0.85 or more** is `matched` (auto-accepted, flagged "auto" in the UI); **0.60 to 0.85** is `needs_review` with the top 3 candidates stored; **below 0.60** is `unmatched`.
4. For an accepted match, do the recording lookup (`inc=artist-credits+releases+isrcs+genres+tags`) and write: `songs` canonical fields, ISRC, `release_year` (earliest release date), genres (top 3 by vote count), and the release MBID for artwork.
5. Fetch artwork from Cover Art Archive by release MBID. On 404, fall back to the video thumbnail.

### 7.3 Throttling

All MusicBrainz calls go through one queue at **at most 1 request per second**, with the User-Agent `CheckTheVibe/<version> (<contact from Settings>)`. Retry with backoff on 503. Identification runs in the background with progress events; the UI never blocks on it.

---

## 8. Playback

### 8.1 Embed hosting (the top technical risk, see M1)

YouTube embeds may refuse to play (including a player configuration error, code 153) when the host page has no valid origin or Referer. A page loaded from `file://` in Electron has neither. Therefore:

- The main process runs a **loopback HTTP server** (`127.0.0.1`, random free port) that serves the renderer files, and the window loads `http://127.0.0.1:<port>/`.
- The player is created with `origin: location.origin`, `enablejsapi: 1`, `playsinline: 1`.
- `webPreferences.autoplayPolicy = 'no-user-gesture-required'`.
- CSP: `default-src 'self'; script-src 'self' https://www.youtube.com; frame-src https://www.youtube.com https://www.youtube-nocookie.com; img-src 'self' data: https://i.ytimg.com https://coverartarchive.org https://*.archive.org; connect-src 'self'; style-src 'self' 'unsafe-inline'`. M1 confirms the exact list needed.
- The player must stay visible and not be hidden or covered, and must meet YouTube's current minimum embed size (verify during M1).

If the spike shows loopback hosting does not work, the fallback (record in `docs/decisions.md`) is a registered privileged custom scheme with an explicit `Referer` header via `session.webRequest.onBeforeSendHeaders`, then a `BrowserView` pointed at a hosted player page.

### 8.2 Playback interface

```js
// renderer/lib/player.js; the only place that touches YT.Player
// load(songLink, { start?, end? }), play(), pause(), seek(s), on('state' | 'ended' | 'error', handler)
```

Map YouTube player errors to user-facing states: video not found or private (100), embedding disabled (101, 150), player configuration error (153), invalid parameter (2), HTML5 error (5). An unplayable video shows an "Open in YouTube" button (allow-listed external open), marks `song_links.embeddable = 0`, and the queue skips to the next playable item.

---

## 9. Security and platform

1. `contextIsolation: true`, `sandbox: true`, `nodeIntegration: false`. The preload exposes only named methods on `window.ctv`. No generic `invoke(channel)` passthrough.
2. Every IPC handler validates its payload with `zod` and returns `{ ok: true, data }` or `{ ok: false, error: { code, message } }`.
3. `setWindowOpenHandler` denies by default and allows `shell.openExternal` only for `https://www.youtube.com/` and `https://youtu.be/` URLs. `will-navigate` is blocked for anything but the content-server origin.
4. **Secrets:** API keys and OAuth tokens are encrypted with Electron `safeStorage` into `userData/secrets.json`, using its asynchronous API and checking encryption availability before storing anything. If secure storage is unavailable, do not silently fall back to plaintext; explain the limitation and leave the secret unset. The renderer can **set** a secret and ask whether one **exists**, but can never read one. Secrets never appear in logs, the database, fixtures or error messages (redact on the way out).
5. Escape all external text in the UI (`textContent`, never `innerHTML`).
6. **Quota:** a client-side counter (`quota_usage`) records estimated units for each YouTube call (list calls 1, search 100; write cost to be confirmed during M10, historically 50). Warn at 80% of the daily limit and refuse non-essential calls at 100%. Unit costs are config, not constants.
7. **Data location:** `app.getPath('userData')` holds `ctv.db`, `secrets.json`, `backups/`. Nothing is written to the install directory.

---

## 10. Game: "Vibe Check" ruleset v0

A small, testable deck-building game built only on data the app reliably has. All numbers live in `game/rulesets/vibe-check.json` so they can be tuned without code changes.

### 10.1 Card view for scoring

Frozen at match start into the event log, so replays are deterministic even if attributes change later:

```
card = { songId, energy: 1-5 | null, tags: Set<string> (genres + moods + user tags, lowercase), year: int | null, durationMs }
```

### 10.2 Setup

- 2 to 6 players, one computer (hot-seat). Each player picks one of their decks.
- **Deck validity:** `size >= handSize + rounds - 1`; repeated songs are valid distinct entries and count toward deck size. Warn for cards with no usable attributes ("blank cards score 0 but can be played").
- Defaults: `handSize = 5`, `rounds = 6`, `judging = 'automatic'` (or `'host'`).
- **Opening song:** choose one random song occurrence from a separate shared opening-song pool assembled from the chosen decks. It initializes the **Crowd Vibe**: `{ energy, tags (up to tagMemory), level = 5 }`. It is not drawn from, removed from, or consumed out of any player's deck; all player deck entries remain available for normal draws and plays. The opening selection is a match-only reference and never mutates saved decks.
- Each player draws `handSize` cards from their shuffled deck. The RNG is seeded, and the seed is stored.

### 10.3 Round

Seats play in order, rotating the starting seat each round. Each player plays one card, then draws back up to `handSize`. **Every play in a round is scored against the Crowd Vibe as it stood at the start of the round**, so play order does not change scores.

Scoring for one play (components that need a missing attribute are skipped, and unknown data is never a penalty):

| Component | Condition | Player Reputation | Crowd Vibe level |
|---|---|---|---|
| **STYLE** | card shares at least 1 tag with the vibe tags | +2 | none |
| **FLOW** | both energies known and `abs(card.energy - vibe.energy) <= 1` | +1 | +1 |
| **CURVEBALL** | no shared tag, both tag sets non-empty, and FLOW applies (a contrast that still flows) | +3 | none |
| **CHAOS** | no shared tag, both energies known, and `abs(delta) >= 3` | -1 | -1 |
| **SAVE** | vibe level at the start of the round is 3 or less, and the play earned STYLE or FLOW | +2 | +1 more |

Round end:

1. Sum Player Reputation per player. Sum Crowd Vibe level changes and clamp the level to 0 to 10.
2. **Round winner** is the highest-scoring play (ties go to the earlier seat). If `judging = 'host'`, the host instead picks one play as the **Judge's Pick**: that player gets +3 and the pick is the round winner.
3. **Retarget the Crowd Vibe** toward the winner: energy moves 1 step toward the winner's energy (or becomes it if the vibe energy is unknown); if the winner's energy is unknown, preserve the current vibe energy. Tags become the winner's tags followed by the previous tags, de-duplicated, capped at `tagMemory = 6`.

Match ends after `rounds` rounds. The highest Player Reputation wins; ties are shared. **Crowd Vibe (shared atmosphere) and Player Reputation (individual score) are tracked separately**, as the design doc requires.

### 10.4 Engine contract

```js
// game/engine.js: pure, no I/O, no Date, no Math.random
reduce(state, action) -> newState        // never mutates its input
// actions: START_MATCH {seed, ruleset, players, cardSnapshots} | PLAY_CARD {playerId, songId}
//          | JUDGE_PICK {songId} | NEXT_ROUND | END_MATCH
```

Every accepted action is appended to `match_events`; the current state is always `events.reduce(reduce, initial)`. An illegal action (wrong player, card not in hand, wrong phase) returns the unchanged state plus an error, and is not logged. This event-log design is also what will let a future phone/party layer drive the same engine.

### 10.5 Playing music in a match

When a card is played, the player plays a clip (default 30 seconds, from the video start or an optional per-entry start time). Playback never gates scoring. Cards with no playable video still score. A "Skip audio" switch exists for testing.

### 10.6 After the match

"Save played songs as a deck" creates a deck of every song played, in order.

---

## 11. IPC surface (preload `window.ctv`)

| Group | Methods |
|---|---|
| `library` | `listSongs(query)`, `getSong(id)`, `createSong(data)`, `updateSong(id, patch)`, `setUserAttribute(id, attribute, value)`, `setUserTags(id, kind, values)`, `search(q)` |
| `decks` | `list()`, `get(id)`, `create(data)`, `update(id, patch)`, `duplicate(id)`, `delete(id)`, `addSong(deckId, songId)`, `removeEntry(entryId)`, `reorder(deckId, entryIds)` |
| `import` | `youtubePlaylist.start(urlOrId)`, `progress` (event), `listReview(jobId)`, `resolveReview(itemId, choice)`, `pasteList(text)` |
| `identify` | `retry(songId)`, `searchCandidates(songId, text)`, `accept(songId, mbid)` |
| `features` | `refresh(songIds)`, `providers.list()`, `providers.set(id, {enabled, priority})` |
| `player` | `getEmbedOrigin()` (the loopback origin the page already has; the player runs in the renderer) |
| `youtube` | `export.start(deckId)`, `auth.begin()`, `auth.status()`, `auth.signOut()`, `quota()` |
| `game` | `rulesets()`, `validateDeck(deckId, rulesetId)`, `start(config)`, `dispatch(matchId, action)`, `getState(matchId)`, `replay(matchId)`, `saveAsDeck(matchId)` |
| `settings` | `get(key)`, `set(key, value)`, `setSecret(name, value)`, `hasSecret(name)` |
| `data` | `exportJson()`, `importJson(file)`, `backupNow()` |

---

## 12. Milestones and acceptance tests

Each lists what to build and the tests that must pass. "Human" marks a check the builder cannot run.

**M0: Skeleton and secure shell.** Electron app with the section 9 security settings, the loopback content server, preload bridge with one `ping`, SQLite connection, migration runner with `0001_init.sql` (all of section 6), `CTV_PROVIDER_MODE`, Node test scripts, Playwright configured for Electron E2E, Electron Forge configured for an unpacked smoke build, and the initial `docs/MAINTENANCE.md`, `docs/TEST_RECORD.md` and `docs/decisions.md`. Create these three docs now with current state and explicit NOT RUN entries; never invent test results.
- Tests: all tables and indexes exist; foreign keys enforced; migrations apply once and are idempotent; a SQLite-aware pre-migration backup is written and can be restored; the renderer cannot access `require` or `process`; an IPC call with an invalid payload returns `{ok:false}`; Playwright can launch and close the app; an unpacked Forge build can be produced.

**M1: YouTube embed spike (feasibility).** A throwaway screen that loads the IFrame API and plays one known embeddable video by ID, with the section 8.1 hosting. Test in development and then in the unpacked Forge build to ensure packaging does not change origin/player behavior; also test one private video ID and one embedding-disabled video ID.
- Tests: the player reaches the playing state in dev and in the unpacked Forge build; the error handler maps each known error code to the right message. Record the outcome and final CSP/hosting decision in `docs/decisions.md`. Clean-Windows installer and installed-app playback checks remain M11 human acceptance tests.

**M2: Data-provider spike (feasibility and terms).** For each candidate in section 5, make real calls (or record BLOCKED if there is no network) with 10 well-known tracks, and record in `docs/decisions.md`: lookup keys supported (ISRC, MBID, name), fields returned, hit rate, rate limits, key/pricing, and a link to the terms with a note on whether non-commercial hobby use is allowed. Save recorded responses as fixtures. Choose the default priority order and implement the `Provider` interface plus the working adapters (at least one; none are required to pass for the app to be usable).
- Tests: each adapter parses its recorded fixture into `Features` and returns `null` on a miss; the chain fills attributes in priority order; one failing provider does not block the others; no secret appears in fixtures. **If no provider can be looked up without Spotify IDs or violates its terms, ship with the chain empty and user-set stats only; do not use a Spotify route.**

**M3: Library and decks (no network).** Manual add/edit songs, user tags, user energy and BPM (with tap tempo), deck CRUD, add a song to multiple decks, reorder, duplicate, list view and card-grid view over the same data, search/sort/filter, `songs_fts`.
- Tests: a song in two decks is one library row; the same song can occur multiple times in one deck as distinct entries; removing one occurrence or removing it from one deck leaves other occurrences, other decks and the library intact; reorder renumbers entries correctly and survives restart; switching views keeps the same selection and sort; FTS returns results for title, artist and tag; user attribute wins over any provider row.

**M4: Identification (MusicBrainz and Cover Art Archive) and pasted lists.** The throttled client, `parseVideo`, scoring, thresholds, duplicate rule, artwork, the review UI, and "paste an Artist – Title list" as an import source.
- Tests (fixture mode): table-driven parser cases (Topic channel, "Artist - Title", brackets, feat., no separator); scoring thresholds route to matched / needs_review / unmatched; the request queue never exceeds 1/second (fake clock); the same recording from two videos yields one song with two links; a 404 on artwork falls back without error; the User-Agent header is always set.

**M5: YouTube playlist import.** Settings field for the user's API key (stored via `safeStorage`), playlist URL/ID parsing, paging, `videos.list` batching (50 per call) for duration, embeddable and availability, deck creation preserving order and source IDs, unavailable/private/deleted items recorded in the job summary, quota counter, expiry service (4.2).
- Tests (fixtures): a 120-item playlist imports in order across pages; repeated occurrences of the same song remain separate deck entries in the original positions; unavailable items are counted and listed but create no deck entries; re-importing the same playlist offers update/new-deck without duplicating song records or collapsing repeated entries; the quota counter increments by the configured costs; expired provider payloads are purged and a refresh is attempted when within 5 days of expiry; the API key never appears in logs. **Human:** one real public-playlist import with the user's key.

**M6: Playback.** Player component, play song / play deck, queue with next/previous, per-entry clip start, unavailable-video handling and "Open in YouTube".
- Tests: queue advances on `ended`; an unplayable video is skipped and marked; player state events update the UI; the player stays visible and at a valid size. Verify playback in development mode here; packaged/installed playback is verified in M11.

**M7: Enrichment and card stats.** Run the feature chain after identification (background, resumable), show per-value provenance on cards ("you", "estimate", "?" with a tooltip naming the source), refresh action, provider settings.
- Tests: precedence (user over provider over unknown); unknown renders as "?" and is never zero; energy 0 to 1 maps to 1 to 5 correctly at the boundaries (0, 0.2, 0.21, 1); changing provider priority changes resolved values without a refetch; a user edit survives a refresh.

**M8: Game engine (no UI).** `engine.js`, `rng.js`, the v0 ruleset, deck validation, and `match_events` persistence.
- Tests: table-driven scoring covering every component and every missing-data combination; round order-independence (the same plays in any seat order give the same scores); determinism (same seed and actions give an identical final state); replay of the event log equals the live final state; the engine never mutates its input (freeze and assert); illegal actions are rejected and not logged; tie handling; the vibe level clamps at 0 and 10; deck validation rejects a deck smaller than `handSize + rounds - 1`.

**M9: Game UI (hot-seat).** Setup (players, decks, judging mode, rounds), table (Crowd Vibe panel, scoreboard, hand, play area, clip playback, round results with component badges, host judging control), end screen, replay from the event log, save-played-as-deck.
- Tests (Playwright E2E in fixture mode; Playwright was installed/configured in M0): a full 2-player match completes and the winner is correct; closing and reopening mid-match restores the state from the log; host mode requires a Judge's Pick before the round resolves; the saved deck contains the played songs in play order; a card with no playable video still scores.

**M10: Export to a YouTube playlist.** OAuth installed-app flow (loopback redirect, PKCE) using the user's own OAuth client ID, minimal scope, refresh token in `safeStorage`, match-review step for songs with no confirmed video, create playlist, add videos in deck order, store the resulting playlist ID, quota handling.
- Tests (mocked): the PKCE challenge and state are validated; a failed add-item leaves a resumable job and no duplicate playlist; videos are added in deck order; songs without a confirmed video are listed for review and not exported silently; sign-out deletes the token. **Human:** a real export with the user's Google account. Note for the user: an OAuth app left in "Testing" status can have short-lived refresh tokens and a limited test-user list, so verify the current Google rules at this milestone.

**M11: Final packaging, backup and installed-app verification.** Build the Electron Forge Windows installer (with auto-unpack for the native SQLite module), complete JSON export/import of the whole library (songs, tags, attributes, links, decks, entries; secrets excluded), and run Playwright smoke tests for the main flows against the packaged app where practical.
- Tests: export then import into an empty database gives an identical library, including repeated deck entries and their order; importing a newer-schema file is rejected clearly; the installer builds; the installed app launches with no network and shows the library; user data lives under `%APPDATA%`, not the install directory. **Human:** run the installer on a clean Windows machine and confirm playback through the packaged YouTube player.

---

## 13. Non-goals (do NOT build in the MVP)

- Phones, room codes, QR joining, host-display mode, any networking between players (the engine's event log is the future hook).
- Physical or printable cards, booster or draft formats, audience, group-vote or live-chat judging.
- Local-file playback, Apple Music, iTunes Search, Spotify (never), SoundCloud.
- Sharing, link or public decks (the `visibility` column exists but only `private` is enforced).
- Accounts, cloud sync, telemetry, auto-update, code signing.
- Local audio-file analysis, downloading/caching YouTube audio, and in-app signal processing or feature extraction. External metadata/feature services are allowed when their terms and lookup methods pass M2; the app stores returned values with provenance and does not analyze audio itself.
- Scoring categories DEEP CUT and any scoring that needs BPM or popularity data.
- A deck marketplace or card economy.

---

## 14. Differences from design-doc.md (v0.7.2) and resolved open items

| Item | Resolution |
|---|---|
| Storage: JSON files (design §7.1, §7.3) | **Approved: SQLite via `better-sqlite3` is the internal source of truth.** JSON is used for portable import/export and user-initiated backup/restore. |
| Phase 1 scope (design §11) | Split into milestones M3 to M7. Import is not first: a manual library and decks come before network features, and the embed spike comes first. |
| Metadata sources, §18 priority 1 | Section 4. Audio features are chosen by the M2 spike. |
| First import flow, §18 priority 2 | Sections 6 and 7 and M4/M5. |
| Session hosting, §18 priority 3 | Local hot-seat only. Party and phone sessions are deferred. |
| Match loop, §18 priority 4 | Section 10. |
| First judging format, §18 priority 5 | Automatic evaluation, with an optional host Judge's Pick. |
| Physical play, §18 priority 6 | Deferred. |
| Scoring data dependence | Ruleset v0 scores tags and energy only. Year and duration are retained in card snapshots but are not scoring inputs. Duration remains available for future transition/pacing compatibility work; it is not discarded from the product model. BPM is displayed but not scored. |
| Account-free use | Kept. The only credentials are the user's own optional Google keys. |
| Naming | "Pass the Aux" is not used anywhere. |

Still open (decide with evidence, not in advance): which external feature provider, if any, becomes default (M2); the real YouTube write-quota cost and OAuth rules (M10); tuning the section 10 point values after a few real matches (tunables are in the ruleset file). M1 verifies the hosting approach in development and an unpacked Forge build before later milestones depend on it.

---

## 15. Definition of done for the whole MVP

- All M0 to M11 acceptance tests pass, or any BLOCKED check is documented and explicitly accepted by the user.
- `README.md` documents setup (`npm ci`, how to add a Google API key, run commands, how to run each test suite and fixture vs live mode).
- A new developer can clone the repo, run all non-human tests offline, and start the app in dev mode using only the README.
- `docs/MAINTENANCE.md` lists accepted versions, what was built, what was deferred and every deviation from this spec; `docs/TEST_RECORD.md` holds the latest PASS, FAIL, BLOCKED and NOT RUN results.
- Every milestone candidate has a Git tag and a recorded acceptance status.
- The S11 milestone document exists and has been tested for reconstruction in a fresh session.
