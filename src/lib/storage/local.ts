import "server-only";
import { mkdir, readFile, writeFile, unlink, access } from "node:fs/promises";
import { createReadStream } from "node:fs";
import { Readable } from "node:stream";
import path from "node:path";
import type { StorageAdapter } from "@/lib/storage/adapter";

// Dev-only: writes outside /public, to a gitignored ./storage folder. Never
// use this in production — Scalingo (and most PaaS container hosts) have
// ephemeral disk, so anything written here is lost on the next restart. See
// src/instrumentation.ts, which refuses to boot in production without S3
// configured.
const STORAGE_ROOT = path.join(process.cwd(), "storage");

function resolvePath(key: string) {
  const resolved = path.join(STORAGE_ROOT, key);
  if (!resolved.startsWith(STORAGE_ROOT)) {
    throw new Error("Invalid storage key.");
  }
  return resolved;
}

export const localStorage: StorageAdapter = {
  backend: "local",

  async save(key, data) {
    const filePath = resolvePath(key);
    await mkdir(path.dirname(filePath), { recursive: true });
    await writeFile(filePath, data);
  },

  async read(key) {
    return readFile(resolvePath(key));
  },

  async readStream(key, range) {
    const nodeStream = range
      ? createReadStream(resolvePath(key), { start: range.start, end: range.end })
      : createReadStream(resolvePath(key));
    return Readable.toWeb(nodeStream) as ReadableStream<Uint8Array>;
  },

  async exists(key) {
    return access(resolvePath(key))
      .then(() => true)
      .catch(() => false);
  },

  async delete(key) {
    await unlink(resolvePath(key)).catch(() => {});
  },
};
