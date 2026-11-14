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

### Local metadata cache and federation direction

The user clarified the intended data lifecycle: playlist songs are enriched from the configured online sources, then their reusable metadata is stored locally. The cache grows from songs users actually add; users do not need to download a complete multi-gigabyte dataset.

A future federation layer may share eligible provider-sourced metadata records between installations. For a later installation, the intended lookup order is local cache, then federation if enabled and reachable, then the original providers. Metadata is reusable independently of deck membership. Federation is not playlist sharing: playlist membership, listening history, private notes, account data, and user-authored values are not shared by default.

Original provider provenance, source identifiers, retrieval time, confidence/match information, applicable license/attribution, and expiry must survive caching and peer transfer. Peer-supplied records are untrusted and require validation. Federation must not redistribute data or extend retention beyond what the original source permits.

This is an architectural direction only. Federation topology, discovery/rendezvous, transport, consent controls, integrity/trust, conflict resolution, and abuse controls remain undecided. No federation code, provider adapter, or dataset importer has been implemented. M2's provider comparison is underway. The FMA baseline has run (0/10 matches); positive-control validation and AcousticBrainz coverage remain next.


M2 provider research was revised on 2026-11-14 around a multi-provider, attribute-specific model. No provider is selected as a universal default and no provider adapter exists.

Current capability direction:
- **MusicBrainz static core data:** promising identity/recording/release catalog. Core data is CC0, but tags/genres/ratings/annotations are supplementary CC BY-NC-SA 3.0. The live API is rate-limited and is not an approved route under the current no-quota constraint. The PostgreSQL core dump is about 7 GB compressed; JSON entity dumps are available but some are several GB.
- **AcousticBrainz static data:** promising optional BPM/key/rhythm/danceability and high-level descriptors, CC0, indexed by recording MBID, but frozen at 2022-07-06. The high-level 100k sample is about 85 MB; the low-level sample is about 2 GB. No AcousticBrainz data has been downloaded.
- **FMA metadata:** supplemental genres/tags, CC BY 4.0, 106,574 tracks in the 2017 dataset. The local 10-track comparison ran and found 0 exact matches, 0 title-only candidates, and 10 no matches. This is a measured result for this sample, not proof that FMA has no useful coverage. A positive-control match against a known local FMA row is still required.
- **MTG-Jamendo metadata:** about 55k tracks with genre/instrument/mood-theme tags; metadata files are small, but the metadata is CC BY-NC-SA 4.0 and the dataset is restricted to non-commercial research/academic use. Conditional candidate only; no download or test has been performed.
- **ListenBrainz:** public CC0 listening-history dumps are huge and describe listen events rather than canonical song facts; not part of the metadata chain.
- **Discogs:** excluded pending express permission because the official Terms of Service prohibit downloading/copying and harvesting without it.
- **Apple iTunes Search API, MusicBrainz live API, and Wikidata Query Service:** excluded from provider calls under the current no-quota constraint. Existing design references to these services are superseded for metadata enrichment.

Other exclusions remain: MeloData (user-rejected), Last.fm (key/usage controls and non-commercial terms), GetSongBPM (quota and backlink), ReccoBeats (Spotify-derived), Audiometa (Spotify provenance not established), SoundStat/Soundcharts (paid), and FMAK annotations (Spotify URI mappings).

No new datasets have been downloaded beyond the user-downloaded FMA metadata archive. No provider adapters, dataset importers, live provider calls, or federation code have been implemented.


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

### FMA local comparison utility

- Status: IMPLEMENTED AND EXECUTED LOCALLY; research result recorded, provider not selected.
- Dataset archive was downloaded and extracted by the user under `data/cache/fma_metadata/`; ZIP integrity was checked locally.
- Inputs: `tracks.csv` and `genres.csv` only. Excluded: `echonest.csv`, `features.csv`, audio files and live APIs.
- User ran `node --test test/unit/fma-metadata.test.js`: 6 tests passed, 0 failed.
- User ran `npm run compare:fma -- --data-dir data/cache/fma_metadata`: 106,575 data rows read; 0 exact matches; 0 title-only candidates; 10 no matches. The streaming implementation completed without the prior out-of-memory failure.
- Result JSON: local, git-ignored `results/fma-comparison.json`; user supplied its contents for inspection. All ten entries preserve the original input wording and have empty match lists.
- Interpretation: this proves only that the current strict matcher found no match for these ten inputs in this FMA snapshot. It does not establish that the entire FMA catalog lacks useful metadata. The sample is mostly mainstream and several titles were uncertain or user-provided wording.
- Next: verify the parser/matcher with a positive control from a known row in the local archive. Do not loosen exact matching or silently correct sample titles before this check.
