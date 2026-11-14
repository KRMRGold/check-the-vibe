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

## M2 current investigation — expanded provider discovery

- Milestone: M2 — Data-provider spike
- App version remains 0.1.0; research only, no M2 code candidate has been created.
- Required 10-track live coverage tests have not been run for any provider.
- **MeloData: CANDIDATE — NOT RUN.** Free account/API key; 1,000 lookups/month, 25 bulk rows/month, 10 rows/job, 5 req/s and 100 req/min, no credit card. Native API supports title+artist resolution and ISRC feature lookup. Docs identify iTunes/Deezer preview analysis with Essentia and an AcousticBrainz archive source; no Spotify feature-data source is documented. Terms permit use, storage and caching of factual feature data in applications. Needs 10-track test and provenance confirmation.
- **Last.fm: CANDIDATE — NOT RUN.** Free API key; track top-tags endpoint accepts artist+track or MBID. API terms restrict data use to non-commercial purposes; use requires caching and attribution. Suitable only as optional community tag source, not BPM.
- **MusicBrainz: EXISTING SOURCE.** Recording genre/tag metadata is already in the spec. No additional adapter required; use as baseline and measure tag coverage during provider tests.
- **Wikidata: CANDIDATE — NOT RUN.** CC0 structured data includes P1725 (numeric BPM) and P1558 (qualitative tempo marking). Property existence does not prove per-track coverage; test 10-track coverage before implementing.
- **GetSongBPM: CANDIDATE — NOT RUN.** Free API but requires API key and mandatory backlink; 3,000 requests/hour. No key/backlink configured.
- **AcousticBrainz: NOT RUN.** CC0, MBID-indexed, frozen in 2022; API remains available. MeloData incorporates an archive subset. Direct API coverage has not been measured.
- **Audiometa: EXCLUDED PENDING PROVENANCE.** Free API with BPM/key/genres, but catalog explicitly includes Spotify platform data and the BPM provenance is unclear. Do not use without confirmation that the fields consumed are independent of Spotify and Spotify-derived data.
- **ReccoBeats: EXCLUDED** because its terms disclose Spotify-derived core track metadata.
- **SoundStat and Soundcharts: EXCLUDED** under the no-paid-services constraint.
- No provider adapter or provider-chain implementation has been added yet.

M2 remains in investigation. Next required evidence is a 10-track live test of MeloData, plus a separate tag-coverage check for Last.fm if selected. Record exact inputs, identity match confidence, returned fields/nulls, source markers, quotas, terms and any Spotify derivation. Do not claim a hit rate or select a default until calls have actually been made.

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
