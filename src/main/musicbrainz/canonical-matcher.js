import { basename } from "node:path";
import { listZstdTarMembers, openZstdTarMember } from "./canonical-archive.js";
import { parseCsvStream } from "./csv-stream.js";

export const CANONICAL_MATCH_THRESHOLDS = Object.freeze({
  artist: 0.72,
  title: 0.62,
  combined: 0.74
});

const REQUIRED_COLUMNS = [
  "release_mbid", "release_name", "recording_mbid", "recording_name",
  "artist_credit_name", "artist_mbids"
];

export function normalizeCanonicalText(value) {
  return String(value ?? "").normalize("NFKD").replace(/\p{M}/gu, "")
    .toLowerCase().replace(/&/g, " and ").replace(/[^a-z0-9]+/g, " ")
    .trim().replace(/\s+/g, " ");
}

function sequenceMatchingBlocks(a, b) {
  const bPositions = new Map();
  for (let index = 0; index < b.length; index += 1) {
    const positions = bPositions.get(b[index]) ?? [];
    positions.push(index);
    bPositions.set(b[index], positions);
  }

  const matches = [];
  const pending = [[0, a.length, 0, b.length]];
  while (pending.length) {
    const [alo, ahi, blo, bhi] = pending.pop();
    let bestI = alo;
    let bestJ = blo;
    let bestSize = 0;
    let previous = new Map();

    for (let i = alo; i < ahi; i += 1) {
      const current = new Map();
      for (const j of bPositions.get(a[i]) ?? []) {
        if (j < blo) continue;
        if (j >= bhi) break;
        const size = (previous.get(j - 1) ?? 0) + 1;
        current.set(j, size);
        if (size > bestSize) {
          bestI = i - size + 1;
          bestJ = j - size + 1;
          bestSize = size;
        }
      }
      previous = current;
    }

    if (bestSize) {
      while (bestI > alo && bestJ > blo && a[bestI - 1] === b[bestJ - 1]) {
        bestI -= 1;
        bestJ -= 1;
        bestSize += 1;
      }
      while (bestI + bestSize < ahi && bestJ + bestSize < bhi &&
          a[bestI + bestSize] === b[bestJ + bestSize]) {
        bestSize += 1;
      }
      matches.push([bestI, bestJ, bestSize]);
      if (alo < bestI && blo < bestJ) pending.push([alo, bestI, blo, bestJ]);
      if (bestI + bestSize < ahi && bestJ + bestSize < bhi) {
        pending.push([bestI + bestSize, ahi, bestJ + bestSize, bhi]);
      }
    }
  }

  matches.sort((left, right) => left[0] - right[0] || left[1] - right[1]);
  const collapsed = [];
  for (const match of matches) {
    const previous = collapsed.at(-1);
    if (previous && previous[0] + previous[2] === match[0] &&
        previous[1] + previous[2] === match[1]) {
      previous[2] += match[2];
    } else {
      collapsed.push([...match]);
    }
  }
  return collapsed;
}

// Matches Python difflib.SequenceMatcher(..., autojunk=False).ratio().
export function sequenceMatcherRatio(left, right) {
  const a = Array.from(String(left ?? ""));
  const b = Array.from(String(right ?? ""));
  if (!a.length && !b.length) return 1;
  if (!a.length || !b.length) return 0;
  const matched = sequenceMatchingBlocks(a, b).reduce((sum, block) => sum + block[2], 0);
  return (2 * matched) / (a.length + b.length);
}

function artistTrigrams(value) {
  const padded = `  ${value} `;
  const grams = new Set();
  for (let index = 0; index <= padded.length - 3; index += 1) {
    grams.add(padded.slice(index, index + 3));
  }
  return grams;
}

function addCandidate(map, recordingId, row, match) {
  let candidate = map.get(recordingId);
  if (!candidate) {
    candidate = {
      sourceRecordingMbid: recordingId,
      recordingName: row.recording_name,
      artistCreditName: row.artist_credit_name,
      artistMbidsRaw: row.artist_mbids || null,
      releases: new Map(),
      ...match
    };
    map.set(recordingId, candidate);
  }
  if (row.release_mbid) addRelease(candidate, row.release_mbid, row.release_name);
  if (match.combinedSimilarity != null &&
      (candidate.combinedSimilarity == null || match.combinedSimilarity > candidate.combinedSimilarity)) {
    Object.assign(candidate, match);
  }
  return candidate;
}

function addRelease(candidate, releaseMbid, releaseName = null) {
  if (releaseMbid && (!candidate.releases.has(releaseMbid) || (!candidate.releases.get(releaseMbid) && releaseName))) {
    candidate.releases.set(releaseMbid, releaseName || null);
  }
}

async function* rowsWithHeader(readable, label) {
  let headers = null;
  for await (const row of parseCsvStream(readable)) {
    if (!headers) {
      headers = row.map((value) => value.trim());
      continue;
    }
    if (row.length !== headers.length) {
      throw new Error(`Malformed ${label} CSV row: expected ${headers.length} columns, received ${row.length}.`);
    }
    yield Object.fromEntries(headers.map((header, index) => [header, row[index]]));
  }
  if (!headers) throw new Error(`${label} CSV is empty.`);
}

function requireColumns(row, columns, label) {
  for (const column of columns) {
    if (!(column in row)) throw new Error(`${label} CSV is missing required column "${column}".`);
  }
}

function buildInputStates(tracks) {
  if (!Array.isArray(tracks) || tracks.length < 1 || tracks.length > 500) {
    throw new TypeError("Canonical matching requires between 1 and 500 pasted tracks.");
  }
  const states = tracks.map((track, index) => {
    const artist = normalizeCanonicalText(track.artist);
    const title = normalizeCanonicalText(track.title);
    if (!artist || !title) throw new TypeError(`Track ${index + 1} must have a non-empty artist and title.`);
    return {
      index,
      source: { artist: String(track.artist), title: String(track.title) },
      artist,
      title,
      exact: new Map(),
      titleOnly: new Map(),
      fuzzy: new Map()
    };
  });

  const byTitle = new Map();
  const byArtistGram = new Map();
  for (const state of states) {
    const titled = byTitle.get(state.title) ?? [];
    titled.push(state);
    byTitle.set(state.title, titled);
    for (const gram of artistTrigrams(state.artist)) {
      const indexed = byArtistGram.get(gram) ?? [];
      indexed.push(state.index);
      byArtistGram.set(gram, indexed);
    }
  }
  return { states, byTitle, byArtistGram };
}

function candidateInputIndexes(artist, index) {
  const indexes = new Set();
  for (const gram of artistTrigrams(artist)) {
    for (const inputIndex of index.get(gram) ?? []) indexes.add(inputIndex);
  }
  return indexes;
}

function compareCandidates(left, right) {
  return (right.combinedSimilarity ?? 1) - (left.combinedSimilarity ?? 1) ||
    (right.titleSimilarity ?? 1) - (left.titleSimilarity ?? 1) ||
    left.recordingName.localeCompare(right.recordingName);
}

async function collectCatalogCandidates(readable, tracks) {
  const { states, byTitle, byArtistGram } = buildInputStates(tracks);
  let headerChecked = false;
  for await (const row of rowsWithHeader(readable, "canonical")) {
    if (!headerChecked) {
      requireColumns(row, REQUIRED_COLUMNS, "canonical");
      headerChecked = true;
    }
    const recordingId = row.recording_mbid;
    if (!recordingId) continue;
    const artist = normalizeCanonicalText(row.artist_credit_name);
    const title = normalizeCanonicalText(row.recording_name);
    if (!artist || !title) continue;

    const titleMatches = byTitle.get(title) ?? [];
    for (const state of titleMatches) {
      if (artist === state.artist) {
        addCandidate(state.exact, recordingId, row, {
          matchType: "exact",
          artistSimilarity: 1,
          titleSimilarity: 1,
          combinedSimilarity: 1
        });
      } else {
        addCandidate(state.titleOnly, recordingId, row, { matchType: "title_only" });
      }
    }

    for (const inputIndex of candidateInputIndexes(artist, byArtistGram)) {
      const state = states[inputIndex];
      if (state.title === title || state.exact.has(recordingId)) continue;
      if (state.fuzzy.has(recordingId)) {
        addRelease(state.fuzzy.get(recordingId), row.release_mbid, row.release_name);
        continue;
      }
      const artistSimilarity = sequenceMatcherRatio(state.artist, artist);
      if (artistSimilarity < CANONICAL_MATCH_THRESHOLDS.artist) continue;
      const titleSimilarity = sequenceMatcherRatio(state.title, title);
      if (titleSimilarity < CANONICAL_MATCH_THRESHOLDS.title) continue;
      const combinedSimilarity = Math.sqrt(artistSimilarity * titleSimilarity);
      if (combinedSimilarity < CANONICAL_MATCH_THRESHOLDS.combined) continue;
      addCandidate(state.fuzzy, recordingId, row, {
        matchType: "fuzzy",
        artistSimilarity,
        titleSimilarity,
        combinedSimilarity
      });
    }
  }
  if (!headerChecked) throw new Error("Canonical CSV has no data rows.");
  return states;
}

async function readRecordingRedirects(readable, candidateIds) {
  const redirects = new Map();
  for await (const row of rowsWithHeader(readable, "recording redirect")) {
    requireColumns(row, ["recording_mbid", "canonical_recording_mbid", "canonical_release_mbid"], "recording redirect");
    if (candidateIds.has(row.recording_mbid)) redirects.set(row.recording_mbid, row);
  }
  return redirects;
}

async function readReleaseRedirects(readable, candidateReleaseIds) {
  const redirects = new Map();
  for await (const row of rowsWithHeader(readable, "release redirect")) {
    requireColumns(row, ["release_mbid", "canonical_release_mbid", "release_group_mbid"], "release redirect");
    if (candidateReleaseIds.has(row.release_mbid)) redirects.set(row.release_mbid, row);
  }
  return redirects;
}

function canonicalizeCandidates(states, recordingRedirects, releaseRedirects) {
  return states.map((state) => {
    const canonicalize = (sourceMap) => {
      const canonical = new Map();
      for (const source of sourceMap.values()) {
        const recordingRedirect = recordingRedirects.get(source.sourceRecordingMbid);
        const recordingMbid = recordingRedirect?.canonical_recording_mbid || source.sourceRecordingMbid;
        let target = canonical.get(recordingMbid);
        if (!target) {
          target = {
            recordingMbid,
            recordingName: source.recordingName,
            artistCreditName: source.artistCreditName,
            artistMbidsRaw: source.artistMbidsRaw,
            releases: new Map(),
            matchType: source.matchType,
            artistSimilarity: source.artistSimilarity ?? null,
            titleSimilarity: source.titleSimilarity ?? null,
            combinedSimilarity: source.combinedSimilarity ?? null
          };
          canonical.set(recordingMbid, target);
        } else if ((source.combinedSimilarity ?? 1) > (target.combinedSimilarity ?? 1)) {
          target.matchType = source.matchType;
          target.artistSimilarity = source.artistSimilarity ?? null;
          target.titleSimilarity = source.titleSimilarity ?? null;
          target.combinedSimilarity = source.combinedSimilarity ?? null;
        }

        const releaseIds = new Map(source.releases);
        if (recordingRedirect?.canonical_release_mbid) {
          if (!releaseIds.has(recordingRedirect.canonical_release_mbid)) {
            releaseIds.set(recordingRedirect.canonical_release_mbid, null);
          }
        }
        for (const [sourceReleaseMbid, releaseName] of releaseIds) {
          const redirect = releaseRedirects.get(sourceReleaseMbid);
          const releaseMbid = redirect?.canonical_release_mbid || sourceReleaseMbid;
          const previousRelease = target.releases.get(releaseMbid);
          target.releases.set(releaseMbid, {
            releaseMbid,
            releaseName: previousRelease?.releaseName || releaseName || null,
            releaseGroupMbid: redirect?.release_group_mbid || previousRelease?.releaseGroupMbid || null
          });
        }
      }
      return [...canonical.values()].map((candidate) => ({
        ...candidate,
        releases: [...candidate.releases.values()].sort((a, b) => a.releaseMbid.localeCompare(b.releaseMbid))
      }));
    };

    const exact = canonicalize(state.exact);
    const titleOnly = canonicalize(state.titleOnly);
    const fuzzy = canonicalize(state.fuzzy).sort(compareCandidates).slice(0, 20);
    let matchStatus;
    let candidates;
    if (exact.length) {
      matchStatus = exact.length === 1 ? "exact_single" : "multiple_exact";
      candidates = exact;
    } else if (fuzzy.length) {
      matchStatus = "fuzzy_candidates";
      candidates = fuzzy.slice(0, 5);
    } else if (titleOnly.length) {
      matchStatus = titleOnly.length === 1 ? "title_only_candidate" : "multiple_title_only_candidates";
      candidates = titleOnly.slice(0, 5);
    } else {
      matchStatus = "no_match";
      candidates = [];
    }

    return {
      input: state.source,
      matchStatus,
      exactMatchCount: exact.length,
      titleOnlyCandidateCount: titleOnly.length,
      candidates
    };
  });
}

async function streamCatalog(readable, tracks) {
  return collectCatalogCandidates(readable, tracks);
}

export async function matchCanonicalStreams({
  canonicalCsv,
  recordingRedirectCsv,
  releaseRedirectCsv,
  tracks
}) {
  if (!canonicalCsv || !recordingRedirectCsv || !releaseRedirectCsv) {
    throw new TypeError("Canonical CSV and both redirect streams are required.");
  }
  const states = await streamCatalog(canonicalCsv, tracks);
  const candidateIds = new Set();
  const candidateReleaseIds = new Set();
  for (const state of states) {
    for (const map of [state.exact, state.titleOnly, state.fuzzy]) {
      for (const candidate of map.values()) {
        candidateIds.add(candidate.sourceRecordingMbid);
        for (const release of candidate.releases.keys()) candidateReleaseIds.add(release);
      }
    }
  }

  const recordingRedirects = await readRecordingRedirects(recordingRedirectCsv, candidateIds);
  for (const redirect of recordingRedirects.values()) {
    if (redirect.canonical_release_mbid) candidateReleaseIds.add(redirect.canonical_release_mbid);
  }
  const releaseRedirects = await readReleaseRedirects(releaseRedirectCsv, candidateReleaseIds);
  return canonicalizeCandidates(states, recordingRedirects, releaseRedirects);
}

function findMember(members, suffix, label) {
  const found = members.filter((member) => member.type === "file" && member.name.endsWith(suffix));
  if (found.length !== 1) {
    throw new Error(`Expected one ${label} archive member ending in "${suffix}", found ${found.length}.`);
  }
  return found[0].name;
}

export async function matchCanonicalArchive({ archivePath, tracks, snapshotId = null }) {
  if (typeof archivePath !== "string" || !archivePath) throw new TypeError("A canonical archive path is required.");
  const members = await listZstdTarMembers(archivePath);
  const canonicalMember = findMember(members, "canonical_musicbrainz_data.csv", "canonical data");
  const recordingRedirectMember = findMember(members, "canonical_recording_redirect.csv", "recording redirect");
  const releaseRedirectMember = findMember(members, "canonical_release_redirect.csv", "release redirect");
  const results = await matchCanonicalStreams({
    canonicalCsv: openZstdTarMember(archivePath, canonicalMember),
    recordingRedirectCsv: openZstdTarMember(archivePath, recordingRedirectMember),
    releaseRedirectCsv: openZstdTarMember(archivePath, releaseRedirectMember),
    tracks
  });
  return {
    snapshotId: snapshotId ?? basename(archivePath),
    results
  };
}
