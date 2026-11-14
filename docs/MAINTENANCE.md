# Maintenance

## Current state

- Project: Check the Vibe
- App version: 0.0.1
- Current milestone: M0 — Skeleton and secure shell
- Milestone status: implementation candidate committed; acceptance pending local verification
- Current branch: main
- Database schema: migration 0001
- Provider mode: fixture by default; live mode is explicit

## Implemented in M0 candidate

- Electron main process and isolated renderer
- Loopback HTTP content server bound to 127.0.0.1 on a random available port
- Explicit preload bridge exposing only app.ping
- Zod validation and structured IPC responses
- SQLite connection with foreign keys and WAL enabled
- Initial schema migration and SQLite-aware pre-migration backup
- Node test runner and Playwright Electron E2E configuration
- Electron Forge unpacked package configuration with native-module auto-unpack
- Initial dark desktop shell

## Not yet accepted

M0 is not accepted until every acceptance check in build-spec.md §12 has evidence recorded in TEST_RECORD.md. This commit has not been executed on the user's Windows machine.

## Deferred

All milestones M1–M11 remain unstarted. Do not implement later milestone features before M0 acceptance.

## Operational notes

- Install dependencies from the repository root.
- Use npm run test:unit for SQLite and migration tests.
- Use npm run test:e2e for the Electron/Playwright smoke test.
- Use npm run package:smoke for the unpacked Forge package.
- User data is stored under Electron's userData directory; CTV_TEST_USER_DATA is a test-only override.
- Never copy only the SQLite main file while WAL is active; use the SQLite backup API.
- Generate and commit package-lock.json after the first npm install.
