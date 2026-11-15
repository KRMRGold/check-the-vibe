import test from "node:test";
import assert from "node:assert/strict";
import { Readable } from "node:stream";
import {
  CANONICAL_MATCH_LIMITS,
  CANONICAL_MATCH_THRESHOLDS,
  matchCanonicalStreams,
  normalizeCanonicalText,
  sequenceMatcherRatio
} from "../../src/main/musicbrainz/canonical-matcher.js";

const canonicalHeader = [
  "id", "artist_credit_id", "artist_mbids", "artist_credit_name",
  "release_mbid", "release_name", "recording_mbid", "recording_name",
  "combined_lookup", "score"
];
const recordingRedirectHeader = [
  "recording_mbid", "canonical_recording_mbid", "canonical_release_mbid"
];
const releaseRedirectHeader = [
  "release_mbid", "canonical_release_mbid", "release_group_mbid"
];

function csvCell(value) {
  const text = String(value ?? "");
  return /[",\r\n]/u.test(text) ? `"${text.replaceAll('"', '""')}"` : text;
}

function csv(headers, rows) {
  return [headers, ...rows].map((row) => row.map(csvCell).join(",")).join("\n") + "\n";
}

function canonicalRow({
  artist = "Artist", title = "Song", recording = "recording-1",
  release = "release-1", artistMbids = "artist-mbid"
} = {}) {
  return ["1", "1", artistMbids, artist, release, "Release", recording, title, "", "1"];
}

function streams({ catalog = [], recordingRedirects = [], releaseRedirects = [] } = {}) {
  return {
    canonicalCsv: Readable.from([csv(canonicalHeader, catalog)]),
    recordingRedirectCsv: Readable.from([csv(recordingRedirectHeader, recordingRedirects)]),
    releaseRedirectCsv: Readable.from([csv(releaseRedirectHeader, releaseRedirects)])
  };
}

test("canonical normalization matches the established accent and punctuation rules", () => {
  assert.equal(normalizeCanonicalText("Beyoncé & Faithless!"), "beyonce and faithless");
  assert.equal(normalizeCanonicalText("  Ａｒｔｉｓｔ—Name  "), "artist name");
});

test("SequenceMatcher ratio follows difflib's matching-block ratio with autojunk disabled", () => {
  assert.equal(sequenceMatcherRatio("abcd", "abce"), 0.75);
  assert.equal(sequenceMatcherRatio("kitten", "sitting"), 8 / 13);
  assert.equal(sequenceMatcherRatio("tide", "diet"), 0.25);
  assert.equal(sequenceMatcherRatio("", ""), 1);
  assert.equal(sequenceMatcherRatio("abc", ""), 0);
  assert.equal(sequenceMatcherRatio("same", "same"), 1);
});

test("the established fuzzy thresholds remain unchanged", () => {
  assert.deepEqual(CANONICAL_MATCH_THRESHOLDS, {
    artist: 0.72,
    title: 0.62,
    combined: 0.74
  });
});

test("exact matches take priority and recording redirects deduplicate aliases while retaining releases", async () => {
  const input = [{ artist: "Artist", title: "Song" }];
  const data = streams({
    catalog: [
      canonicalRow({ recording: "alias-recording-a", release: "alias-release-a" }),
      canonicalRow({ recording: "alias-recording-a", release: "release-b" }),
      canonicalRow({ recording: "alias-recording-b", release: "release-c" }),
      canonicalRow({ artist: "Other Artist", title: "Song", recording: "wrong-artist" })
    ],
    recordingRedirects: [
      ["alias-recording-a", "canonical-recording", "canonical-release-a"],
      ["alias-recording-b", "canonical-recording", "canonical-release-a"]
    ],
    releaseRedirects: [
      ["alias-release-a", "canonical-release-a", "group-a"],
      ["release-b", "release-b", "group-a"],
      ["release-c", "release-c", "group-b"],
      ["canonical-release-a", "canonical-release-a", "group-a"]
    ]
  });

  const [result] = await matchCanonicalStreams({ ...data, tracks: input });
  assert.equal(result.matchStatus, "exact_single");
  assert.equal(result.exactMatchCount, 1);
  assert.equal(result.candidates[0].recordingMbid, "canonical-recording");
  assert.deepEqual(result.candidates[0].releases.map((release) => release.releaseMbid), [
    "canonical-release-a", "release-b", "release-c"
  ]);
  assert.equal(result.candidates[0].releases.find((release) => release.releaseMbid === "release-c").releaseGroupMbid, "group-b");
  assert.equal(result.candidates[0].releases.find((release) => release.releaseMbid === "release-c").releaseName, "Release");
});

test("fuzzy candidates use artist, title, and geometric combined thresholds", async () => {
  const data = streams({
    catalog: [canonicalRow({ artist: "Beatles", title: "Hey Jud", recording: "fuzzy-recording" })]
  });
  const [result] = await matchCanonicalStreams({
    ...data,
    tracks: [{ artist: "The Beatles", title: "Hey Jude" }]
  });
  assert.equal(result.matchStatus, "fuzzy_candidates");
  assert.equal(result.candidates.length, 1);
  assert.ok(result.candidates[0].artistSimilarity >= CANONICAL_MATCH_THRESHOLDS.artist);
  assert.ok(result.candidates[0].titleSimilarity >= CANONICAL_MATCH_THRESHOLDS.title);
  assert.ok(result.candidates[0].combinedSimilarity >= CANONICAL_MATCH_THRESHOLDS.combined);
});

test("exact title with a different artist is retained as a title-only candidate", async () => {
  const data = streams({
    catalog: [canonicalRow({ artist: "Different Artist", title: "Same Song" })]
  });
  const [result] = await matchCanonicalStreams({
    ...data,
    tracks: [{ artist: "Requested Artist", title: "Same Song" }]
  });
  assert.equal(result.matchStatus, "title_only_candidate");
  assert.equal(result.titleOnlyCandidateCount, 1);
  assert.equal(result.candidates[0].recordingMbid, "recording-1");
});

test("distinct exact recording identities remain an ambiguous multiple-exact result", async () => {
  const data = streams({
    catalog: [
      canonicalRow({ recording: "recording-a" }),
      canonicalRow({ recording: "recording-b", release: "release-b" })
    ]
  });
  const [result] = await matchCanonicalStreams({
    ...data,
    tracks: [{ artist: "Artist", title: "Song" }]
  });
  assert.equal(result.matchStatus, "multiple_exact");
  assert.equal(result.exactMatchCount, 2);
});

test("missing canonical recording MBIDs are ignored", async () => {
  const data = streams({
    catalog: [canonicalRow({ recording: "" })]
  });
  const [result] = await matchCanonicalStreams({
    ...data,
    tracks: [{ artist: "Artist", title: "Song" }]
  });
  assert.equal(result.matchStatus, "no_match");
  assert.deepEqual(result.candidates, []);
});


test("candidate overflow remains review-only even when retained aliases collapse to one canonical recording", async () => {
  const catalog = Array.from(
    { length: CANONICAL_MATCH_LIMITS.candidatesPerTrackAndType + 1 },
    (_, index) => canonicalRow({ recording: `alias-${index}`, release: `release-${index}` })
  );
  const recordingRedirects = catalog.map((row) => [
    row[6], "one-canonical-recording", "one-canonical-release"
  ]);
  const data = streams({ catalog, recordingRedirects });
  const [result] = await matchCanonicalStreams({
    ...data,
    tracks: [{ artist: "Artist", title: "Song" }]
  });

  assert.equal(result.matchStatus, "candidate_limit_exceeded");
  assert.equal(result.candidateLimitType, "exact");
  assert.equal(result.exactMatchCount, null);
  assert.equal(result.candidates.length, 1);
  assert.equal(result.candidates[0].recordingMbid, "one-canonical-recording");
});

test("release associations are capped and explicitly marked without changing an exact identity match", async () => {
  const catalog = Array.from(
    { length: CANONICAL_MATCH_LIMITS.releasesPerCandidate + 3 },
    (_, index) => canonicalRow({ recording: "one-recording", release: `release-${index}` })
  );
  const data = streams({ catalog });
  const [result] = await matchCanonicalStreams({
    ...data,
    tracks: [{ artist: "Artist", title: "Song" }]
  });

  assert.equal(result.matchStatus, "exact_single");
  assert.equal(result.candidates.length, 1);
  assert.equal(result.candidates[0].releases.length, CANONICAL_MATCH_LIMITS.releasesPerCandidate);
  assert.equal(result.candidates[0].releasesTruncated, true);
});

test("fuzzy candidate overflow is reported instead of presenting a partial shortlist as complete", async () => {
  const catalog = Array.from(
    { length: CANONICAL_MATCH_LIMITS.candidatesPerTrackAndType + 1 },
    (_, index) => canonicalRow({
      artist: "Beatles",
      title: "Hey Jud",
      recording: `fuzzy-recording-${index}`
    })
  );
  const data = streams({ catalog });
  const [result] = await matchCanonicalStreams({
    ...data,
    tracks: [{ artist: "The Beatles", title: "Hey Jude" }]
  });

  assert.equal(result.matchStatus, "candidate_limit_exceeded");
  assert.equal(result.candidateLimitType, "fuzzy");
  assert.equal(result.candidates.length, 5);
});

test("title-only candidate overflow is marked for review", async () => {
  const catalog = Array.from(
    { length: CANONICAL_MATCH_LIMITS.candidatesPerTrackAndType + 1 },
    (_, index) => canonicalRow({
      artist: `Unrelated Performer ${index}`,
      title: "Shared Title",
      recording: `title-only-${index}`
    })
  );
  const data = streams({ catalog });
  const [result] = await matchCanonicalStreams({
    ...data,
    tracks: [{ artist: "Requested Performer", title: "Shared Title" }]
  });

  assert.equal(result.matchStatus, "candidate_limit_exceeded");
  assert.equal(result.candidateLimitType, "title_only");
  assert.equal(result.titleOnlyCandidateCount, null);
});


test("reports phase-based progress for catalog and both redirect streams", async () => {
  const data = streams({
    catalog: [canonicalRow()],
    recordingRedirects: [["recording-1", "recording-1", "release-1"]],
    releaseRedirects: [["release-1", "release-1", "group-1"]]
  });
  const progress = [];
  await matchCanonicalStreams({
    ...data,
    tracks: [{ artist: "Artist", title: "Song" }],
    onProgress: (entry) => progress.push(entry)
  });

  assert.deepEqual(progress.map((entry) => entry.phase), [
    "catalog", "recording_redirects", "release_redirects"
  ]);
  assert.ok(progress.every((entry) => entry.rowsProcessed === 1));
});

test("aborts canonical matching during a streamed catalog read", async () => {
  const controller = new AbortController();
  async function* delayedCsv() {
    yield csv(canonicalHeader, []);
    await new Promise((resolve) => setTimeout(resolve, 30));
    yield csv([], [canonicalRow()]);
  }
  const data = streams();
  const canonicalCsv = Readable.from(delayedCsv());
  const promise = matchCanonicalStreams({
    ...data,
    canonicalCsv,
    tracks: [{ artist: "Artist", title: "Song" }],
    signal: controller.signal
  });
  setTimeout(() => controller.abort(), 5);
  await assert.rejects(promise, (error) => error.name === "AbortError" && error.code === "ABORT_ERR");
});
