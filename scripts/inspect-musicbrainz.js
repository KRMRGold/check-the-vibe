#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import { spawn, execFile } from "node:child_process";
import { promisify } from "node:util";
import { createInterface } from "node:readline";
import { pathToFileURL } from "node:url";

const execFileAsync = promisify(execFile);

export function buildTarArgs(operation, archivePath, member) {
  if (operation === "list") return ["--force-local", "-tf", archivePath];
  if (operation === "extract") {
    if (!member) throw new Error("A member name is required to extract an archive entry.");
    return ["--force-local", "-xOf", archivePath, member];
  }
  throw new Error(`Unsupported tar operation: ${operation}`);
}

export function describeMalformedJsonLine(line, lineNumber, error) {
  const match = String(error?.message ?? error).match(/position (\d+)/i);
  const position = match ? Number(match[1]) : 0;
  const start = Math.max(0, position - 120);
  const end = Math.min(line.length, position + 120);
  return {
    line: lineNumber,
    message: String(error?.message ?? error),
    length: line.length,
    errorPosition: position,
    excerpt: line.slice(start, end),
    ending: line.slice(-160)
  };
}

export async function* assembleJsonlRecords(physicalLines) {
  let buffer = "";
  let inString = false;
  let escaped = false;
  let recordStartLine = 0;
  let physicalLineNumber = 0;

  for await (const physicalLine of physicalLines) {
    physicalLineNumber += 1;
    if (!buffer && !physicalLine.trim()) continue;
    if (!buffer) recordStartLine = physicalLineNumber;

    for (const character of physicalLine) {
      buffer += character;
      if (inString) {
        if (escaped) escaped = false;
        else if (character === "\\") escaped = true;
        else if (character === '"') inString = false;
      } else if (character === '"') {
        inString = true;
      }
    }

    if (inString) {
      // Preserve literal physical newlines found inside source annotation strings.
      buffer += "\\n";
      continue;
    }

    if (buffer.trim()) yield { line: buffer, lineNumber: recordStartLine };
    buffer = "";
    escaped = false;
    recordStartLine = 0;
  }

  if (buffer.trim()) yield { line: buffer, lineNumber: recordStartLine };
}

export function normalizeText(value) {
  return String(value ?? "").normalize("NFKD").replace(/[\u0300-\u036f]/g, "")
    .toLowerCase().replace(/&/g, " and ").replace(/[^a-z0-9]+/g, " ")
    .trim().replace(/\s+/g, " ");
}

export function getRecordingArtistCredit(recording) {
  const credit = recording?.["artist-credit"] ?? recording?.artist_credit ?? recording?.artistCredit;
  if (typeof credit === "string") return credit.trim();
  if (!Array.isArray(credit)) {
    if (credit && typeof credit === "object") return String(credit.name ?? credit.artist?.name ?? "").trim();
    return "";
  }
  return credit.map((part) => {
    if (typeof part === "string") return part;
    if (!part || typeof part !== "object") return "";
    const name = part.name ?? part.artist?.name ?? "";
    const join = part.joinphrase ?? part.join_phrase ?? part.joinPhrase ?? "";
    return String(name) + String(join);
  }).join("").trim();
}

export function parseChecksumManifest(contents, archiveName) {
  const target = path.posix.basename(String(archiveName).replaceAll("\\", "/"));
  for (const line of String(contents).split(/\r?\n/)) {
    const match = line.trim().match(/^([a-f\d]{64})\s+\*?(.+)$/i);
    if (!match) continue;
    const listed = path.posix.basename(match[2].trim().replaceAll("\\", "/"));
    if (listed === target) return match[1].toLowerCase();
  }
  throw new Error(`No SHA-256 entry for ${target} was found in the checksum manifest.`);
}

export async function sha256File(filePath) {
  const hash = crypto.createHash("sha256");
  for await (const chunk of fs.createReadStream(filePath)) hash.update(chunk);
  return hash.digest("hex");
}

async function listArchiveMembers(archivePath) {
  try {
    const { stdout } = await execFileAsync("tar", buildTarArgs("list", archivePath), {
      encoding: "utf8", windowsHide: true, maxBuffer: 4 * 1024 * 1024
    });
    return stdout.split(/\r?\n/).map((name) => name.trim()).filter(Boolean);
  } catch (error) {
    const detail = error.stderr?.toString?.().trim() || error.message;
    throw new Error(`Could not list the .tar.xz archive using the system tar command: ${detail}`);
  }
}

function chooseJsonlMember(members) {
  const candidates = members.filter((name) => {
    const base = path.posix.basename(name).toLowerCase();
    return base === "recording" || base === "recording.jsonl" || base === "recording.ndjson" ||
      base.endsWith(".jsonl") || base.endsWith(".ndjson");
  });
  if (candidates.length === 1) return candidates[0];
  if (candidates.length > 1) {
    const exact = candidates.find((name) => path.posix.basename(name).toLowerCase() === "recording");
    if (exact) return exact;
  }
  throw new Error(`Expected one recording JSONL member; found ${candidates.length}. Archive members: ${members.slice(0, 20).join(", ")}`);
}

function makeComparison(sample) {
  const states = sample.map((item) => ({
    item,
    title: normalizeText(item.title),
    artist: normalizeText(item.artist),
    exactCount: 0,
    titleOnlyCount: 0,
    exactExamples: [],
    titleOnlyExamples: []
  }));
  const byTitle = new Map();
  for (const state of states) {
    if (!byTitle.has(state.title)) byTitle.set(state.title, []);
    byTitle.get(state.title).push(state);
  }
  return {
    add(record) {
      const title = String(record.title ?? "");
      const targets = byTitle.get(normalizeText(title));
      if (!targets) return;
      const artist = getRecordingArtistCredit(record);
      const artistKey = normalizeText(artist);
      const example = {
        id: record.id ?? null,
        title,
        artistCredit: artist,
        lengthMs: record.length ?? null,
        isrcCount: Array.isArray(record.isrcs) ? record.isrcs.length : null
      };
      for (const state of targets) {
        if (artistKey && artistKey === state.artist) {
          state.exactCount += 1;
          if (state.exactExamples.length < 3) state.exactExamples.push(example);
        } else {
          state.titleOnlyCount += 1;
          if (state.titleOnlyExamples.length < 3) state.titleOnlyExamples.push(example);
        }
      }
    },
    results() {
      return states.map((state) => ({
        sampleId: state.item.id,
        inputArtist: state.item.artist,
        inputTitle: state.item.title,
        matchStatus: state.exactCount === 1 ? "exact_single"
          : state.exactCount > 1 ? "multiple_exact"
          : state.titleOnlyCount === 1 ? "title_only_candidate"
          : state.titleOnlyCount > 1 ? "multiple_title_only_candidates" : "no_match",
        exactMatchCount: state.exactCount,
        titleOnlyCandidateCount: state.titleOnlyCount,
        examples: state.exactCount ? state.exactExamples : state.titleOnlyExamples
      }));
    }
  };
}

async function inspectJsonlMember(archivePath, member, sample) {
  const child = spawn("tar", buildTarArgs("extract", archivePath, member), { windowsHide: true, stdio: ["ignore", "pipe", "pipe"] });
  let stderr = "";
  let spawnError = null;
  child.stderr.setEncoding("utf8");
  child.stderr.on("data", (chunk) => { stderr += chunk; });
  const exitPromise = new Promise((resolve) => {
    child.once("error", (error) => { spawnError = error; });
    child.once("close", (code) => resolve(code));
  });
  const lines = createInterface({ input: child.stdout, crlfDelay: Infinity });
  const comparison = makeComparison(sample);
  const fieldCounts = { id: 0, title: 0, "artist-credit": 0, length: 0, isrcs: 0 };
  let recordsRead = 0;
  let firstRecordKeys = [];
  let firstRecordExample = null;
  let firstMalformedLine = null;
  for await (const { line, lineNumber } of assembleJsonlRecords(lines)) {
    let record;
    try { record = JSON.parse(line); }
    catch (error) {
      firstMalformedLine = describeMalformedJsonLine(line, lineNumber, error);
      child.kill();
      break;
    }
    recordsRead += 1;
    if (recordsRead === 1) {
      firstRecordKeys = Object.keys(record).sort();
      firstRecordExample = {
        id: record.id ?? null,
        title: record.title ?? null,
        artistCredit: getRecordingArtistCredit(record) || null,
        lengthMs: record.length ?? null,
        isrcCount: Array.isArray(record.isrcs) ? record.isrcs.length : null
      };
    }
    if (record.id != null) fieldCounts.id += 1;
    if (record.title != null) fieldCounts.title += 1;
    if (record["artist-credit"] != null || record.artist_credit != null || record.artistCredit != null) fieldCounts["artist-credit"] += 1;
    if (record.length != null) fieldCounts.length += 1;
    if (Array.isArray(record.isrcs) && record.isrcs.length) fieldCounts.isrcs += 1;
    comparison.add(record);
  }
  lines.close();
  const exitCode = await exitPromise;
  if (spawnError) throw new Error(`Could not start the system tar command: ${spawnError.message}`);
  if (firstMalformedLine) throw new Error(`Malformed JSON on recording line ${firstMalformedLine.line} (length ${firstMalformedLine.length}, error position ${firstMalformedLine.errorPosition}): ${firstMalformedLine.message}. Excerpt: ${JSON.stringify(firstMalformedLine.excerpt)}; ending: ${JSON.stringify(firstMalformedLine.ending)}`);
  if (exitCode !== 0) throw new Error(`tar could not extract ${member} (exit ${exitCode}): ${stderr.trim()}`);
  if (recordsRead === 0) throw new Error("The recording JSONL member contained no records.");

  return {
    recordsRead,
    firstRecordKeys,
    firstRecordExample,
    fieldCoverage: Object.fromEntries(Object.entries(fieldCounts).map(([key, count]) => [key, { count, percent: Number((count / recordsRead * 100).toFixed(2)) }])),
    sampleMatches: comparison.results()
  };
}

function getArg(name, fallback) {
  const index = process.argv.indexOf(name);
  return index === -1 ? fallback : process.argv[index + 1];
}

export async function inspectMusicBrainz({ archivePath, checksumPath, samplePath }) {
  for (const file of [archivePath, checksumPath, samplePath]) {
    if (!fs.existsSync(file)) throw new Error(`Missing required file: ${file}`);
  }
  const expectedHash = parseChecksumManifest(fs.readFileSync(checksumPath, "utf8"), archivePath);
  const actualHash = await sha256File(archivePath);
  if (actualHash !== expectedHash) {
    throw new Error(`SHA-256 mismatch. Expected ${expectedHash}; got ${actualHash}. Do not inspect this archive until the download is verified.`);
  }
  const sample = JSON.parse(fs.readFileSync(samplePath, "utf8"));
  if (!Array.isArray(sample) || sample.length === 0) throw new Error("The sample file must contain a non-empty JSON array.");
  const members = await listArchiveMembers(archivePath);
  const member = chooseJsonlMember(members);
  const inspection = await inspectJsonlMember(archivePath, member, sample);
  return {
    dataset: "MusicBrainz recording JSON dump",
    archive: path.basename(archivePath),
    sha256: actualHash,
    archiveMembers: members,
    recordingMember: member,
    licenseScope: "MusicBrainz JSON dump listing identifies these entity dumps as CC0; this utility reads recording entity data only.",
    ...inspection
  };
}

async function main() {
  if (process.argv.includes("--help")) {
    process.stdout.write("Usage: node scripts/inspect-musicbrainz.js [--archive <path>] [--checksums <path>] [--sample <path>]\n");
    return;
  }
  const root = process.cwd();
  const archivePath = path.resolve(root, getArg("--archive", "data/cache/musicbrainz/recording.tar.xz"));
  const checksumPath = path.resolve(root, getArg("--checksums", "data/cache/musicbrainz/SHA256SUMS"));
  const samplePath = path.resolve(root, getArg("--sample", "data/samples/fma-sample-10.json"));
  const result = await inspectMusicBrainz({ archivePath, checksumPath, samplePath });
  process.stdout.write(JSON.stringify(result, null, 2) + "\n");
}

if (process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href) {
  main().catch((error) => {
    process.stderr.write("MusicBrainz inspection failed: " + error.message + "\n");
    process.exitCode = 1;
  });
}
