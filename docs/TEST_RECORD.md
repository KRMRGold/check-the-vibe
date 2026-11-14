# Test Record

## Current candidate

- Milestone: M0
- App version: 0.0.1
- Tested commit: `c583b2efd3dbfcb3b49638aa0c599f791bfcb5c2`
- Environment: Windows x64, Node.js 24.15.0, npm 11.13.0, Git 2.49.0.windows.1
- Test execution: 2026-11-14 (user-reported local results)

## Results

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

## Command summaries

- `npm run test:unit`: 4 tests, 4 passed, 0 failed.
- `npm run test:e2e`: 1 test passed.
- `npm run package:smoke`: packaging completed successfully for x64 on Windows.
- Packaged executable: launched successfully, confirmed by user.

## Status

All M0 acceptance checks listed in build-spec.md §12 have evidence recorded. Awaiting explicit user acceptance before tagging M0 or beginning M1.

## Rule

Only record PASS when supported by exact command output or direct user-confirmed evidence. Record failures and environment blockers honestly.
