# Maintenance

## Current state

- Project: Check the Vibe
- App version: 0.1.0 (M0–M3 accepted)
- Current milestone: M4 — Identification and pasted lists
- Milestone status: M0–M3 accepted; M1 private-video and embedding-disabled-video checks explicitly deferred; M2 accepted with no external feature provider selected and an empty-by-default provider chain
- M0 tested commit: `c583b2efd3dbfcb3b49638aa0c599f791bfcb5c2`
- M0 acceptance tag: `m0-v0.0.1` (pushed; verified to target the tested M0 commit)
- Current branch: main
- Database schema: migrations 0001–0003
- Provider mode: fixture by default; live mode is explicit

## Accepted milestones

### M0 — Skeleton and secure shell

Accepted by the user on 2026-11-14.

- Electron main process and isolated renderer
- Loopback HTTP content server bound to 127.0.0.1 on a random available port
- Explicit preload bridge exposing only app.ping
- Zod validation and structured IPC responses
- SQLite connection with foreign keys and WAL enabled
- Initial schema migration and SQLite-aware pre-migration backup
- Node unit tests and Playwright Electron E2E test
- Electron Forge unpacked package configuration with native-module auto-unpack
- Initial dark desktop shell

Verification: 4 unit tests passed, 1 Electron E2E test passed, Windows x64 unpacked package produced and manually launched. Full evidence is in docs/TEST_RECORD.md.

## M1 — YouTube embed feasibility

Accepted by the user on 2026-11-14 with the private-video and embedding-disabled-video checks explicitly deferred. These two checks remain untested and are not represented as passes.

Implemented temporary spike behavior: loads the YouTube IFrame API from the existing loopback-hosted renderer, accepts a video ID, and exposes explicit Play/Pause controls. It displays the page origin, player states, and error messages.

Verified by user report:
- Development playback reaches PLAYING.
- `npm run test:unit` passes.
- `npm run test:e2e` passes.
- `npm run package:smoke` produces the unpacked Forge package.
- Playback reaches PLAYING in the unpacked Forge package.

Decision: retain the existing loopback HTTP hosting and CSP. The successful development and unpacked-package playback paths did not demonstrate a need to change them. Full evidence and the accepted limitation are in docs/TEST_RECORD.md.

## M2 — Data-provider spike

### Local metadata cache and federation direction

The user clarified the intended data lifecycle: playlist songs are enriched from the configured online sources, then their reusable metadata is stored locally. The cache grows from songs users actually add; users do not need to download a complete multi-gigabyte dataset.

A future federation layer may share eligible provider-sourced metadata records between installations. For a later installation, the intended lookup order is local cache, then federation if enabled and reachable, then the original providers. Metadata is reusable independently of deck membership. Federation is not playlist sharing: playlist membership, listening history, private notes, account data, and user-authored values are not shared by default.

Original provider provenance, source identifiers, retrieval time, confidence/match information, applicable license/attribution, and expiry must survive caching and peer transfer. Peer-supplied records are untrusted and require validation. Federation must not redistribute data or extend retention beyond what the original source permits.

This is an architectural direction only. Federation topology, discovery/rendezvous, transport, consent controls, integrity/trust, conflict resolution, and abuse controls remain undecided. No federation code, provider adapter, or dataset importer has been implemented. The user accepted M2 on 2026-11-14 with the provider chain left empty by default: the app will rely on user-entered attributes until a future provider is separately justified. MusicBrainz canonical data remains a promising identity reference but is not an implemented feature provider. The FMA 10-track baseline found 0/10 matches; its parser and positive-control path were verified, but FMA was not selected as a provider. The AcousticBrainz high-level sample archive was downloaded locally and its SHA-256 checksum verified; its contents, MBID coverage, duplicate submissions and feature quality were not inspected. AcousticBrainz is deferred as an optional future candidate, not a dependency or selected provider.


M2 provider research was revised on 2026-11-14 around a multi-provider, attribute-specific model. No provider is selected as a universal default and no provider adapter exists.

Current capability direction:
- **MusicBrainz static core data:** promising identity/recording/release catalog. Core data is CC0, but tags/genres/ratings/annotations are supplementary CC BY-NC-SA 3.0. The live API is rate-limited and is not an approved route under the current no-quota constraint. The PostgreSQL core dump is about 7 GB compressed; JSON entity dumps are available but some are several GB.
- **AcousticBrainz static data:** promising optional BPM/key/rhythm/danceability and high-level descriptors, CC0, indexed by recording MBID, but frozen at 2022-07-06. The high-level 100k sample is about 85 MB; the low-level sample is about 2 GB. No AcousticBrainz data has been downloaded.
- **FMA metadata:** supplemental genres/tags, CC BY 4.0, 106,574 tracks in the 2017 dataset. The local 10-track comparison found 0 exact matches, 0 title-only candidates, and 10 no matches. A separate positive control using `Kurt Vile — Freeway`, copied from the local archive, returned 1 exact single match. This validates the tested parser/matcher path against that known row; it does not establish broad catalog coverage or prove the other ten inputs are absent.
- **MTG-Jamendo metadata:** about 55k tracks with genre/instrument/mood-theme tags; metadata files are small, but the metadata is CC BY-NC-SA 4.0 and the dataset is restricted to non-commercial research/academic use. Conditional candidate only; no download or test has been performed.
- **ListenBrainz:** public CC0 listening-history dumps are huge and describe listen events rather than canonical song facts; not part of the metadata chain.
- **Discogs:** excluded pending express permission because the official Terms of Service prohibit downloading/copying and harvesting without it.
- **Apple iTunes Search API, MusicBrainz live API, and Wikidata Query Service:** excluded from provider calls under the current no-quota constraint. Existing design references to these services are superseded for metadata enrichment.

Other exclusions remain: MeloData (user-rejected), Last.fm (key/usage controls and non-commercial terms), GetSongBPM (quota and backlink), ReccoBeats (Spotify-derived), Audiometa (Spotify provenance not established), SoundStat/Soundcharts (paid), and FMAK annotations (Spotify URI mappings).

The user also downloaded the 85 MB AcousticBrainz high-level sample archive under `data/cache/acousticbrainz/`; its SHA-256 checksum was verified locally. The archive has not been extracted or inspected, and no coverage claim is made. The low-level archive was not downloaded. No provider adapters, dataset importers, live provider calls, or federation code have been implemented.


## M3 — Library and decks (accepted)

M3 was implemented and accepted on `main`. The manual local song library is implemented: add/edit, user tags, BPM and energy, SQLite persistence, FTS-backed search, title/artist/recent sorting, and list/card-grid views. The user ran the library candidate on Windows: **28/28 unit tests and 1/1 Electron E2E test passed** after the tag-order regression fix (commit `fc89000`). The current M3 candidate adds deck CRUD, deck descriptions, reusable library songs as deck entries, duplicate occurrences, occurrence removal, deterministic reordering, and a renderer workflow for creating/editing/deleting decks and adding/removing/reordering tracks. The existing `decks` and `deck_entries` tables from migration 0001 are reused; no migration is required. Seven deck unit tests cover CRUD, duplicate occurrences, cross-deck reuse, removal isolation, position compaction, reorder validation/persistence across database reopen, and deck deletion preserving library songs. The Electron E2E test now exercises deck creation, duplicate adds, reorder, and removal. First Windows run: **35/35 unit tests passed**; E2E exposed a broad final assertion selector matching both library and deck content. The selector was scoped to `#song-list .song-title` in commit `def8f79`. The user reran `npm test` on Windows: **35/35 unit tests passed and 1/1 Electron E2E test passed**. Deck management is implemented and verified. The remaining library UX slice is implemented on `main`: tap-tempo BPM entry; tag, BPM-range and energy-range filters; and sorting by date added, BPM and energy in addition to title, artist and recently updated. The filter controls are presentation-side over the current search result set; unknown BPM/energy values do not pass an active numeric range. Genre-specific sorting is deferred until genre has a distinct data model rather than treating arbitrary user tags as genres. The tap-tempo helper and expanded library sorting have unit coverage, and the Electron E2E scenario exercises tap tempo, filtering, energy filtering, and list/grid preservation. The user ran `npm test` on Windows on 2026-11-14: **39/39 unit tests passed and 1/1 Electron E2E test passed**. **M3 accepted by the user on 2026-11-14** after the verified run of 39/39 unit tests and 1/1 Electron E2E test. Keep this milestone offline-first; it was not blocked on metadata providers.

## M4 — Identification and pasted lists (design refinement)

M4 direction accepted by the user on 2026-11-14:
- Accept pasted Artist — Title rows as an import source independent of YouTube playlist import; preserve each original line and its order.
- Use the locally available MusicBrainz Canonical Data snapshot for identity matching. Do not call the live MusicBrainz Web Service under the accepted no-quota constraint.
- Reuse the user's existing comparison utility as the matching reference: one streaming pass over the local canonical CSV per pasted batch, with bounded in-memory candidate tracking. Do not extract the CSV or build/require a full-catalog index.
- Return deterministic ranked recording candidates with match evidence. Auto-confirm only high-confidence unambiguous matches; send uncertain or conflicting results to review.
- Resolve recording redirects before deduplicating recording candidates; preserve release associations separately and resolve release redirects without collapsing releases into recordings. Keep pasted source text, catalog-derived canonical fields, and user corrections distinct. Record the snapshot timestamp and provenance. Treat `combined_lookup` as unverified until validated and do not use dataset `score` as match confidence.
- Cover Art Archive remains a separate artwork source keyed by release MBID. Its retrieval, caching, attribution, and redistribution boundaries must be verified before implementation.
- YouTube video parsing and video-to-recording matching belong to M5 playlist import, not this M4 pasted-list slice.
- `src/main/musicbrainz/canonical-archive.js` uses native `node:zlib` Zstandard decompression and bounded-buffer TAR parsing. It lists members and streams one selected regular-file member without extracting it.
- The user verified `npm run test:unit`: 46 passed, 0 failed; `npm run test:zstd-electron`: Electron embedded Node 24.22.2 native Zstandard stream PASS. Those results predate the PAX/GNU extension support added after the actual snapshot exposed an unsupported TAR extension.
- The real snapshot listing attempt failed because its TAR contains an extension record. The reader now interprets PAX local/global path metadata and GNU long-name records, with a 1 MiB metadata safety limit. New synthetic tests cover UTF-8 PAX paths and GNU long names for both listing and selected-member streaming. These changes are not yet user-verified; rerun unit and Electron smoke tests, then retry listing the actual archive. Full snapshot compatibility and matcher consumption remain unverified.

Schema inspection confirms `songs.mbid_recording` is unique but there is no release-MBID association table; `songs.album` cannot represent multiple releases. `import_items.video_id` is NOT NULL, so the current import-item table cannot store pasted-list rows as-is. Choose and test a small migration that supports multiple release associations and pasted source occurrences before implementing M4 persistence; do not overwrite source lines with corrected or catalog-derived text.

M5–M11 remain deferred. Do not implement later milestone features before their prerequisites are accepted.

## M4 paste matching and persistence

- Paste jobs remain in `running` state after staging; malformed source lines remain retained as unmatched rows.
- `createPasteImportMatchingRepository()` streams the staged valid rows through the canonical archive matcher and persists the snapshot ID, per-row match evidence, candidate recording metadata, release metadata, and recording-to-release associations.
- Only a single exact canonical recording match is automatically marked `matched` and stored in `matched_recording_mbid`. Fuzzy, multiple-exact, and title-only results remain `needs_review`; no-match and malformed rows remain `unmatched`.
- Canonical identity matching is deliberately separate from library song creation. Matching never creates a row in `songs` or sets `chosen_song_id`. The source `artist_mbids` field remains verbatim in each item's candidate evidence; `artist_mbids_json` stays null until the dump's encoding is verified.
- Migration 0003 adds `import_jobs.snapshot_id` and `import_items.matched_recording_mbid`.
- The main-process IPC offers a native file picker for the local `.zst` snapshot; the renderer-facing preload method is `ctv.library.matchPaste({ id })`. The review/confirmation UI is not implemented yet.
- A failed match leaves staged item states and candidate data untouched and marks the job failed so it can be retried. Completed jobs cannot be processed again.
- The archive wrapper still decompresses the TAR three times for a full match. Do not run a full 7.7 GB snapshot match until archive traversal is optimized; fixture-based processing tests are the next verification step.

## Operational notes

- Install dependencies from the repository root.
- Use `npm run test:unit` for SQLite, migration, and deterministic helper tests.
- Use `npm run test:e2e` for the Electron/Playwright smoke test.
- Use `npm run package:smoke` for the unpacked Forge package.
- User data is stored under Electron's userData directory; CTV_TEST_USER_DATA is a test-only override.
- Never copy only the SQLite main file while WAL is active; use the SQLite backup API.
- A package-lock.json has not yet been committed; reproducible dependency installation remains an operational follow-up.

### FMA local comparison utility

- Status: IMPLEMENTED AND EXECUTED LOCALLY; research result recorded, provider not selected.
- Dataset archive was downloaded and extracted by the user under `data/cache/fma_metadata/`; ZIP integrity was checked locally.
- Inputs: `tracks.csv` and `genres.csv` only. Excluded: `echonest.csv`, `features.csv`, audio files and live APIs.
- Parser correction: the actual archive uses a three-row grouped/pandas header. The third row contains `track_id` in the first column, and subsequent rows contain the numeric track IDs. The parser now recognizes that index-name row and starts data at row four.
- User ran `node --test test/unit/fma-metadata.test.js`: **8 tests passed, 0 failed**, including a regression fixture for the actual three-row header shape and the bounded streaming reader.
- User inspected the first ten non-empty track records with `npm run compare:fma -- --data-dir data/cache/fma_metadata --inspect-rows 10`. Track IDs were populated (e.g. `Food — AWOL` ID `2`, `Freeway — Kurt Vile` ID `10`, `Street Music — AWOL` ID `134`); genre values were also parsed.
- The original 10-track comparison remains **0 exact, 0 title-only, 10 no match**. With the corrected header handling, the parser reports **106,574 data rows**; the earlier 106,575 count included the index-name row mistakenly treated as data.
- Positive control: user ran `npm run compare:fma -- --data-dir data/cache/fma_metadata --sample data/samples/fma-positive-control.json --output results/fma-positive-control-result.json`. The sample uses the exact `Kurt Vile — Freeway` row from the local archive. Result: **106,574 rows read; 1 exact single match; 0 title-only candidates; 0 no match**.
- Interpretation: the known-row positive control validates the tested parser and strict exact-title-plus-artist matcher end to end for this row. It does not establish broad FMA coverage or prove the original ten inputs are absent. Their original wording and uncertainty notes remain unchanged.


## M4 paste-import foundation

- Pasted Artist — Title imports reuse `import_jobs` and `import_items` with `provider = 'paste'`; YouTube imports remain distinguishable by provider and keep their existing video identifiers.
- Migration `0002_paste_imports_and_musicbrainz.sql` makes `video_id` nullable, preserves existing import rows, and adds `source_line` and `parse_error` so original input and malformed lines are retained in order.
- Canonical MusicBrainz recordings, releases, and their many-to-many associations have separate tables. A recording can retain multiple release associations; release groups are not treated as releases.
- `library.importPaste({ text })` is exposed through the validated IPC/preload boundary. The parser accepts em dash, en dash, or a spaced hyphen between artist and title; it caps batches at 500 lines and individual lines at 1,000 characters. Blank and malformed lines are retained as unmatched items with parse-error codes; valid lines are staged as pending.
- `src/main/musicbrainz/csv-stream.js` provides streaming CSV parsing with UTF-8-safe chunk decoding.
- `src/main/musicbrainz/canonical-matcher.js` is a separate, testable streaming matcher for the canonical CSV and both redirect CSVs. It preserves the local comparison rules: NFKD normalization, padded artist trigrams, Python `SequenceMatcher`-compatible ratios with autojunk disabled, and thresholds of artist 0.72, title 0.62, and geometric combined 0.74.
- Exact normalized artist/title matches take priority. Recording redirects are applied before candidate deduplication; release redirects are resolved separately; distinct releases remain associated with one canonical recording. Fuzzy suggestions are limited to the top five returned candidates; exact and title-only identity counts are based on deduplicated canonical recording IDs.
- `matchCanonicalStreams()` accepts three readable streams for fixture testing. `matchCanonicalArchive()` discovers the three CSV members and streams them directly from the Zstandard/TAR archive without extracting or buffering the full files.
- The archive convenience wrapper currently opens each selected member independently, so a full archive match traverses/decompresses the archive three times. This is bounded-memory but intentionally not yet performance-optimized; consolidate the catalog and redirect reads into fewer archive passes before treating a full-snapshot run as production-ready.
- The matcher is connected to backend paste-import job processing and database persistence. Review/confirmation UI and subsequent library song creation are not implemented yet. Paste jobs remain running after staging and complete only after matching finishes.
