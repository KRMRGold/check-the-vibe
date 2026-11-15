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


## M2 — Data-provider capability matrix

### User constraints

- Use multiple complementary providers; no single source is expected to supply every attribute.
- No Spotify or Spotify-derived data, including indirect identifiers or datasets.
- No paid, quota-limited, or otherwise usage-limited provider services.
- No local audio analysis. Precomputed attributes from a third-party dataset may be evaluated as metadata, but the app must not run audio analysis.
- Prefer static, openly licensed datasets where they provide useful coverage.
- Keep the app usable when optional datasets are absent.
- Preserve source provenance, identifiers, retrieval/version information, confidence, license and attribution requirements.

### Capability matrix

| Source | Best-fit role / fields | Join strategy | Freshness and scale | License / access constraints | Current assessment |
|---|---|---|---|---|---|
| **MusicBrainz static JSON/core dump** | Canonical catalog identity: recording, artist credits, release, release group, ISRCs, dates and relationships | MusicBrainz Recording ID (MBID), release IDs, ISRC where available; manual/candidate matching is still needed for unlinked imports | Full exports twice weekly. PostgreSQL core dump is about 7 GB compressed in the inspected November 2026 index; JSONL entity dumps are available, but some entity files are several GB. | Core data is CC0. Tags, genres, ratings and annotations in JSON dumps are CC BY-NC-SA 3.0; do not treat them as unrestricted. PostgreSQL dumps are designed for PostgreSQL. Commercial use requires registration and financial support; non-commercial personal projects do not require sign-up. | **Strong identity candidate, but not yet tested locally.** Prefer static core data over the rate-limited live API. Do not include supplementary tags/genres unless their license obligations are explicitly accepted. |
| **AcousticBrainz static archive** | Precomputed BPM, rhythm, danceability, key/scale, dynamics, spectral descriptors and high-level mood/genre model outputs | Recording MBID; duplicates may exist for a recording and must remain distinguishable until a selection policy is tested | Frozen at 2022-07-06: 29,460,584 submissions, approximately 7.56 million unique recordings. Sample dumps contain 100,000 items: high-level sample about 85 MB; low-level sample about 2 GB. Full exports are split into 30 archives. | CC0. No live API calls; use static files only. Data is historical and cannot cover later releases. | **Strong optional feature candidate.** The 2 GB low-level sample fits the user's stated local-cache tolerance. MBID coverage and duplicate handling remain untested. |
| **Free Music Archive (FMA) metadata** | Supplemental genres, tags, artist/title metadata, track identifiers and play-count fields | FMA track ID; initial cross-catalog match uses normalized exact title + artist, with title-only candidates requiring review | 106,574 tracks; metadata archive 342 MiB compressed. Dataset originates from the 2017 research release. | Metadata is CC BY 4.0; attribution required. Use tracks.csv and genres.csv only. Explicitly exclude echonest.csv (Echo Nest/Spotify-associated) and features.csv/audio. | **Supplementary candidate with measured weak coverage on this sample:** 0 exact matches, 0 title-only candidates, 10 no matches. This does not prove the catalog has no useful records; positive-control validation is still required. |
| **MTG-Jamendo metadata** | Genre, instrument, mood/theme tags; title, artist, album, duration, release date and track URL | Dataset track ID and normalized title + artist; no guaranteed MBID crosswalk established | Approximately 55,000 tracks. Metadata TSVs are small (single-digit MB files); audio and feature archives are much larger and are not needed for a metadata-only test. Dataset released 2019. | Metadata is CC BY-NC-SA 4.0; dataset is stated to be solely for non-commercial research and academic use. Commercial use requires prior written authorization. ShareAlike and attribution obligations need review before any federation. | **Conditional research candidate only.** Potentially useful for mood/instrument tags, but not an unrestricted default source. Test only if its non-commercial license scope is acceptable for this project. |
| **ListenBrainz dumps** | Listening events and derived popularity/listening-pattern research, not canonical recording facts | MusicBrainz IDs and submitted listen metadata, where present | Hundreds of millions of listens; full dumps twice monthly and daily incrementals. | CC0, but includes user listening-history data and is very large. | **Not in the metadata provider chain.** Reconsider only for a separately designed, privacy-conscious popularity feature. |
| **Discogs** | Release/edition catalog and tracklists in principle | Discogs release/master/artist IDs; crosswalk to recording MBIDs is not guaranteed | Public third-party references describe bulk dumps, but this investigation did not establish an authorized, project-safe download path. | Official Terms of Service prohibit downloading/copying or data harvesting absent express written consent. Do not rely on third-party claims that dumps are CC0 to override the official terms. | **Excluded pending explicit permission.** No scraping, harvesting or third-party dump ingestion. |

### Live-service exclusions and prior design reconciliation

- **MusicBrainz Web Service:** the official policy limits clients to one request per second per source IP. This is quota/rate-limited, so it is not an approved provider route under the current project constraints. Its static core dump remains a candidate.
- **Apple iTunes Search API:** Apple's current documentation states approximately 20 calls per minute (subject to change). Excluded as a quota-limited enrichment source.
- **Wikidata Query Service:** excluded for live lookup because of processing-time/throttling constraints. A full local dump is not justified; reconsider only if a small, relevant static extract is identified.
- **MeloData:** rejected by the user; do not use or reintroduce.
- **Last.fm:** excluded because of API key/usage controls and non-commercial terms.
- **GetSongBPM:** excluded because of request quota and mandatory backlink.
- **ReccoBeats:** excluded because of Spotify-derived metadata.
- **Audiometa:** excluded until field-level provenance independent of Spotify is established.
- **SoundStat / Soundcharts:** excluded as paid services.
- **FMAK key/mode annotations:** excluded because the published annotation file includes Spotify URI mappings.

### Provisional attribute roles (not provider selection)

- **Identity and recording/release relationships:** MusicBrainz static core data, if a manageable local subset/import strategy is established.
- **Genres and descriptive tags:** FMA metadata as a permissively licensed supplement; MTG-Jamendo only as a conditional non-commercial research dataset. User-authored tags remain authoritative.
- **BPM, key, rhythm and acoustic descriptors:** AcousticBrainz static data where a recording MBID match exists. These are precomputed third-party attributes, not locally analyzed values.
- **Mood/theme/instrument labels:** AcousticBrainz high-level outputs and, conditionally, MTG-Jamendo tags. Keep source vocabularies distinct; do not silently map them into the app's own scales.
- **Energy:** user-authored value remains primary. Do not map an external metric to the app's 1–5 scale without a validated conversion.
- **Artwork:** Cover Art Archive remains a separate artwork source, not a catalog metadata provider; verify artwork reuse/attribution terms before implementation.

### Evidence status and next checks

- FMA 10-track comparison has now run: 106,575 data rows read; 0 exact matches; 0 title-only candidates; 10 no matches. All six FMA utility unit tests passed. The user's uncertain titles remain unchanged.
- The FMA matcher still needs a positive control using a known row from the local FMA archive. This verifies that the real archive can produce a match and that the zero result is not a parser or normalization defect.
- AcousticBrainz high-level sample (about 85 MB) and low-level sample (about 2 GB) are available as separate downloads. No AcousticBrainz data has been downloaded. A sample test must first establish MBIDs for the ten recordings and report coverage plus duplicate submissions.
- MusicBrainz static core data has not been downloaded or imported. Determine whether a smaller JSONL entity subset or a compact lookup index is practical before considering the full approximately 7 GB PostgreSQL core dump.
- MTG-Jamendo metadata has not been downloaded. Do not fetch it until the project's non-commercial license compatibility and federation implications are accepted.
- No provider adapter, live provider request, dataset importer, or federation code has been implemented.

### Research sources

- MusicBrainz static PostgreSQL dumps and per-file licensing: https://musicbrainz.org/doc/MusicBrainz_Database/Download
- MusicBrainz JSON dumps and field-level licensing: https://musicbrainz.org/doc/Development/JSON_Data_Dumps
- MetaBrainz dataset formats, update cadence and commercial-use guidance: https://metabrainz.org/datasets/postgres-dumps
- MusicBrainz API rate limit: https://musicbrainz.org/doc/MusicBrainz_API/Rate_Limiting
- AcousticBrainz dumps, fields and sample archives: https://acousticbrainz.org/download
- AcousticBrainz data overview and CC0 status: https://acousticbrainz.org/
- FMA dataset and metadata schema: https://github.com/mdeff/fma
- FMA metadata rights record: https://www.loc.gov/resource/gdcdatasets.2018655052_gdcfma-metadata/
- MTG-Jamendo dataset and metadata schema/license: https://github.com/MTG/mtg-jamendo-dataset
- Discogs Terms of Service: https://support.discogs.com/hc/en-us/articles/360009334333-Terms-of-Service
- ListenBrainz dataset description: https://metabrainz.org/datasets/postgres-dumps
- Apple iTunes Search API limits: https://performance-partners.apple.com/search-api

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


## M2 — Empty-by-default feature-provider chain (accepted 2026-11-14)

- No external audio-feature provider is selected for the MVP at this point. The provider chain remains empty by default; manual user-entered attributes are the usable fallback.
- MusicBrainz canonical data is a promising static identity reference, not an audio-feature provider. No app integration is implemented.
- FMA metadata is not selected: the tested ten-recording comparison returned no matches, although the parser and one known-row positive control passed.
- AcousticBrainz remains an optional future candidate only. The 85 MB high-level sample archive was downloaded locally and its SHA-256 checksum verified, but its contents, MBID coverage, duplicate submissions and feature quality were not inspected. No coverage claim is made.
- This is an explicit M2 scope exit accepted by the user so offline-first M3 work can proceed. Reopening provider research requires a concrete reason and should not block the library/deck milestone.
- No provider adapter, dataset importer, live provider call or federation implementation is implied by this decision.


## M3 — Deck entry and persistence model

- Reuse the existing `decks` and `deck_entries` tables from migration 0001; no new migration is needed for the first deck-management slice.
- A deck entry is an occurrence, not a unique song-to-deck association. Its own ID identifies that placement, and its position orders it within the deck. The same library song may appear multiple times in one deck and in multiple decks.
- Library songs remain canonical reusable local records. Removing one deck entry removes only that occurrence; deleting a deck cascades to its entries but does not delete the songs.
- Append new entries at the end. Reordering requires the submitted IDs to be an exact permutation of the deck's current entries; invalid or stale orders are rejected without changing the deck.
- Removing an occurrence compacts the remaining positions to zero-based contiguous order. Reordering also writes contiguous zero-based positions. These rules make order deterministic and straightforward to restore.
- Decks and entries remain local/offline. This is not playlist sharing or federation; no network behavior is introduced.
- The renderer presents deck navigation, deck create/edit/delete, deck contents, library search/add, occurrence removal, and move-up/move-down reordering. Repeated Add actions intentionally create repeated occurrences.
- Deck operations are local/offline and use the existing validated IPC/preload boundary. No provider, network, or federation behavior is introduced.
- Status: implementation candidate added on `main`; repository, IPC, renderer UI, and tests are present, but the candidate has not yet been executed or accepted.

## M4 — Canonical identity and pasted-list matching (design refinement)

- The user's local canonical snapshot is `musicbrainz-canonical-dump-20261103-080003.tar.zst`, timestamped 2026-11-03 08:00:03.080240. Its `COPYING` file identifies the dataset as CC0 1.0 Universal. Preserve the snapshot timestamp and provenance with match results.
- The archive contains five members: `TIMESTAMP`, `COPYING`, `canonical/canonical_musicbrainz_data.csv`, `canonical/canonical_recording_redirect.csv`, and `canonical/canonical_release_redirect.csv`. The main CSV columns include artist credit, recording MBID/name, release MBID/name, `combined_lookup`, and `score`.
- The user's existing `.tools/compare_canonical.py` is the matching reference. It normalizes artist/title input, performs exact matching, discovers fuzzy candidates with artist trigrams, applies the existing thresholds (artist 0.72, title 0.62, combined 0.74), and caps tracked/final candidates (20/5). It scans the CSV once per input batch rather than building a full-catalog index. M4 should port this behavior and keep candidate memory bounded; do not extract the CSV or require a full-catalog index.
- The CSV is release-expanded: a recording can appear on multiple release rows. Resolve recording redirects before counting distinct recording candidates; keep release options separate. The recording redirect table maps source recording MBIDs to canonical recording MBIDs and a canonical release MBID; the release redirect table maps source release MBIDs to canonical release MBIDs and release groups.
- Do not treat CSV rows as distinct recordings, and do not treat the dataset `score` as match confidence. `combined_lookup` is not yet validated as a reliable app lookup key; use the tested explicit artist/title normalization until its behavior is independently verified.
- Schema gaps confirmed in migration `0001_init.sql`: `songs.mbid_recording` is unique, but there is no separate song-to-release association; `import_items.video_id` is NOT NULL and therefore cannot directly represent pasted-list rows. Add a migration for the smallest clear persistence model before implementation. Preserve original pasted lines and repeated occurrences while allowing confirmed duplicate recording identities to reuse one library song.
- M4 remains offline: no live MusicBrainz Web Service calls. Cover Art Archive is still a separate, deferred artwork concern.
- Archive inspection is confirmed locally by the user; the app-side decompression, TAR streaming, matching, redirect resolution, persistence, and review UI have not yet been implemented or tested.

## M4 — Archive reader implementation choice

- Use Node's built-in `node:zlib` Zstandard streams rather than adding a package or requiring an external `zstd.exe`. Node documents the APIs as experimental and available from Node 22.15; the repository engine floor is Node 22.17 and Electron 45.3.2 embeds Node 24.
- Initial implementation is deliberately limited to listing TAR members while discarding payload bytes. It uses bounded chunk buffering and validates header checksums; it does not extract the multi-gigabyte CSV.
- A separate Electron embedded-Node smoke command was added because passing Node CLI unit tests alone does not prove the Electron runtime exposes the same API.
- This is a spike, not yet accepted runtime support: user-side unit and Electron smoke tests remain pending. The next archive-reader slice must expose the selected CSV member as a stream without writing it to disk. Current parser explicitly rejects PAX/GNU long-name extension headers; verify the supplied archive does not use them before relying on the reader for the full dump.

## Paste imports share the import-job model

- Decision: pasted Artist — Title rows use the existing `import_jobs` and `import_items` infrastructure with `provider = 'paste'`, rather than a parallel paste-import subsystem.
- Rationale: reuse import history, ordered item storage, and review-state infrastructure while keeping paste parsing/matching behavior distinct from YouTube playlist imports.
- The import item schema supports both sources: `video_id` is nullable and `source_line` retains the original pasted line. Parsing errors are recorded rather than silently dropping input.
- Canonical MusicBrainz recording and release identities are stored separately from editable song fields, with an explicit many-to-many recording/release association.
