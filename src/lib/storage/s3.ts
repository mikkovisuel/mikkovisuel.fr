import "server-only";
import {
  S3Client,
  PutObjectCommand,
  GetObjectCommand,
  HeadObjectCommand,
  DeleteObjectCommand,
} from "@aws-sdk/client-s3";
import type { StorageAdapter } from "@/lib/storage/adapter";

function streamToBuffer(stream: NodeJS.ReadableStream): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const chunks: Buffer[] = [];
    stream.on("data", (chunk) => chunks.push(Buffer.from(chunk)));
    stream.on("end", () => resolve(Buffer.concat(chunks)));
    stream.on("error", reject);
  });
}

export function createS3Storage(): StorageAdapter {
  const endpoint = process.env.STORAGE_S3_ENDPOINT;
  const region = process.env.STORAGE_S3_REGION ?? "auto";
  const bucket = process.env.STORAGE_S3_BUCKET;
  const accessKeyId = process.env.STORAGE_S3_ACCESS_KEY_ID;
  const secretAccessKey = process.env.STORAGE_S3_SECRET_ACCESS_KEY;

  if (!endpoint || !bucket || !accessKeyId || !secretAccessKey) {
    throw new Error("S3 storage is not fully configured (STORAGE_S3_* env vars).");
  }

  const client = new S3Client({
    endpoint,
    region,
    credentials: { accessKeyId, secretAccessKey },
    // AWS SDK v3 adds a CRC32 checksum header to every S3 request by
    // default (`WHEN_SUPPORTED`). OVH's S3-compatible gateway doesn't
    // handle that header correctly when verifying the request signature,
    // causing every upload to fail with "SignatureDoesNotMatch" (403) —
    // found by reading Scalingo's production logs after a real upload
    // failed. `WHEN_REQUIRED` only adds a checksum when the S3 API
    // actually mandates one, which fixes the signature mismatch.
    requestChecksumCalculation: "WHEN_REQUIRED",
    responseChecksumValidation: "WHEN_REQUIRED",
  });

  return {
    backend: "s3",

    async save(key, data) {
      await client.send(
        new PutObjectCommand({ Bucket: bucket, Key: key, Body: data }),
      );
    },

    async read(key) {
      const response = await client.send(
        new GetObjectCommand({ Bucket: bucket, Key: key }),
      );
      return streamToBuffer(response.Body as NodeJS.ReadableStream);
    },

    async readStream(key, range) {
      const response = await client.send(
        new GetObjectCommand({
          Bucket: bucket,
          Key: key,
          ...(range ? { Range: `bytes=${range.start}-${range.end}` } : {}),
        }),
      );
      // SdkStreamMixin (aws-sdk v3) exposes this helper to get a native web
      // ReadableStream regardless of runtime, instead of manually branching
      // on Node Readable vs Blob.
      return response.Body!.transformToWebStream() as ReadableStream<Uint8Array>;
    },

    async exists(key) {
      try {
        await client.send(new HeadObjectCommand({ Bucket: bucket, Key: key }));
        return true;
      } catch {
        // 404/403 comme n'importe quelle autre erreur : on considère l'objet
        // indisponible. La sauvegarde le consignera comme manquant plutôt que
        // de bloquer sur un flux qui n'arrivera jamais.
        return false;
      }
    },

    async delete(key) {
      await client.send(new DeleteObjectCommand({ Bucket: bucket, Key: key }));
    },
  };
}
