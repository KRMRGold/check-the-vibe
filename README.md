# Check the Vibe

A desktop-first music collection and playlist app where songs are cards, playlists are decks, and group listening can optionally become a music game.

**Current stage:** M0 — Skeleton and secure shell. The first implementation candidate is committed; acceptance checks still need to be run on Windows.

## Requirements

- Node.js 22.17.0 or newer
- npm
- Git

SQLite is embedded through better-sqlite3; no separate SQLite server is needed.

## First-time setup

Run these commands from the repository root:

```bash
npm install
npm run test:unit
npm run test:e2e
npm run package:smoke
```

The first install creates package-lock.json. Commit that lockfile so subsequent installs can use npm ci for a reproducible dependency install.

## Run the app

```bash
npm start
```

## M0 checks

- Unit tests: npm run test:unit
- Electron/Playwright smoke test: npm run test:e2e
- Unpacked Electron Forge package: npm run package:smoke
- All tests together: npm test

The test suite runs in fixture mode and does not make live provider requests.

## Provider mode

CTV_PROVIDER_MODE defaults to fixture. Set it to live only when a later milestone explicitly requires live provider access.

## Current implementation boundary

M0 establishes the Electron shell, secure renderer boundary, loopback content server, SQLite schema and migration runner, and automated test/packaging configuration. Library, deck, import, playback, enrichment, and game features are implemented in later milestones.

## M2: Local FMA metadata comparison

This optional research utility compares the fixed 10-track sample against the Free Music Archive metadata. The dataset stays on your machine and is not committed to Git.

1. Download the official FMA metadata archive from the source linked in `docs/TEST_RECORD.md`.
2. Put the ZIP at `data/cache/fma_metadata.zip` (this directory is git-ignored).
3. Extract it so `tracks.csv` and `genres.csv` are directly inside `data/cache/fma_metadata/`. If the archive creates an extra nested folder, pass the folder that actually contains those two CSV files.
4. Run:

   ```powershell
   npm run compare:fma -- --data-dir .\data\cache\fma_metadata
   ```

5. Inspect `results/fma-comparison.json`. The generated results are also git-ignored; share that small file separately if you want the results reviewed.

The utility reads only `tracks.csv` and `genres.csv`. It does not read `echonest.csv`, `features.csv), audio files, or make network requests. Matching is normalized exact title + artist. A title-only match is reported as a candidate and is never accepted automatically. User-provided titles that are uncertain remain unchanged in the sample file at `data/samples/fma-sample-10.json`.

Run utility tests with:

```powershell
node --test test/unit/fma-metadata.test.js
```
