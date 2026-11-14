# Decisions

## M0 — Skeleton and secure shell

### Accepted implementation choices

- Use the plain JavaScript ESM architecture from build-spec.md; no UI framework or bundler.
- Use Electron Forge 8.0.1 and Electron 45.3.2 as the initial toolchain baseline.
- Use better-sqlite3 13.0.3 and Zod 4.6.7.
- Configure Playwright Test 1.65.0 for Electron E2E from M0.
- Add Playwright 1.65.0 as a direct dependency because its experimental Electron launcher is imported from the playwright package, not from the test-runner entry point.
- Configure the Forge auto-unpack-natives plugin because better-sqlite3 is a native Node module.
- Serve renderer files from a loopback HTTP server bound only to 127.0.0.1, using an OS-selected free port.
- Default CTV_PROVIDER_MODE to fixture so startup and tests do not make live provider requests.
- The only exposed preload method in M0 is ping; later IPC methods must be added explicitly and validated individually.

### Notes

- Electron Forge 8 requires Node.js 22.17.0 or newer; the reported local runtime is Node.js 24.15.0.
- The renderer Content Security Policy starts from build-spec.md §8.1. M1 verifies the exact policy and loopback hosting behavior with the YouTube IFrame API.
- Run npm install in the repository root to generate package-lock.json. Commit the generated lockfile before treating the dependency graph as reproducible.
- No test result is claimed by this commit. See TEST_RECORD.md.

## M1 — YouTube embed feasibility

### Spike implementation

- Keep the existing loopback HTTP origin and current CSP unchanged for the first test; do not broaden policy pre-emptively.
- Load the official YouTube IFrame API script from `https://www.youtube.com/iframe_api`.
- Create the player with `origin: location.origin`, `enablejsapi: 1`, and `playsinline: 1`.
- Do not autoplay. Playback starts only after the user presses the explicit Play control.
- Keep the player visible at 640×360, above YouTube's documented 200×200 minimum.
- Map documented error codes 2, 5, 100, 101, 150 and 153 to user-facing explanations. Unit tests cover the deterministic mapping.
- The spike is disposable; it is not the permanent M6 playback component.

### Open verification questions

- Does the current loopback origin and Referrer-Policy deliver the Referer/client identity needed to avoid error 153?
- Does the same behavior hold in development and the unpacked Forge package?
- What exact CSP directives, if any, must change based on observed browser/player failures?
- The test screen accepts arbitrary video IDs. The initial field uses the official IFrame API sample ID `M7lc1UVf-VE`; its current playback and embedding availability must still be verified during the live test. Private and embedding-disabled fixtures still need to be selected and their current classifications verified at test time. Do not treat a video as private or embedding-disabled based only on an unverified list.
- Error 100 is documented as removed or private; 101 and 150 are documented as embedding disabled. Error 153 means the request lacks an HTTP Referer or equivalent API client identification.

### Observed result so far

- User confirmed the IFrame API loads and the sample video reaches PLAYING in development.
- User subsequently confirmed the requested unit tests, Electron E2E tests, and unpacked Forge package smoke test passed, and that playback works in the unpacked packaged app.
- Keep the existing loopback HTTP origin and CSP unchanged: the tested development and unpacked-package playback paths work without a demonstrated need to broaden policy.
- User accepted M1 on 2026-11-14 with the private-video and embedding-disabled-video checks explicitly deferred. They remain untested, not passed. Retain the current loopback hosting and CSP based on successful playback in development and the unpacked Forge package.


## M2 — Data-provider feasibility investigation

### User decision and revised constraints

The user selected a multi-provider architecture and rejected MeloData. Do not use MeloData. Prefer openly licensed static datasets over live services with quotas, request caps, or usage-limited plans. No live provider API calls, dataset downloads, coverage tests, adapters, or M2 code have been completed.

### Current candidate sources

| Source | Potential role | Access / license / constraints | Status |
|---|---|---|---|
| **MusicBrainz** | Existing identity and genre/tag baseline | Already part of the app design. Existing API throttling remains in effect. | Existing source; include in coverage comparison |
| **AcousticBrainz static archive** | BPM, key, mode, rhythm, danceability, high-level mood descriptors | CC0; indexed by MusicBrainz recording MBID; frozen 2022-07-06; 29,460,584 submissions and approximately 7.56 million unique recordings. Static dumps available. Official live API is rate-limited, typically 10 requests per 10 seconds per IP, so do not use its API. The 100,000-item low-level JSON sample is listed at 2 GB. | Candidate only if a manageable local subset/import route is found |
| **FMA metadata** | Supplemental genres and tags | 106,574 tracks; metadata archive listed at 342 MiB compressed; metadata CC BY 4.0, attribution required. Use metadata/tags/genres only. Exclude `echonest.csv`, which contains Echo Nest features associated with Spotify. Matching to app songs likely requires title+artist. | Candidate; coverage and match reliability untested |
| **Wikidata** | Possible structured BPM | P1725 and P1558 properties exist, but live Query Service has processing-time and throttling limits; full local dump is not justified. | Excluded from live testing; reconsider only with a small relevant static extract |
| **FMAK key/mode dataset** | Manual key/mode annotations for 5,489 FMA tracks | Published annotation file includes Spotify URI mappings. | Excluded due no-Spotify-in-any-form rule |

### Excluded sources

- **MeloData:** explicitly rejected by the user.
- **Last.fm:** API key required; usage controls apply; API terms restrict use to non-commercial purposes.
- **GetSongBPM:** quota-limited (3,000 requests/hour) and mandatory backlink.
- **ReccoBeats:** Spotify-derived core track metadata.
- **Audiometa:** insufficient evidence that consumed fields are independent of Spotify-derived data.
- **SoundStat / Soundcharts:** paid services.

### Provisional field chain

- Identity: MusicBrainz.
- Genres/tags: MusicBrainz → FMA metadata (optional local dataset) → user tags.
- BPM/key/mode/rhythm/danceability: AcousticBrainz static archive (optional local dataset) → user values.
- Mood descriptors: AcousticBrainz high-level archive where available → user tags.
- Energy: user-set energy remains primary; do not map an incompatible external metric into the app's 1–5 scale without an explicit validated conversion.

User values always win. Every provider value retains its source. Missing values remain unknown. The app must remain usable with no optional dataset installed.

### Required next evidence

Run a consistent 10-recording comparison using:
- MusicBrainz as the existing baseline;
- FMA metadata for genre/tag coverage and title+artist matching reliability;
- AcousticBrainz static data for MBID-based feature coverage, only if a manageable extract can be obtained without invoking its rate-limited API.

Record exact inputs, matches, returned fields, nulls, duplicate submissions, confidence/quality information, source/license/attribution, and match failures. Do not select a default provider or claim a hit rate before this test.

### Research sources

- AcousticBrainz API docs and rate limits: https://acousticbrainz.readthedocs.io/api.html
- AcousticBrainz overview, CC0 license and statistics: https://acousticbrainz.org/
- AcousticBrainz dumps and sample sizes: https://acousticbrainz.org/download
- FMA dataset repository, metadata schema and CC BY 4.0 note: https://github.com/stellaywong/fma_keys
- FMAK dataset description (excluded due Spotify URI mappings): https://zenodo.org/records/10719860
- Wikidata Query Service constraints: https://www.mediawiki.org/wiki/Wikidata_query_service/Implementation


## M2 — Playlist-driven local metadata cache and federation

### Accepted architectural direction

- Playlist imports and manually added songs drive metadata enrichment. The app queries configured online providers, then persists the normalized metadata locally for reuse.
- The local cache grows from songs users actually add; a complete static catalog is not required. Optional static datasets may seed or supplement the cache, but are not mandatory.
- Metadata records are independent of playlist/deck membership. Removing a song from a deck does not remove the reusable cached record.
- A future federation layer may exchange eligible provider-sourced metadata records so another installation can reuse an existing lookup rather than repeating it.
- The intended lookup order for a later installation is local cache → federation when enabled and reachable → original provider fallback. The app must remain functional when federation is unavailable.
- Federation is not playlist or deck sharing. Do not share playlist membership, listening history, private notes, account data, or user-authored values by default.
- Preserve original provider provenance, source identifiers, retrieval time, applicable license/attribution, match confidence, and source-specific expiry. The peer is only the delivery mechanism, not the source of the data.
- Peer-provided records are untrusted input and must be validated before being stored or used. A peer must not be treated as more authoritative than the original source.
- Do not redistribute records where the original provider's license or terms prohibit it. Federation must not extend source retention rights.

### Explicitly not decided

The user has not yet selected a federation topology or transport. Peer discovery/rendezvous, direct versus relayed connections, trust and integrity design, sharing-consent controls, conflict resolution, and abuse/rate controls remain open and require design before implementation. This direction does not add networking to the MVP game or shared sessions.

This is an architectural decision only. It does not mean federation, a provider adapter, or a dataset importer has been implemented or tested.

## M2 — FMA local comparison utility

- Keep the 342 MiB FMA metadata archive and extracted CSVs local under `data/cache/`; do not commit them or upload them to GitHub.
- Track only the small, user-provided ten-recording sample, a dependency-free comparison script, and its tests.
- The utility reads `tracks.csv` and `genres.csv` only. It explicitly excludes `echonest.csv`, `features.csv`, and audio files.
- Match policy: normalized exact title+artist is the only exact match. Title-only matches remain candidates requiring manual review. No fuzzy match is accepted automatically.
- Generated JSON results live under the git-ignored `results/` directory and can be shared separately.
- This is research tooling only; it is not an FMA provider adapter and does not change the provisional provider chain.
