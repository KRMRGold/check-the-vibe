#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";
import { pathToFileURL } from "node:url";

export function parseCsv(text) {
  const rows = [];
  let row = [];
  let cell = "";
  let quoted = false;
  for (let i = 0; i < text.length; i += 1) {
    const ch = text[i];
    if (quoted) {
      if (ch === '"' && text[i + 1] === '"') { cell += '"'; i += 1; }
      else if (ch === '"') quoted = false;
      else cell += ch;
    } else if (ch === '"' && cell.length === 0) quoted = true;
    else if (ch === ",") { row.push(cell); cell = ""; }
    else if (ch === "\n") {
      row.push(cell.replace(/\r$/, ""));
      if (row.some((v) => v.length)) rows.push(row);
      row = []; cell = "";
    } else cell += ch;
  }
  if (cell.length || row.length) {
    row.push(cell.replace(/\r$/, ""));
    if (row.some((v) => v.length)) rows.push(row);
  }
  return rows;
}

// Streaming equivalent of parseCsv. It preserves quoted commas and newlines
// without retaining the complete CSV file or all of its rows in memory.
export async function* parseCsvStream(readable) {
  let row = [];
  let cell = "";
  let quoted = false;
  let pendingQuote = false;
  for await (const chunk of readable) {
    const text = String(chunk);
    for (let i = 0; i < text.length; i += 1) {
      const ch = text[i];
      if (quoted) {
        if (pendingQuote) {
          if (ch === '"') { cell += '"'; pendingQuote = false; continue; }
          quoted = false;
          pendingQuote = false;
          // The previous quote closed the field; process this character below.
        } else if (ch === '"') { pendingQuote = true; continue; }
        else { cell += ch; continue; }
      }
      if (ch === '"' && cell.length === 0) quoted = true;
      else if (ch === ",") { row.push(cell); cell = ""; }
      else if (ch === "\n") {
        row.push(cell.replace(/\r$/, ""));
        if (row.some((v) => v.length)) yield row;
        row = []; cell = "";
      } else cell += ch;
    }
  }
  if (pendingQuote) { quoted = false; pendingQuote = false; }
  if (cell.length || row.length) {
    row.push(cell.replace(/\r$/, ""));
    if (row.some((v) => v.length)) yield row;
  }
}

export function normalizeText(value) {
  return String(value ?? "").normalize("NFKD").replace(/[\u0300-\u036f]/g, "")
    .toLowerCase().replace(/&/g, " and ").replace(/[^a-z0-9]+/g, " ")
    .trim().replace(/\s+/g, " ");
}

function cleanHeader(value) {
  return String(value ?? "").replace(/^\uFEFF/, "").trim().toLowerCase()
    .replace(/^unnamed:.*$/, "");
}

export function buildHeaders(rows) {
  if (!rows.length) return { headers: [], dataStart: 0 };
  const first = rows[0].map(cleanHeader);
  const second = rows[1]?.map(cleanHeader) ?? [];
  const flat = first.some((v) => ["track_title", "artist_name", "track_id"].includes(v));
  if (!flat && second.length && first.some((v) => v === "track" || v === "artist")) {
    return {
      headers: second.map((v, i) => v ? (first[i] ? first[i] + "_" + v : v) : first[i]),
      dataStart: 2
    };
  }
  return { headers: first, dataStart: 1 };
}

function parseJsonCell(value) {
  if (!value) return [];
  try {
    const parsed = JSON.parse(value);
    return Array.isArray(parsed) ? parsed : [parsed];
  } catch {
    const genreTitles = [...String(value).matchAll(/genre_title\s*:\s*['"]([^'"]+)['"]/g)]
      .map((match) => ({ genre_title: match[1] }));
    if (genreTitles.length) return genreTitles;
    const quotedValues = [...String(value).matchAll(/['"]([^'"]+)['"]/g)]
      .map((match) => match[1]);
    if (quotedValues.length) return quotedValues;
    return String(value).split(/[|;]/).map((v) => v.trim()).filter(Boolean);
  }
}

function column(headers, names) {
  for (const name of names) {
    const index = headers.indexOf(name);
    if (index !== -1) return index;
  }
  return -1;
}

function parseFmaTrackRow(values, columns, headers, genreTitles) {
  const { ti, ai, id, gi, tagi } = columns;
  const rawGenres = gi < 0 ? [] : parseJsonCell(values[gi]);
  const genres = rawGenres.map((entry) => {
    if (entry && typeof entry === "object") {
      const key = String(entry.genre_id ?? entry.id ?? "");
      return entry.genre_title ?? entry.title ?? genreTitles.get(key) ?? key;
    }
    const value = String(entry);
    return genreTitles.get(value) ?? value;
  }).filter(Boolean);
  const tags = tagi < 0 ? [] : parseJsonCell(values[tagi]).map((entry) =>
    entry && typeof entry === "object" ? (entry.tag ?? entry.name ?? JSON.stringify(entry)) : String(entry)
  );
  const record = Object.fromEntries(headers.map((h, i) => [h, values[i] ?? ""]));
  return {
    fmaTrackId: id < 0 ? null : values[id] || null,
    title: values[ti] ?? "",
    artist: values[ai] ?? "",
    genres: [...new Set(genres)],
    tags: [...new Set(tags)],
    sourceFields: {
      track_date_recorded: record.track_date_recorded || null,
      track_date_created: record.track_date_created || null,
      license_title: record.license_title || null,
      license_url: record.license_url || null
    }
  };
}

function fmaColumns(headers) {
  const columns = {
    ti: column(headers, ["track_title", "title", "track_name"]),
    ai: column(headers, ["artist_name", "artist", "track_artist"]),
    id: column(headers, ["track_id", "id", "track"]),
    gi: column(headers, ["track_genres", "genres"]),
    tagi: column(headers, ["track_tags", "tags"])
  };
  if (columns.ti < 0 || columns.ai < 0) {
    throw new Error("Could not identify title/artist columns. Headers: " + headers.join(", "));
  }
  return columns;
}

export function parseFmaTracks(csvText, genreTitles = new Map()) {
  const rows = parseCsv(csvText);
  const { headers, dataStart } = buildHeaders(rows);
  const columns = fmaColumns(headers);
  return rows.slice(dataStart).map((values) => parseFmaTrackRow(values, columns, headers, genreTitles));
}

export function compareSample(sample, tracks) {
  return sample.map((item) => {
    const title = normalizeText(item.title);
    const artist = normalizeText(item.artist);
    const exact = tracks.filter((t) => normalizeText(t.title) === title && normalizeText(t.artist) === artist);
    const titleOnly = exact.length ? [] : tracks.filter((t) => normalizeText(t.title) === title);
    const status = exact.length === 1 ? "exact_title_artist"
      : exact.length > 1 ? "multiple_exact_matches"
      : titleOnly.length === 1 ? "title_only_candidate"
      : titleOnly.length > 1 ? "multiple_title_only_candidates" : "no_match";
    return {
      sampleId: item.id, inputArtist: item.artist, inputTitle: item.title,
      inputNote: item.note ?? null, matchStatus: status,
      matches: (exact.length ? exact : titleOnly).slice(0, 10).map((t) => ({
        fmaTrackId: t.fmaTrackId, title: t.title, artist: t.artist,
        genres: t.genres, tags: t.tags, sourceFields: t.sourceFields
      }))
    };
  });
}

function parseGenres(csvText) {
  const rows = parseCsv(csvText);
  const { headers, dataStart } = buildHeaders(rows);
  const id = column(headers, ["genre_id", "id"]);
  const title = column(headers, ["genre_title", "title", "name"]);
  const map = new Map();
  if (id < 0 || title < 0) return map;
  for (const row of rows.slice(dataStart)) if (row[id] && row[title]) map.set(String(row[id]), row[title]);
  return map;
}

async function readFmaTracks(filePath, genreTitles, onTrack) {
  const iterator = parseCsvStream(fs.createReadStream(filePath, { encoding: "utf8" }));
  const initialRows = [];
  let headers;
  let columns;
  let dataStart;
  let rowsRead = 0;

  for await (const values of iterator) {
    if (!headers) {
      initialRows.push(values);
      if (initialRows.length < 2) continue;
      ({ headers, dataStart } = buildHeaders(initialRows));
      columns = fmaColumns(headers);
      for (const pending of initialRows.slice(dataStart)) {
        onTrack(parseFmaTrackRow(pending, columns, headers, genreTitles));
        rowsRead += 1;
      }
      initialRows.length = 0;
      continue;
    }
    onTrack(parseFmaTrackRow(values, columns, headers, genreTitles));
    rowsRead += 1;
  }

  if (!headers && initialRows.length) {
    ({ headers, dataStart } = buildHeaders(initialRows));
    columns = fmaColumns(headers);
    for (const pending of initialRows.slice(dataStart)) {
      onTrack(parseFmaTrackRow(pending, columns, headers, genreTitles));
      rowsRead += 1;
    }
  }
  return rowsRead;
}

function makeSampleComparisons(sample) {
  const byTitle = new Map();
  const states = sample.map((item) => ({
    item,
    title: normalizeText(item.title),
    artist: normalizeText(item.artist),
    exactCount: 0,
    titleOnlyCount: 0,
    exactMatches: [],
    titleOnlyMatches: []
  }));
  for (const state of states) {
    if (!byTitle.has(state.title)) byTitle.set(state.title, []);
    byTitle.get(state.title).push(state);
  }
  return {
    add(track) {
      const matches = byTitle.get(normalizeText(track.title));
      if (!matches) return;
      const artist = normalizeText(track.artist);
      for (const state of matches) {
        if (artist === state.artist) {
          state.exactCount += 1;
          if (state.exactMatches.length < 10) state.exactMatches.push(track);
        } else {
          state.titleOnlyCount += 1;
          if (state.titleOnlyMatches.length < 10) state.titleOnlyMatches.push(track);
        }
      }
    },
    results() {
      return states.map((state) => {
        const status = state.exactCount === 1 ? "exact_title_artist"
          : state.exactCount > 1 ? "multiple_exact_matches"
          : state.titleOnlyCount === 1 ? "title_only_candidate"
          : state.titleOnlyCount > 1 ? "multiple_title_only_candidates" : "no_match";
        const matches = state.exactCount ? state.exactMatches : state.titleOnlyMatches;
        return {
          sampleId: state.item.id, inputArtist: state.item.artist, inputTitle: state.item.title,
          inputNote: state.item.note ?? null, matchStatus: status,
          matches: matches.map((t) => ({
            fmaTrackId: t.fmaTrackId, title: t.title, artist: t.artist,
            genres: t.genres, tags: t.tags, sourceFields: t.sourceFields
          }))
        };
      });
    }
  };
}

function arg(name, fallback) {
  const i = process.argv.indexOf(name);
  return i < 0 ? fallback : process.argv[i + 1];
}

export async function runComparison({ dataDir, samplePath, outputPath }) {
  const tracksPath = path.join(dataDir, "tracks.csv");
  const genresPath = path.join(dataDir, "genres.csv");
  for (const file of [tracksPath, genresPath, samplePath]) {
    if (!fs.existsSync(file)) throw new Error("Missing required file: " + file);
  }
  const sample = JSON.parse(fs.readFileSync(samplePath, "utf8"));
  const genreMap = parseGenres(fs.readFileSync(genresPath, "utf8"));
  const comparison = makeSampleComparisons(sample);
  const trackRowsRead = await readFmaTracks(tracksPath, genreMap, (track) => comparison.add(track));
  const results = comparison.results();
  const output = {
    generatedAt: new Date().toISOString(),
    dataset: {
      name: "Free Music Archive metadata",
      expectedLicense: "CC BY 4.0; verify the archive's included license and attribution text",
      filesUsed: ["tracks.csv", "genres.csv"],
      filesExcluded: ["echonest.csv", "features.csv", "all audio files"],
      matchRule: "normalized exact title + artist; title-only matches are candidates, never automatic matches",
      trackRowsRead
    },
    sampleCount: sample.length,
    summary: {
      exactSingleMatches: results.filter((r) => r.matchStatus === "exact_title_artist").length,
      multipleExactMatches: results.filter((r) => r.matchStatus === "multiple_exact_matches").length,
      titleOnlyCandidates: results.filter((r) => ["title_only_candidate", "multiple_title_only_candidates"].includes(r.matchStatus)).length,
      noMatch: results.filter((r) => r.matchStatus === "no_match").length
    },
    results
  };
  fs.mkdirSync(path.dirname(outputPath), { recursive: true });
  fs.writeFileSync(outputPath, JSON.stringify(output, null, 2) + "\n", "utf8");
  return output;
}

async function main() {
  if (process.argv.includes("--help")) {
    process.stdout.write("Usage: npm run compare:fma -- --data-dir <folder-with-tracks.csv-and-genres.csv> [--sample <json>] [--output <json>]\n");
    return;
  }
  const root = process.cwd();
  const dataDir = path.resolve(root, arg("--data-dir", "data/cache/fma_metadata"));
  const samplePath = path.resolve(root, arg("--sample", "data/samples/fma-sample-10.json"));
  const outputPath = path.resolve(root, arg("--output", "results/fma-comparison.json"));
  const result = await runComparison({ dataDir, samplePath, outputPath });
  process.stdout.write("FMA comparison written to " + path.relative(root, outputPath) + "\n");
  process.stdout.write("Rows read: " + result.dataset.trackRowsRead +
    "; exact single matches: " + result.summary.exactSingleMatches +
    "; title-only candidates: " + result.summary.titleOnlyCandidates +
    "; no match: " + result.summary.noMatch + "\n");
}

if (process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href) {
  main().catch((error) => {
    process.stderr.write("FMA comparison failed: " + error.message + "\n");
    process.exitCode = 1;
  });
}
