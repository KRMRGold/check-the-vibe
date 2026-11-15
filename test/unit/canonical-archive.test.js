import test from "node:test";
import assert from "node:assert/strict";
import { mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { createZstdCompressSync } from "node:zlib";
import { listZstdTarMembers } from "../../src/main/musicbrainz/canonical-archive.js";

function tarHeader(name, size, type = "0") {
  const header = Buffer.alloc(512);
  header.write(name, 0, 100, "utf8");
  header.write("0000644\0", 100, 8, "ascii");
  header.write("0000000\0", 108, 8, "ascii");
  header.write("0000000\0", 116, 8, "ascii");
  header.write(size.toString(8).padStart(11, "0") + "\0", 124, 12, "ascii");
  header.fill(32, 148, 156);
  header[156] = type.charCodeAt(0);
  header.write("ustar\0", 257, 6, "ascii");
  header.write("00", 263, 2, "ascii");
  let checksum = 0;
  for (const byte of header) checksum += byte;
  header.write(checksum.toString(8).padStart(6, "0") + "\0 ", 148, 8, "ascii");
  return header;
}

function tarMember(name, content, type = "0") {
  const body = Buffer.from(content);
  const padding = Buffer.alloc((512 - (body.length % 512)) % 512);
  return Buffer.concat([tarHeader(name, body.length, type), body, padding]);
}

function makeArchive(members) {
  return Buffer.concat([...members, Buffer.alloc(1024)]);
}

async function withArchive(bytes, run) {
  const directory = await mkdtemp(join(tmpdir(), "ctv-zstd-tar-"));
  const archivePath = join(directory, "fixture.tar.zst");
  try {
    await writeFile(archivePath, createZstdCompressSync(bytes));
    await run(archivePath);
  } finally {
    await rm(directory, { recursive: true, force: true });
  }
}

test("lists Zstandard TAR members without extracting their payloads", async () => {
  const archive = makeArchive([
    tarMember("snapshot/TIMESTAMP", "2026-11-03"),
    tarMember("snapshot/canonical/data.csv", "header\nrow\n")
  ]);

  await withArchive(archive, async (archivePath) => {
    const members = await listZstdTarMembers(archivePath);
    assert.deepEqual(members, [
      { name: "snapshot/TIMESTAMP", size: 10, type: "file" },
      { name: "snapshot/canonical/data.csv", size: 11, type: "file" }
    ]);
  });
});

test("uses the USTAR prefix field for long member paths", async () => {
  const header = tarHeader("data.csv", 0);
  header.write("snapshot/canonical", 345, 155, "utf8");
  header.fill(32, 148, 156);
  let checksum = 0;
  for (const byte of header) checksum += byte;
  header.write(checksum.toString(8).padStart(6, "0") + "\0 ", 148, 8, "ascii");

  await withArchive(makeArchive([header]), async (archivePath) => {
    const members = await listZstdTarMembers(archivePath);
    assert.equal(members[0].name, "snapshot/canonical/data.csv");
  });
});

test("rejects a TAR member with an invalid header checksum", async () => {
  const header = tarHeader("broken.txt", 0);
  header[0] ^= 1;

  await withArchive(makeArchive([header]), async (archivePath) => {
    await assert.rejects(listZstdTarMembers(archivePath), /header checksum is invalid/);
  });
});

test("rejects a truncated TAR archive", async () => {
  const truncated = tarHeader("partial.txt", 20);

  await withArchive(truncated, async (archivePath) => {
    await assert.rejects(listZstdTarMembers(archivePath), /ended before a complete TAR end marker/);
  });
});
