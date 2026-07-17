export type StorageBackend = "local" | "s3";

export interface StorageAdapter {
  backend: StorageBackend;
  save(key: string, data: Buffer): Promise<void>;
  read(key: string): Promise<Buffer>;
  // Streams the file (optionally a byte range) without buffering it whole in
  // memory — needed to serve/scrub large video deliverables (up to 500 Mo).
  readStream(key: string, range?: { start: number; end: number }): Promise<ReadableStream<Uint8Array>>;
  delete(key: string): Promise<void>;
}
