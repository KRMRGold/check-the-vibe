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

### Candidate findings (research only; no live 10-track tests completed)

- **ReccoBeats:** its terms state that the core track metadata is aggregated from Spotify, while its audio-analysis metrics are described as proprietary. The project's explicit ban on Spotify and datasets derived from it makes this unsuitable without a clearly independent lookup/data route. Do not integrate it on the basis of its feature values alone.
- **SoundStat:** the service describes its own audio analysis, but its terms require an active paid account and charge per unique track. Excluded under the no-paid-services constraint.
- **Soundcharts:** audio features are available through its API, but its published self-service API plans start at a paid monthly tier. Its free sandbox is limited and does not establish real-catalog coverage for the required 10-track sample. Excluded under the no-paid/usage-limited constraint.
- **GetSongBPM:** the API is advertised as free and supports artist/title lookup with BPM, key, danceability, and acousticness. However, registration requires an API key and a mandatory backlink to GetSongBPM; the published API limit is 3,000 requests/hour. No backlink or key is configured, and it is not selected for this milestone.
- **AcousticBrainz:** the public API is keyed by MusicBrainz recording MBID and its data is CC0. The project stopped collecting new submissions in 2022, so coverage is necessarily historical. The available web retrieval path returned HTTP 429 for one example-record page and could not retrieve the corresponding API endpoint. This is a retrieval blocker, not proof of global service outage.

### Provisional recommendation

Do not select a default provider yet. No candidate has demonstrated 10-track coverage under the project's source, cost, and access constraints. The safe fallback described in build-spec.md §5 is an empty provider chain with user-entered stats only. Before implementing an adapter, either obtain evidence that an eligible provider is usable or explicitly accept this fallback for M2.

### Research sources

- ReccoBeats terms: https://reccobeats.com/docs/documentation/terms-of-service
- SoundStat terms: https://soundstat.info/terms.html
- Soundcharts pricing: https://developers.soundcharts.com/pricing
- GetSongBPM API requirements: https://getsongbpm.com/api
- AcousticBrainz status and CC0 notice: https://acousticbrainz.org/
- AcousticBrainz API: https://acousticbrainz.readthedocs.io/api.html
