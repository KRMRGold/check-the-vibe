# Maintenance

## Current state

- Project: Check the Vibe
- App version: 0.1.0 (M1 accepted; M2 investigation underway)
- Current milestone: M2 — Data-provider spike
- Milestone status: M0 and M1 accepted; M1 private-video and embedding-disabled-video checks explicitly deferred; M2 provider research in progress
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

Research underway; no provider has been selected and no M2 code candidate has been created.

Current shortlist:
- MeloData is the strongest BPM/audio-feature candidate: free API key, capped free quota, title+artist resolution and ISRC feature lookup; docs describe Essentia analysis of iTunes/Deezer previews plus an AcousticBrainz archive. Its terms permit using and storing factual feature data in apps. No 10-track coverage test has been run.
- Last.fm is a possible optional source for community track tags; it requires a free API key and restricts data use to non-commercial purposes.
- MusicBrainz remains the existing baseline for genre/tags.
- Wikidata has a CC0 BPM property, but useful per-track coverage is unproven.
- GetSongBPM is a reserve candidate if its mandatory backlink is acceptable.
- Audiometa is excluded pending proof its BPM/feature fields are not Spotify-derived. ReccoBeats is excluded for Spotify-derived metadata; SoundStat and Soundcharts are excluded as paid options.

No 10-track provider coverage test has been completed. Do not implement or select a default provider until real responses and terms are verified. The build spec's fallback remains an empty provider chain and user-entered stats only. See docs/decisions.md and docs/TEST_RECORD.md.

## Deferred

M3–M11 remain unstarted. Do not implement later milestone features before M2 is resolved.

## Operational notes

- Install dependencies from the repository root.
- Use `npm run test:unit` for SQLite, migration, and deterministic helper tests.
- Use `npm run test:e2e` for the Electron/Playwright smoke test.
- Use `npm run package:smoke` for the unpacked Forge package.
- User data is stored under Electron's userData directory; CTV_TEST_USER_DATA is a test-only override.
- Never copy only the SQLite main file while WAL is active; use the SQLite backup API.
- A package-lock.json has not yet been committed; reproducible dependency installation remains an operational follow-up.
