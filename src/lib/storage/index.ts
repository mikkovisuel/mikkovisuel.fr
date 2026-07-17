import "server-only";
import type { StorageAdapter } from "@/lib/storage/adapter";
import { localStorage } from "@/lib/storage/local";
import { createS3Storage } from "@/lib/storage/s3";

function hasS3Config() {
  return Boolean(
    process.env.STORAGE_S3_ENDPOINT &&
      process.env.STORAGE_S3_BUCKET &&
      process.env.STORAGE_S3_ACCESS_KEY_ID &&
      process.env.STORAGE_S3_SECRET_ACCESS_KEY,
  );
}

let cached: StorageAdapter | undefined;

export function getStorageAdapter(): StorageAdapter {
  if (!cached) {
    cached = hasS3Config() ? createS3Storage() : localStorage;
  }
  return cached;
}
