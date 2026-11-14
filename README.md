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
