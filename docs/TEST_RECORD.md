## M1 accepted candidate

- Milestone: M1 — YouTube embed feasibility
- App version: 0.1.0
- Tested implementation commit: `9defaf6244e512df28bd79d5fb28a13183a2739c`
- Development playback evidence update: `a58cbf3fb1ef401a5bac1b7d6e436f607695163c`
- Environment: Windows x64, Node.js 24.15.0, npm 11.13.0 (last reported by user; reconfirm if changed)
- Acceptance: user accepted M1 on 2026-11-14, explicitly deferring the private-video and embedding-disabled-video checks.

### M1 results

| Check | Status | Command / method | Evidence |
|---|---|---|---|
| YouTube error-code mapping (2, 5, 100, 101, 150, 153) | PASS | `npm run test:unit` | User confirmed the requested unit-test command passed on the M1 candidate; individual test count/output not supplied |
| YouTube API script loads in development | PASS | `npm start` | User observed `IFrame API ready` in the event log on the M1 candidate |
| Player reaches PLAYING in development | PASS | Load `M7lc1UVf-VE`, then press Play | User reported the video loaded and played; event log showed `UNSTARTED (-1)`, `BUFFERING (3)`, `PLAYING (1)`, then `PAUSED (2)` |
| Private video behavior | NOT RUN — accepted limitation | Load a verified private video ID | User explicitly chose not to create/use a private-video fixture; deferred |
| Embedding-disabled video behavior | NOT RUN — accepted limitation | Load a verified embedding-disabled video ID | User explicitly deferred this test |
| Electron E2E tests | PASS | `npm run test:e2e` | User confirmed the requested command passed; exact count/output not supplied |
| Unpacked Forge package builds | PASS | `npm run package:smoke` | User confirmed the requested command passed |
| Player reaches PLAYING in unpacked package | PASS | Launch packaged executable and repeat playback test | User confirmed playback works in the unpacked packaged app |
| Loopback hosting and current CSP positive path | PASS | Compare development and unpacked-package playback | Playback works in both environments without changing the existing host or CSP. Negative video cases remain unverified. |

The user accepted M1 with the two negative-case checks explicitly deferred. They are not recorded as passed. Keep the existing loopback HTTP origin and CSP; revisit if real playback failures demonstrate a need to change them.

## M2 current investigation — provider capability matrix

- Milestone: M2 — Data-provider feasibility research
- App version: 0.1.0; no M2 implementation candidate exists.
- User-selected direction: multiple complementary providers, with per-attribute enrichment and local reuse.
- Constraints: no Spotify or Spotify-derived data; no paid, quota-limited, or otherwise usage-limited provider services; no local audio analysis. Static third-party datasets may be evaluated if licensing and provenance are suitable.
- No provider is selected as a universal default. No provider adapter, dataset importer, live provider request, or federation code has been implemented.

### Capability research status

| Source | Candidate role | Access, license and constraints | Status |
|---|---|---|---|
| MusicBrainz JSON recording dump | Identity fields for standalone recordings only | User downloaded and checksum-verified the 34 MB compressed archive. Inspector read 157,994 records: ID/title/artist credit 100%; duration 72.62%; ISRC 5.76%. Official definition: standalone recordings are not linked to a release, so this is not the main catalog. Core matching fields are CC0; supplementary annotations/tags/genres/ratings are CC BY-NC-SA 3.0. | INSPECTED LOCALLY; LIMITED SCOPE |
| MusicBrainz release JSON dump | Main catalog route for release-associated tracks/recordings | Snapshot index lists release.tar.xz at 22 GB compressed, above the project's approximate 2 GB static-cache comfort range. Not downloaded. | SIZE VERIFIED; NOT DOWNLOADED |
| MusicBrainz Canonical Data dump | Canonical recording/release identity and artist+title matching | CC0; zstd-compressed TAR archive. Snapshot `musicbrainz-canonical-dump-20261103-080003.tar.zst`; user-reported compressed size 2.3G. SHA-256 verified against the published sidecar: `42769d7c669cced9b7b805b70223f174b8f384a648efd0d471abfce28635708c`. Archive inspection confirmed five members: `TIMESTAMP`, `COPYING`, `canonical/canonical_musicbrainz_data.csv` (7,729,129,612 bytes), `canonical/canonical_recording_redirect.csv`, and `canonical/canonical_release_redirect.csv`. Follow-up inspection verified the redirect CSV headers: recording redirects contain `recording_mbid,canonical_recording_mbid,canonical_release_mbid`; release redirects contain `release_mbid,canonical_release_mbid,release_group_mbid`. A small recording-redirect sample showed multiple source recording MBIDs mapping to one canonical recording MBID. Redirect files were present in the archive; the earlier three-member note was incorrect. CSV header matches the documented ten fields: id, artist_credit_id, artist_mbids, artist_credit_name, release_mbid, release_name, recording_mbid, recording_name, combined_lookup, score. Full streaming scan read 32,442,553 rows without extracting the CSV to disk. Strict normalized artist+title comparison against `data/samples/fma-sample-10.json`: 8 exact single matches, 0 multiple exact matches, 0 title-only candidates, and 2 no matches. Result JSON saved locally at `data/cache/musicbrainz-canonical/canonical-sample-comparison.json` (local cache; not committed). This verifies strong coverage for this small sample, not general catalog completeness. Upstream example's historical ~23M-row note is superseded by the verified current snapshot count. Canonical MBIDs may change between snapshots; canonicalization intentionally collapses versions. | ARCHIVE CHECKSUM + STRUCTURE + FULL SAMPLE COMPARISON VERIFIED; STRONG CANDIDATE |
| AcousticBrainz static archive | Precomputed BPM, key/scale, rhythm, danceability and high-level descriptors; join by recording MBID | CC0; frozen at 2022-07-06. 29,460,584 submissions across 30 archives, about 7.56m unique recordings. Duplicate submissions exist; a 100k-item sample is available. Coverage depends on obtaining MBIDs for user tracks. | RESEARCHED; NOT DOWNLOADED OR TESTED |
| FMA metadata | Supplemental genres and tags | CC BY 4.0; 106,574 tracks; 342 MiB compressed; 2017 dataset. Use tracks.csv and genres.csv only; exclude echonest.csv, features.csv and audio. | LOCAL COMPARISON + POSITIVE CONTROL EXECUTED; 1/1 POSITIVE CONTROL |
| MTG-Jamendo metadata | Genre, instrument and mood/theme tags | About 55k tracks; metadata files are small. Metadata CC BY-NC-SA 4.0; dataset restricted to non-commercial research/academic use. | CONDITIONAL CANDIDATE; NOT DOWNLOADED OR TESTED |
| ListenBrainz dumps | Listening events / possible future popularity research | CC0, but hundreds of millions of listens; user listening-history data, not canonical song metadata. | NOT IN METADATA PROVIDER CHAIN |
| Discogs | Release/edition catalog in principle | Official Terms of Service prohibit downloading/copying and harvesting absent express written consent. | EXCLUDED PENDING EXPRESS PERMISSION |

Other exclusions: MeloData (user-rejected), Last.fm (key/usage controls and non-commercial terms), GetSongBPM (quota/backlink), ReccoBeats (Spotify-derived), Audiometa (Spotify provenance not established), SoundStat/Soundcharts (paid), FMAK annotations (Spotify URI mappings), Apple iTunes Search API (approximately 20 calls/minute), and live MusicBrainz/Wikidata query services under the no-quota constraint.

### FMA comparison execution

- Local archive: downloaded and extracted by the user under `data/cache/fma_metadata/`; ZIP integrity was checked locally.
- Candidate implementation: streaming, dependency-free Node.js parser/comparison utility.
- Exact command: `npm run compare:fma -- --data-dir data/cache/fma_metadata`
- Unit command: `node --test test/unit/fma-metadata.test.js`
- Environment: user's Windows x64 environment; exact Node/npm versions were not included in this run output.
- Unit result after the three-row pandas header/index parser fix: **PASS — 8 tests, 0 failures**.
- Original sample result: **PASS — comparison completed**; 106,574 data rows read; 0 exact single matches; 0 multiple exact matches; 0 title-only candidates; 10 no matches. The corrected parser recognizes the third-row `track_id` index label, so the previous 106,575 count had included that header row.
- Runtime note: the streaming implementation completed without the prior Node.js out-of-memory failure.
- The user supplied the generated `results/fma-comparison.json`. All ten entries have `matchStatus: no_match` and empty match arrays. Original user-entered titles and uncertainty notes are preserved.
- Parser regression: the user inspected real archive rows after the fix; track IDs populated correctly (e.g. `Freeway — Kurt Vile`, ID `10`), and the genre column parsed. The eight unit tests include a three-row grouped-header fixture matching the archive's structure.
- Positive control: the user ran `npm run compare:fma -- --data-dir data/cache/fma_metadata --sample data/samples/fma-positive-control.json --output results/fma-positive-control-result.json`. The one-record sample (`Kurt Vile — Freeway`) returned **1 exact single match, 0 title-only candidates, 0 no match**, after reading 106,574 data rows.
- Interpretation: the known-row positive control validates the tested parser and strict exact-title-plus-artist matcher end to end for that row. The original ten-record sample still has no matches; this does not prove FMA lacks useful coverage or that those recordings are absent from every FMA release/snapshot.
- No fuzzy matching was introduced and no uncertain input title was silently corrected.

### Remaining verification

| Check | Status | Evidence / next action |
|---|---|---|
| FMA parser unit tests | PASS | 8/8 tests passed on the user's machine, including the real three-row header shape |
| FMA 10-track strict comparison | PASS | 106,575 rows; 0 exact; 0 title-only; 10 no match |
| FMA positive-control match | PASS | `Kurt Vile — Freeway` from the local archive returned one exact match; 106,574 rows read |
| AcousticBrainz MBID coverage | NOT RUN — ACCEPTED DEFERRAL | High-level sample archive downloaded and checksum-verified locally; archive contents, MBID coverage and duplicate submissions were not inspected. AcousticBrainz remains an optional candidate, not an MVP dependency. |
| MusicBrainz recording dump inspection | PASS | User verified SHA-256; inspector read 157,994 standalone recordings; 9/9 inspector tests passed. Sample: 1 exact, 1 title-only candidate, 8 no match; sample is not representative. |
| MusicBrainz full catalog feasibility | PASS — STATIC SAMPLE COMPARISON COMPLETE | Canonical archive SHA-256 verified; archive members inspected; canonical CSV size verified at 7,729,129,612 bytes; streaming scan read 32,442,553 rows; existing 10-track sample returned 8 exact single matches, 0 duplicate exact matches, 0 title-only candidates, and 2 no matches. No extraction to disk or app importer was needed. The separate release JSON archive remains 22 GB compressed and was not downloaded. |
| MTG-Jamendo metadata comparison | NOT RUN | Requires an explicit decision that the non-commercial ShareAlike license is compatible |
| Provider chain / adapter behavior | NOT IMPLEMENTED — ACCEPTED M2 EXIT | User accepted M2 with no external feature provider selected and an empty-by-default provider chain. User-entered attributes remain available; provider work can resume as a separate future decision. |
| Federation | NOT RUN | Design direction only; no network or exchange code exists |

Research sources:
- MusicBrainz dumps and licensing: https://musicbrainz.org/doc/MusicBrainz_Database/Download
- MusicBrainz JSON dumps: https://musicbrainz.org/doc/Development/JSON_Data_Dumps
- MusicBrainz standalone recording definition: https://musicbrainz.org/doc/Standalone_Recording
- MetaBrainz canonical data dumps: https://metabrainz.org/datasets/derived-dumps
- Canonical MusicBrainz schema and field definitions: https://musicbrainz.org/doc/Canonical_MusicBrainz_data
- Canonical dump archive index: https://ftp.musicbrainz.org/pub/musicbrainz/canonical_data/
- Approved canonical snapshot archive: https://ftp.musicbrainz.org/pub/musicbrainz/canonical_data/musicbrainz-canonical-dump-20261103-080003/musicbrainz-canonical-dump-20261103-080003.tar.zst
- Canonical snapshot SHA-256 sidecar: https://ftp.musicbrainz.org/pub/musicbrainz/canonical_data/musicbrainz-canonical-dump-20261103-080003/musicbrainz-canonical-dump-20261103-080003.tar.zst.sha256
- Canonical dump example (historical ~23M-row note): https://github.com/metabrainz/canonical-data-example
- MusicBrainz release dump snapshot index: https://data.metabrainz.org/pub/musicbrainz/data/json-dumps/20261111-001001/
- MetaBrainz dataset details: https://metabrainz.org/datasets/postgres-dumps
- MusicBrainz API rate limit: https://musicbrainz.org/doc/MusicBrainz_API/Rate_Limiting
- AcousticBrainz downloads: https://acousticbrainz.org/download
- FMA dataset: https://github.com/mdeff/fma
- FMA metadata rights: https://www.loc.gov/resource/gdcdatasets.2018655052_gdcfma-metadata/
- MTG-Jamendo dataset: https://github.com/MTG/mtg-jamendo-dataset
- Discogs Terms of Service: https://support.discogs.com/hc/en-us/articles/360009334333-Terms-of-Service
- ListenBrainz dumps: https://metabrainz.org/datasets/postgres-dumps
- Apple iTunes Search API: https://performance-partners.apple.com/search-api

## M4 native Zstandard/TAR reader — extension support implemented; verification pending
- Implemented on `main` in `src/main/musicbrainz/canonical-archive.js`: native `node:zlib` Zstandard decompression, bounded-memory TAR parsing, member listing, and `openZstdTarMember(archivePath, memberName)` for streaming one selected regular-file member without extracting it.
- The user verified `npm run test:unit`: **46 passed, 0 failed**. The user verified `npm run test:zstd-electron`: **PASS — Electron embedded Node 24.22.2 native Zstandard stream**. These results predate the PAX/GNU extension changes below.
- The user's actual archive listing exposed a TAR extension record that the initial reader rejected. The reader now supports PAX local/global path metadata and GNU long-name records, including UTF-8 paths; extension metadata is capped at 1 MiB. Two new synthetic tests cover PAX and GNU long-name listing plus selected-member streaming.
- The updated extension support and its new tests have **not yet been run by the user**. The actual snapshot has not yet been successfully listed through this reader; full archive compatibility and end-to-end matcher consumption remain unverified.
- The selected-member stream is tested against a synthetic compressed TAR. Full canonical snapshot compatibility and end-to-end matcher consumption are not yet verified. PAX/GNU long-name TAR extensions remain unsupported pending confirmation they are absent from the supplied archive.
- Next step: consume the canonical CSV member through the existing streaming CSV parser and port the local canonical matcher, preserving redirect resolution and bounded candidate memory.

## M0 accepted evidence

- Tested commit: `c583b2efd3dbfcb3b49638aa0c599f791bfcb5c2`
- Acceptance tag: `m0-v0.0.1`; pushed tag verified to target the tested commit.
- Environment: Windows x64, Node.js 24.15.0, npm 11.13.0, Git 2.49.0.windows.1
- Test execution: 2026-11-14 (user-reported local results)

| Check | Status | Command / method | Evidence |
|---|---|---|---|
| Required tables and indexes exist | PASS | `npm run test:unit` | `schema creates required tables and indexes` passed |
| Foreign keys enforced | PASS | `npm run test:unit` | `foreign keys are enabled and enforced` passed |
| Migrations apply once and are idempotent | PASS | `npm run test:unit` | `migrations apply once and are idempotent` passed |
| SQLite-aware pre-migration backup restores | PASS | `npm run test:unit` | `SQLite-aware pre-migration backup can be restored` passed |
| Renderer cannot access require or process | PASS | `npm run test:e2e` | E2E assertion returned both globals as `undefined` |
| Invalid IPC payload returns ok:false | PASS | `npm run test:e2e` | E2E assertion confirmed `INVALID_PAYLOAD` |
| Playwright launches and closes Electron | PASS | `npm run test:e2e` | 1 test passed; Electron closed in test cleanup |
| Unpacked Forge build produced | PASS | `npm run package:smoke` | Forge packaged Windows x64 successfully |
| Packaged application launches | PASS | Manually launched `out/Check the Vibe-win32-x64/Check the Vibe.exe` | User confirmed the packaged application launches |

## Rule

Only record PASS when supported by exact command output or direct user-confirmed evidence. Record failures and environment blockers honestly.


### Local metadata cache / federation architecture note

- Status: DESIGN DIRECTION RECORDED — NOT IMPLEMENTED.
- Playlist-driven provider enrichment and local persistence are the intended source of reusable metadata records.
- Future federation may distribute eligible provider-sourced metadata records; it must not share private playlist membership, listening history, notes, account data, or user-authored values by default.
- No federation transport, peer discovery, cache exchange, provider adapter, or dataset importer has been implemented or tested.
- The 2.3G compressed MusicBrainz Canonical Data archive has been downloaded and verified; its 7.73 GB CSV was streamed directly from the archive without extraction.
- M2's fixed 10-recording MusicBrainz Canonical Data coverage comparison is now complete: 8 exact single matches, 0 duplicate exact matches, 0 title-only candidates, and 2 no matches. This is sample-specific evidence, not a general coverage guarantee.

### FMA comparison utility — execution record

- Status: IMPLEMENTED, REGRESSION-TESTED, AND EXECUTED LOCALLY; no provider selected.
- User downloaded/extracted the official FMA metadata archive locally; ZIP integrity check passed.
- The utility reads only `tracks.csv` and `genres.csv`; it excludes `echonest.csv`, `features.csv`, audio files and live APIs.
- User ran `node --test test/unit/fma-metadata.test.js` after the parser correction: 8 passed, 0 failed.
- User ran `npm run compare:fma -- --data-dir data/cache/fma_metadata`: 106,574 data rows read; 0 exact matches; 0 title-only candidates; 10 no matches. The earlier 106,575 count included the third-row `track_id` index label.
- The streaming implementation completed without the earlier out-of-memory error.
- The user supplied the resulting JSON; all ten entries were `no_match`, with empty match arrays. Uncertain input wording remains unchanged.
- User ran the positive control using `data/samples/fma-positive-control.json` (`Kurt Vile — Freeway`): 106,574 rows read; 1 exact single match; 0 title-only candidates; 0 no match. The positive-control output JSON remains local and git-ignored.


## M2 accepted candidate — empty-by-default provider chain

- Acceptance: user accepted the M2 exit on 2026-11-14 and approved moving to M3.
- Decision: no external audio-feature provider is selected for the MVP at this point. The provider chain remains empty by default; the app must remain fully usable with user-entered attributes.
- MusicBrainz canonical data remains a promising static identity reference (8 exact single matches in the bounded ten-recording sample), but it is not a BPM/key/energy provider and no app integration was implemented.
- FMA metadata parser tests and the positive control passed, but the original ten-recording comparison returned no matches; FMA is not selected as an MVP provider.
- AcousticBrainz high-level sample: 85 MB archive downloaded to the user's local cache and SHA-256 verified. The archive was not extracted or inspected; MBID coverage, duplicate handling and feature quality remain NOT RUN. This is an accepted deferral, not a pass.
- No provider adapters, dataset importers, live provider calls or federation code exist. No claim is made that AcousticBrainz coverage is adequate.
- M3 may proceed offline-first without any provider implementation.


## M3 implementation — manual library and deck management

- Work is on `main`; no branch or PR workflow is used.
- Manual local song library: add/edit; user tags, BPM and energy; FTS-backed title/artist/tag search; recent/title/artist sorting; list and card-grid presentation; validated IPC; SQLite persistence.
- Deck management candidate: create/list/rename/delete decks; optional descriptions; add library songs to decks; allow repeated occurrences of the same song; remove one occurrence; reorder entries; browse and search library songs while viewing a deck.
- The existing schema supports this without a migration: `decks` owns deck metadata, while `deck_entries` stores independent occurrence IDs and positions.
- Seven unit tests and an extended Electron E2E scenario have been added for deck behavior.
- User ran the complete deck candidate on Windows: **35/35 unit tests passed and 1/1 Electron E2E test passed** after the selector correction.
- The first E2E attempt exposed a Playwright strict-mode selector collision; the assertion was scoped to `#song-list .song-title` and the complete rerun passed.
- Deck management implementation and tests are now verified. Remaining M3 scope: review any remaining library filtering and deck UX needs, complete milestone acceptance, and confirm any remaining M3 requirements.


## M3 remaining library UX — verified

- Implementation is on `main`; no branches or PRs.
- Added a renderer-side tap-tempo helper. It averages up to four recent tap intervals, resets after a pause longer than two seconds, and clamps the result to the supported 1–400 BPM input range. Manual BPM edits reset the tap sequence.
- Added library filters for tag substring, minimum/maximum BPM, and minimum/maximum user energy. Filtering is applied to the current search result set; unknown BPM/energy values are excluded when that numeric range is active.
- Added sorting by date added, BPM and energy. Unknown BPM/energy values sort last; date-added ties use row insertion order for deterministic output.
- Existing title, artist and recently-updated sorting remain.
- Genre-specific sorting is not implemented: the current schema has user tags but no distinct genre field. Do not mislabel arbitrary user tags as genres; revisit when genre metadata is introduced.
- Added 1 library repository sort test and 3 tap-tempo unit tests. Extended the Electron E2E test to exercise tap tempo, tag/BPM/energy filters, and switching list/grid views while filters remain active.
- User ran `git pull` followed by `npm test` on Windows on 2026-11-14.
- **Unit tests: 39 passed, 0 failed, 0 cancelled, 0 skipped.**
- **Electron E2E: 1 passed.**
- **Complete test command: PASS.** No failures were reported.
- **Status: IMPLEMENTED AND VERIFIED.** This verifies the current library UX slice; full M3 milestone acceptance remains a separate user decision.


### M3 milestone acceptance

- **Status: ACCEPTED by the user on 2026-11-14.**
- Acceptance evidence: user ran `npm test` after pulling the M3 library UX changes; 39 unit tests passed and 1 Electron E2E test passed.
- Acceptance applies to the M3 library and deck scope recorded above. It does not imply acceptance of deferred M4–M11 features.

## M3 deck management — verified

- Verified source: `main` at commit `155dc2d33ba0e3f23cef5b4947cf1fb95006f7de` (includes documentation of the passing rerun).
- Prior verified baseline: commit `fc89000`; user ran `npm test`: **28/28 unit tests passed and 1/1 Electron E2E test passed**. That result predates all deck changes.
- Schema inspection: migration `0001_init.sql` already defines `decks` and `deck_entries`. No schema change or migration was needed.
- Implemented: deck create/list/update/delete; deck descriptions; add/list/remove entries; duplicate song occurrences; one library song reusable across decks; validated full-order reordering; contiguous position compaction after removal; activity timestamp updates; deck management and contents UI.
- Persistence behavior: each deck entry has its own ID and position. Removing an entry or deleting a deck does not delete its library song. Deleting a deck cascades only to its entries.
- Added **7 unit tests** for deck CRUD, duplicate occurrences in one deck, reuse across decks, removing one occurrence, song preservation, position compaction, reorder validation, reorder persistence after database reopen, and deck deletion.
- Extended the Electron E2E test to create a deck, add the same song twice, add another song, reorder, remove one occurrence, and verify the song remains in the library.
- First Windows run (user-reported, candidate before selector fix): **35/35 unit tests passed; Electron E2E failed** at the final library assertion. The selector `.song-title` matched elements from both library and deck areas; the failure was a Playwright strict-mode violation, not a failed deck operation.
- Follow-up fix committed directly to `main` at `def8f79895b8a2d4cc1052b40a73bebc06cc0493`: scope the final assertion to `#song-list .song-title`.
- Second Windows run (user-reported after pulling the fix): **35/35 unit tests passed; 1/1 Electron E2E test passed** (`npm test`).
- **Status: IMPLEMENTED AND VERIFIED.** This verifies the current deck-management implementation and the tested user flows; it does not by itself mean the entire M3 milestone is accepted.
