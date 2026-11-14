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

## M2 current investigation — revised for non-quota static datasets

- Milestone: M2 — Data-provider spike
- App version remains 0.1.0; research only, no M2 code candidate has been created.
- User selected a multi-provider approach and rejected MeloData.
- No live provider API calls or 10-track coverage tests have been run.
- **AcousticBrainz static archive: CANDIDATE — NOT RUN.** CC0, indexed by MusicBrainz recording MBID, frozen at 2022-07-06; 29,460,584 submissions across approximately 7.56 million unique recordings. The official API is rate-limited (typically 10 requests per 10 seconds per IP) and is excluded. Static JSON/CSV dumps exist; the 100,000-item low-level JSON sample is listed at 2 GB. A practical local subset/import method and coverage test remain unverified.
- **FMA metadata: CANDIDATE — NOT RUN.** Static metadata for 106,574 tracks; archive listed at 342 MiB compressed. Metadata license is CC BY 4.0 and attribution is required. Candidate fields include track metadata, genres and tags. Do not use `echonest.csv` because it contains Echo Nest features associated with Spotify. Track matching to MusicBrainz records is not established.
- **MusicBrainz: EXISTING SOURCE.** Continue using the existing identity and genre/tag integration. Include its tag coverage in the 10-track comparison; do not add a duplicate adapter.
- **Wikidata: EXCLUDED FROM LIVE TESTING.** P1725 (numerical BPM) and P1558 (qualitative tempo) exist, but the public Query Service has processing-time and throttling limits. A full static dump is not justified; only reconsider if a small relevant static extract is identified.
- **FMAK: EXCLUDED.** The 5,489-track key/mode dataset includes Spotify URI mappings. Do not use any part of it under the no-Spotify-in-any-form project boundary.
- **MeloData: REJECTED BY USER.** Do not use or reintroduce.
- **Last.fm: EXCLUDED.** Requires an API key, has usage controls, and its API terms limit use to non-commercial purposes.
- **GetSongBPM: EXCLUDED.** Quota-limited API (3,000 requests/hour) and mandatory backlink.
- **Audiometa: EXCLUDED PENDING PROVENANCE.** Spotify-derived field independence is not established.
- **ReccoBeats: EXCLUDED** because of Spotify-derived core metadata.
- **SoundStat / Soundcharts: EXCLUDED** as paid services.

### M2 verification status

| Check | Status | Evidence / blocker |
|---|---|---|
| Provider shortlist reviewed against no-paid/no-quota/no-Spotify constraints | PASS | Research and provider terms/docs reviewed; see links below |
| AcousticBrainz static dataset 10-track coverage | NOT RUN | No practical low-level sample/subset selected or downloaded |
| FMA metadata 10-track coverage | NOT RUN | Metadata archive not downloaded; no track-match test |
| MusicBrainz 10-track baseline coverage | NOT RUN | No fixed 10-track sample has been evaluated |
| Provider field provenance and licensing | PARTIAL | Dataset license/source notes inspected; exact per-field import/attribution design remains to be verified |
| Adapter parsing, chain order, provider-failure isolation | NOT RUN | No adapter code exists |
| Secret leakage check | NOT RUN | No provider credentials or code added |

No hit rate is claimed. No provider is selected as a default. Next evidence needed: a fixed 10-recording sample, a practical local dataset subset, exact field-level coverage, match confidence, duplicate handling, and attribution notes.

Research sources:
- AcousticBrainz API limits: https://acousticbrainz.readthedocs.io/api.html
- AcousticBrainz CC0 archive and statistics: https://acousticbrainz.org/
- AcousticBrainz static dumps and sample sizes: https://acousticbrainz.org/download
- FMA dataset metadata and licensing: https://github.com/stellaywong/fma_keys
- FMAK dataset details (excluded due Spotify URI mappings): https://zenodo.org/records/10719860
- Wikidata Query Service constraints: https://www.mediawiki.org/wiki/Wikidata_query_service/Implementation


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

### FMA comparison utility scaffold

- Status: IMPLEMENTED; EXECUTION NOT RUN IN THIS environment.
- Added dependency-free parser/comparison utility and Node built-in unit tests.
- Intended data inputs: FMA `tracks.csv` and `genres.csv` only.
- Explicit exclusions: `echonest.csv`, `features.csv`, all audio files, live APIs.
- Sample: first ten user-provided entries, preserving uncertain titles verbatim.
- Dataset download, checksum verification, CSV schema against the actual archive, and 10-track coverage: NOT RUN. The previous attempt to download from this execution environment failed due host DNS/network resolution.
- Required local checks after the user downloads/extracts the archive:
  - `node --test test/unit/fma-metadata.test.js`
  - `npm run compare:fma -- --data-dir <folder-containing-tracks.csv-and-genres.csv>`
- Do not mark dataset coverage as PASS until the output is inspected and the archive's license/attribution file is checked.
