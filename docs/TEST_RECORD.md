# Test Record

## Current candidate

- Milestone: M0
- App version: 0.0.1
- Commit: identify this candidate by the current Git HEAD
- Environment reported before implementation: Windows, Node.js 24.15.0, npm 11.13.0, Git 2.49.0.windows.1

## Results

| Check | Status | Command / method | Evidence |
|---|---|---|---|
| Required tables and indexes exist | NOT RUN | npm run test:unit | Tests configured; not yet executed |
| Foreign keys enforced | NOT RUN | npm run test:unit | Tests configured; not yet executed |
| Migrations apply once and are idempotent | NOT RUN | npm run test:unit | Tests configured; not yet executed |
| SQLite-aware pre-migration backup restores | NOT RUN | npm run test:unit | Tests configured; not yet executed |
| Renderer cannot access require or process | NOT RUN | npm run test:e2e | Playwright test configured; not yet executed |
| Invalid IPC payload returns ok:false | NOT RUN | npm run test:e2e | Playwright test configured; not yet executed |
| Playwright launches and closes Electron | NOT RUN | npm run test:e2e | Playwright test configured; not yet executed |
| Unpacked Forge build produced | NOT RUN | npm run package:smoke | Forge configured; package not yet produced |

## Rule

Do not change a status to PASS without the exact command output or other direct evidence for this commit. Record failures and environment blockers honestly.
