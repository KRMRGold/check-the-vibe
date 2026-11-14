# Maintenance

## Current state

- Project: Check the Vibe
- App version: 0.0.1
- Current milestone: M0 — Skeleton and secure shell
- Milestone status: M0 accepted by the user on 2026-11-14; acceptance tag pending
- Tested commit: `c583b2efd3dbfcb3b49638aa0c599f791bfcb5c2`
- Current branch: main
- Database schema: migration 0001
- Provider mode: fixture by default; live mode is explicit

## Implemented in M0

- Electron main process and isolated renderer
- Loopback HTTP content server bound to 127.0.0.1 on a random available port
- Explicit preload bridge exposing only app.ping
- Zod validation and structured IPC responses
- SQLite connection with foreign keys and WAL enabled
- Initial schema migration and SQLite-aware pre-migration backup
- Node unit tests and Playwright Electron E2E test
- Electron Forge unpacked package configuration with native-module auto-unpack
- Initial dark desktop shell

## Verification

- Unit tests: 4 passed, 0 failed.
- Electron E2E: 1 passed; renderer isolation and invalid IPC behavior verified.
- Windows x64 unpacked Forge package: produced successfully.
- Packaged executable: manually launched successfully (user-confirmed).
- Full evidence and command summaries: docs/TEST_RECORD.md.

M0 was explicitly accepted by the user on 2026-11-14. The acceptance tag should point to the tested candidate commit recorded in docs/TEST_RECORD.md. M1 may now begin.

## Deferred

All milestones M1–M11 remain unstarted. Do not implement later milestone features before M0 acceptance.

## Operational notes

- Install dependencies from the repository root.
- Use `npm run test:unit` for SQLite and migration tests.
- Use `npm run test:e2e` for the Electron/Playwright smoke test.
- Use `npm run package:smoke` for the unpacked Forge package.
- User data is stored under Electron's userData directory; CTV_TEST_USER_DATA is a test-only override.
- Never copy only the SQLite main file while WAL is active; use the SQLite backup API.
- Commit package-lock.json after the first npm install so dependency installs are reproducible.
