# Test Record

## M1 current candidate

- Milestone: M1 — YouTube embed feasibility
- App version: 0.1.0
- Candidate implementation commit: `9defaf6244e512df28bd79d5fb28a13183a2739c` (M1 spike)
- Evidence update commit: `a58cbf3fb1ef401a5bac1b7d6e436f607695163c` (development playback evidence)
- Environment: Windows x64, Node.js 24.15.0, npm 11.13.0 (last reported by user; reconfirm if changed)
- Environment: Windows x64, Node.js 24.15.0, npm 11.13.0 (last reported by user; reconfirm if changed)

### M1 results

| Check | Status | Command / method | Evidence |
|---|---|---|---|
| YouTube error-code mapping (2, 5, 100, 101, 150, 153) | PASS | `npm run test:unit` | User confirmed the requested unit-test command passed on the M1 candidate; individual test count/output not supplied |
| YouTube API script loads in development | PASS | `npm start` | User observed `IFrame API ready` in the event log on M1 candidate commit `9defaf6244e512df28bd79d5fb28a13183a2739c` |
| Player reaches PLAYING in development | PASS | Load `M7lc1UVf-VE`, then press Play | User reported the video loaded and played; event log showed `UNSTARTED (-1)`, `BUFFERING (3)`, `PLAYING (1)`, then `PAUSED (2)` on candidate commit `9defaf6244e512df28bd79d5fb28a13183a2739c` |
| Private video behavior | NOT RUN | Load a verified private video ID | Fixture not yet selected; verify its current status |
| Embedding-disabled video behavior | NOT RUN | Load a verified embedding-disabled video ID | Fixture not yet selected; verify its current status |
| Unpacked Forge package builds | PASS | `npm run package:smoke` | User confirmed the requested package-smoke command passed |
| Player reaches PLAYING in unpacked package | PASS | Launch packaged executable and repeat playback test | User confirmed playback works in the unpacked packaged app |
| Final CSP/hosting decision | PROVISIONAL PASS | Compare development and unpacked-package playback using existing loopback hosting and CSP | Both environments played successfully; retain the existing CSP and loopback hosting for now. Negative-case video tests remain outstanding, so this is not the final M1 decision |

Additional M1 user report: the user confirmed `npm run test:unit`, `npm run test:e2e`, and `npm run package:smoke` passed, and confirmed that the packaged application plays the test video. Exact console output and individual test counts were not provided. Private-video and embedding-disabled-video cases were explicitly not included in this run.

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
