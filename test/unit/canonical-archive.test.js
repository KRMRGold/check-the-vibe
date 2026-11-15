import test from "node:test";
import assert from "node:assert/strict";
import { mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { Readable } from "node:stream";
import { createZstdCompress } from "node:zlib";
import { listZstdTarMembers, openZstdTarMember } from "../../src/main/musicbrainz/canonical-archive.js";

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

async function compressZstd(bytes) {
  const chunks = [];
  for await (const chunk of Readable.from([bytes]).pipe(createZstdCompress())) {
    chunks.push(Buffer.from(chunk));
  }
  return Buffer.concat(chunks);
}

async function withArchive(bytes, run) {
  const directory = await mkdtemp(join(tmpdir(), "ctv-zstd-tar-"));
  const archivePath = join(directory, "fixture.tar.zst");
  try {
    await writeFile(archivePath, await compressZstd(bytes));
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


test("streams one selected TAR member without extracting it", async () => {
  const expected = Buffer.from("selected CSV member\\nwith multiple rows\\n");
  const archive = makeArchive([
    tarMember("snapshot/COPYING", "license text"),
    tarMember("snapshot/canonical/data.csv", expected.toString("utf8")),
    tarMember("snapshot/after.txt", "trailing member")
  ]);

  await withArchive(archive, async (archivePath) => {
    const chunks = [];
    for await (const chunk of openZstdTarMember(archivePath, "snapshot/canonical/data.csv")) {
      chunks.push(Buffer.from(chunk));
    }
    assert.deepEqual(Buffer.concat(chunks), expected);
  });
});

test("rejects a selected TAR member that does not exist", async () => {
  const archive = makeArchive([tarMember("snapshot/TIMESTAMP", "2026-11-03")]);

  await withArchive(archive, async (archivePath) => {
    await assert.rejects(
      async () => {
        for await (const _chunk of openZstdTarMember(archivePath, "missing.csv")) {
          // Consume the stream so its missing-member error is observed.
        }
      },
      /TAR member "missing.csv" was not found/
    );
  });
});


test("rejects a selected TAR member whose declared payload is truncated", async () => {
  const header = tarHeader("snapshot/data.csv", 20);
  const partialPayload = Buffer.from("short");
  const archive = Buffer.concat([header, partialPayload]);

  await withArchive(archive, async (archivePath) => {
    await assert.rejects(
      async () => {
        for await (const _chunk of openZstdTarMember(archivePath, "snapshot/data.csv")) {
          // Consume the stream so its truncation error is observed.
        }
      },
      /TAR member "snapshot\/data.csv" is truncated/
    );
  });
});


function paxPathRecord(value) {
  const record = ` path=${value}\n`;
  let length = Buffer.byteLength(record) + 2;
  while (true) {
    const next = Buffer.byteLength(String(length)) + Buffer.byteLength(record);
    if (next === length) return Buffer.from(`${length}${record}`, "utf8");
    length = next;
  }
}

test("resolves PAX path metadata when listing and streaming a member", async () => {
  const path = "snapshot/canonical/日本語-recordings.csv";
  const payload = Buffer.from("recording_mbid,recording_name\n");
  const archive = makeArchive([
    tarMember("PaxHeaders/data", paxPathRecord(path), "x"),
    tarMember("placeholder.csv", payload.toString("utf8"))
  ]);

  await withArchive(archive, async (archivePath) => {
    const members = await listZstdTarMembers(archivePath);
    assert.equal(members[0].name, path);
    const chunks = [];
    for await (const chunk of openZstdTarMember(archivePath, path)) chunks.push(Buffer.from(chunk));
    assert.deepEqual(Buffer.concat(chunks), payload);
  });
});

test("resolves GNU long-name metadata when listing and streaming a member", async () => {
  const path = "snapshot/canonical/" + "recordings-".repeat(12) + "data.csv";
  const payload = Buffer.from("id,name\n1,example\n");
  const archive = makeArchive([
    tarMember("././@LongLink", Buffer.from(path + "\0"), "L"),
    tarMember("short.csv", payload.toString("utf8"))
  ]);

  await withArchive(archive, async (archivePath) => {
    const members = await listZstdTarMembers(archivePath);
    assert.equal(members[0].name, path);
    const chunks = [];
    for await (const chunk of openZstdTarMember(archivePath, path)) chunks.push(Buffer.from(chunk));
    assert.deepEqual(Buffer.concat(chunks), payload);
  });
});
