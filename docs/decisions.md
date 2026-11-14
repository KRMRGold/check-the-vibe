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

### Expanded candidate findings (research only; no live 10-track tests completed)

The provider chain may combine independent sources by attribute. Do not assume one provider must supply every field.

| Candidate | Potential role | Access and limits | Eligibility / open questions |
|---|---|---|---|
| **MeloData** | Primary BPM, key, energy, danceability and valence adapter | Free account/API key; 1,000 lookups/month; 25 bulk rows/month; 10 rows/job; 5 req/s and 100 req/min; no credit card | Strongest current candidate. Native API supports ISRC feature lookup and title+artist resolution. Docs identify iTunes/Deezer previews analyzed with Essentia plus the CC0 AcousticBrainz archive. The feature values are described as its own measurements, not copies of Spotify's. Terms permit use, storage and caching of factual feature data in applications. Verify coverage and returned provenance across 10 tracks before selecting. Use the native `/v1` API, not the Spotify-compatibility route. Free quotas are limited, so do not make the app depend on a shared project key. |
| **Last.fm** | Supplemental community genre/mood tags | Free API key; non-commercial use only; reasonable-use/rate limits apply; cache responses and provide attribution | Track top-tags endpoint accepts artist+track or MBID and returns tags ordered by community tag count. Good for suggestions, not objective audio features. Check current terms before integration and keep it optional. |
| **MusicBrainz tags/genres** | Existing primary open metadata source for genres/tags | No API key; meaningful User-Agent; approximately 1 request/second; non-commercial API use is free | Already specified in section 4. Reuse recording tags and genre data rather than adding a duplicate adapter. Coverage can be sparse. |
| **GetSongBPM** | Supplemental BPM/key | Free API key; 3,000 requests/hour; mandatory backlink to GetSongBPM on the app website or store listing | Technically viable if the backlink condition is acceptable. No key/backlink currently configured. Test coverage and terms before selection. |
| **Wikidata** | Opportunistic BPM and structured musical-work metadata | Structured data is CC0; SPARQL/API access | Property P1725 exists for numerical BPM and P1558 for qualitative tempo markings. This proves the field exists, not that coverage is useful. The property page exposes only a tiny number of examples; measure actual 10-track coverage before treating it as a provider. Wikipedia prose is better for supplemental artist/album context than structured per-track stats. |
| **AcousticBrainz archive** | Historical BPM, rhythm, key and mood features | CC0; indexed by MusicBrainz recording MBID; data collection ended in 2022 | The API remains available and the archive contains millions of submissions, but it is frozen. MeloData incorporates an AcousticBrainz archive subset and can fill some missing fields with fresh preview analysis. Direct API coverage remains untested. |
| **Audiometa** | Potential BPM/key/genre source | Free API key; no paid tier advertised | Catalog explicitly combines Spotify, YouTube and SoundCloud platform data, while BPM provenance is not sufficiently clear in the public material inspected. Exclude unless the provider confirms that every field we consume is independent of Spotify and Spotify-derived data. |
| **ReccoBeats** | Not selected | Free access advertised | Excluded because its terms disclose Spotify-derived core track metadata. |
| **SoundStat / Soundcharts** | Not selected | Paid access for real catalog use | Excluded under the no-paid-services constraint. |

### Current recommendation

Run the required 10-track live coverage test against **MeloData first**. In parallel, evaluate **Last.fm for tags** and **Wikidata for opportunistic BPM** only if their terms/access and observed coverage justify the extra adapters. MusicBrainz remains the existing genre/tag baseline. Keep GetSongBPM as a reserve candidate if its mandatory backlink is acceptable.

For every test, record:
- exact input (ISRC, MBID, or title+artist);
- resolved recording identity and match confidence;
- fields returned, nulls, provider/source marker, and confidence;
- hit rate over the same 10 well-known tracks;
- key requirements, quotas/rate limits, applicable terms, and attribution;
- whether any returned data is Spotify-derived (must be no).

Do not add code or select a default based on marketing claims alone. A free tier with a quota can be an optional adapter, but the app must remain usable without it and must not silently exceed the quota. Store provider credentials securely; never commit keys or put them in fixtures.

### Research sources

- MeloData API docs and data-source notes: https://melodata.voltenworks.com/docs
- MeloData terms: https://melodata.voltenworks.com/terms
- Last.fm track top tags: https://www.last.fm/api/show/track.getTopTags
- Last.fm API terms: https://www.last.fm/api/tos
- MusicBrainz API: https://musicbrainz.org/doc/MusicBrainz_API
- GetSongBPM API requirements: https://getsongbpm.com/api
- Wikidata numerical BPM property P1725: https://www.wikidata.org/wiki/Property:P1725
- Wikidata qualitative tempo property P1558: https://www.wikidata.org/wiki/Property:P1558
- AcousticBrainz status and CC0 notice: https://acousticbrainz.org/
- Audiometa catalog and API claims: https://www.audiometa.io/

