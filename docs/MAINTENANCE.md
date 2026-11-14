# Maintenance

## Current state

- Project: Check the Vibe
- App version: 0.1.0 (M1 candidate in progress)
- Current milestone: M1 — YouTube embed feasibility
- Milestone status: M0 accepted; M1 implementation started, verification pending
- M0 tested commit: `c583b2efd3dbfcb3b49638aa0c599f791bfcb5c2`
- M0 acceptance tag: `m0-v0.0.1` (pushed; verified to target the tested M0 commit)
- Current branch: main
- Database schema: migration 0001
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

Implementation started. The temporary spike screen loads the YouTube IFrame API from the existing loopback-hosted renderer, accepts a video ID, and exposes explicit Play/Pause controls. It displays the page origin, player states, and error messages.

Not yet verified:
- Development playback reaches PLAYING.
- Unpacked Forge build playback reaches PLAYING.
- A known private video produces the expected unavailable/private behavior.
- A known embedding-disabled video produces the expected embed restriction behavior.
- Final CSP and hosting decision.

Do not mark M1 accepted until its checks in build-spec.md §12 have evidence and the user accepts the candidate.

## Deferred

M2–M11 remain unstarted. Do not implement later milestone features before M1 is accepted.

## Operational notes

- Install dependencies from the repository root.
- Use `npm run test:unit` for SQLite, migration, and deterministic helper tests.
- Use `npm run test:e2e` for the Electron/Playwright smoke test.
- Use `npm run package:smoke` for the unpacked Forge package.
- User data is stored under Electron's userData directory; CTV_TEST_USER_DATA is a test-only override.
- Never copy only the SQLite main file while WAL is active; use the SQLite backup API.
- A package-lock.json has not yet been committed; reproducible dependency installation remains an operational follow-up.
