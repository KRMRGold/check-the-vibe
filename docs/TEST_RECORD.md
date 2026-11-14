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
| MusicBrainz static core / JSON dumps | Recording, artist, release identity, ISRCs and relationships | Core data CC0; supplementary tags/genres/ratings/annotations CC BY-NC-SA 3.0. Full PostgreSQL core dump approximately 7 GB compressed; JSON entity dumps available, some several GB. Live API is limited to one request/second and is excluded under the no-quota rule. | RESEARCHED; NOT DOWNLOADED OR TESTED |
| AcousticBrainz static archive | Precomputed BPM, key/scale, rhythm, danceability and high-level descriptors; join by recording MBID | CC0; frozen at 2022-07-06. 29,460,584 submissions, about 7.56m unique recordings. 100k-item sample: high-level about 85 MB, low-level about 2 GB. Duplicate submissions need an explicit selection policy. | RESEARCHED; NOT DOWNLOADED OR TESTED |
| FMA metadata | Supplemental genres and tags | CC BY 4.0; 106,574 tracks; 342 MiB compressed; 2017 dataset. Use tracks.csv and genres.csv only; exclude echonest.csv, features.csv and audio. | LOCAL COMPARISON EXECUTED; 0/10 MATCHES |
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
- Unit result: **PASS — 6 tests, 0 failures**.
- Dataset result: **PASS — comparison completed**; 106,575 data rows read; 0 exact single matches; 0 multiple exact matches; 0 title-only candidates; 10 no matches.
- Runtime note: the streaming implementation completed without the prior Node.js out-of-memory failure.
- The user supplied the generated `results/fma-comparison.json`. All ten entries have `matchStatus: no_match` and empty match arrays. Original user-entered titles and uncertainty notes are preserved.
- Interpretation: the strict matcher found no matches for this fixed sample in this FMA snapshot. This is not proof that FMA contains no useful metadata or that the parser is correct for all real archive rows. A positive-control test against a known FMA row remains required.
- No fuzzy matching was introduced and no uncertain input title was silently corrected.

### Remaining verification

| Check | Status | Evidence / next action |
|---|---|---|
| FMA parser unit tests | PASS | 6/6 tests passed on the user's machine |
| FMA 10-track strict comparison | PASS | 106,575 rows; 0 exact; 0 title-only; 10 no match |
| FMA positive-control match | NOT RUN | Test a known row from the actual local archive against the matcher |
| AcousticBrainz MBID coverage | NOT RUN | First establish recording MBIDs, then test sample coverage and duplicate submissions |
| MusicBrainz static import feasibility | NOT RUN | Evaluate a bounded JSON entity subset or compact index before considering the 7 GB PostgreSQL core dump |
| MTG-Jamendo metadata comparison | NOT RUN | Requires an explicit decision that the non-commercial ShareAlike license is compatible |
| Provider chain / adapter behavior | NOT RUN | No provider adapter code exists |
| Federation | NOT RUN | Design direction only; no network or exchange code exists |

Research sources:
- MusicBrainz dumps and licensing: https://musicbrainz.org/doc/MusicBrainz_Database/Download
- MusicBrainz JSON dumps: https://musicbrainz.org/doc/Development/JSON_Data_Dumps
- MetaBrainz dataset details: https://metabrainz.org/datasets/postgres-dumps
- MusicBrainz API rate limit: https://musicbrainz.org/doc/MusicBrainz_API/Rate_Limiting
- AcousticBrainz downloads: https://acousticbrainz.org/download
- FMA dataset: https://github.com/mdeff/fma
- FMA metadata rights: https://www.loc.gov/resource/gdcdatasets.2018655052_gdcfma-metadata/
- MTG-Jamendo dataset: https://github.com/MTG/mtg-jamendo-dataset
- Discogs Terms of Service: https://support.discogs.com/hc/en-us/articles/360009334333-Terms-of-Service
- ListenBrainz dumps: https://metabrainz.org/datasets/postgres-dumps
- Apple iTunes Search API: https://performance-partners.apple.com/search-api

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
- No 2 GB dataset has been downloaded. The user's clarification means this size is not inherently prohibitive, but a bulk download is not required by the playlist-driven cache model.
- No new test is marked PASS. M2's fixed 10-recording provider coverage comparison remains NOT RUN.

### FMA comparison utility — execution record

- Status: IMPLEMENTED AND EXECUTED LOCALLY; no provider selected.
- User downloaded/extracted the official FMA metadata archive locally; ZIP integrity check passed.
- The utility reads only `tracks.csv` and `genres.csv`; it excludes `echonest.csv`, `features.csv`, audio files and live APIs.
- User ran `node --test test/unit/fma-metadata.test.js`: 6 passed, 0 failed.
- User ran `npm run compare:fma -- --data-dir data/cache/fma_metadata`: 106,575 rows read; 0 exact matches; 0 title-only candidates; 10 no matches.
- The streaming implementation completed without the earlier out-of-memory error.
- The user supplied the resulting JSON; all ten entries were `no_match`, with empty match arrays. Uncertain input wording remains unchanged.
- Positive-control validation against a known row from the actual archive remains NOT RUN.
