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

Research direction revised on 2026-11-14. The user chose a multi-provider architecture and rejected MeloData. No provider has been selected, no adapter code exists, and no 10-track coverage test has been completed.

Current direction:
- MusicBrainz remains the existing identity and genre/tag baseline.
- AcousticBrainz is a candidate only as an openly licensed **static local dataset**, not its live API. The live API documents request limits (typically 10 requests per 10 seconds per IP). Its CC0 archive is frozen at 2022-07-06 and indexed by recording MBID. The 100,000-item low-level JSON sample is listed at 2 GB, so a practical import/subset strategy must be established before use.
- FMA metadata is a candidate for supplemental genres/tags. The metadata archive is listed at 342 MiB compressed for 106,574 tracks and is CC BY 4.0. Use only metadata/tags/genres; explicitly exclude `echonest.csv`, which contains Echo Nest features associated with Spotify. Matching to app songs may require title+artist and must be measured for false matches.
- Wikidata is not a live candidate: its public query service has processing-time and throttling limits. A full local dump is not justified without a smaller relevant extract.
- FMAK key/mode annotations are excluded because the published annotation file includes Spotify URI mappings, conflicting with the project's no-Spotify boundary.

Excluded:
- MeloData: rejected by user; do not use.
- Last.fm: free key and usage controls, plus non-commercial terms.
- GetSongBPM: quota-limited API and mandatory backlink.
- ReccoBeats: Spotify-derived metadata.
- Audiometa: field provenance not established as independent of Spotify.
- SoundStat / Soundcharts: paid services.

Next step: establish a manageable, local-only dataset test using the same 10 recordings. Measure MusicBrainz and FMA metadata tag coverage, and AcousticBrainz feature coverage by MBID if a suitably small static extract is available. Record exact matches, missing values, duplicate submissions and data provenance. Until then, the provider chain remains provisional and the app continues to work with user-entered values only.

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
