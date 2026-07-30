export type StorageBackend = "local" | "s3";

export interface StorageAdapter {
  backend: StorageBackend;
  save(key: string, data: Buffer): Promise<void>;
  read(key: string): Promise<Buffer>;
  // Streams the file (optionally a byte range) without buffering it whole in
  // memory — needed to serve/scrub large video deliverables (up to 500 Mo).
  readStream(key: string, range?: { start: number; end: number }): Promise<ReadableStream<Uint8Array>>;
  // Présence d'un objet, sans le lire. Nécessaire à la sauvegarde complète
  // (src/lib/backup.ts) : `readStream` sur un fichier absent ne rejette pas,
  // il rend un flux qui émettra l'erreur plus tard — ce qui bloquait
  // l'archive indéfiniment au lieu d'échouer proprement.
  exists(key: string): Promise<boolean>;
  delete(key: string): Promise<void>;
}
