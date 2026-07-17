import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [{ protocol: "https", hostname: "picsum.photos" }],
  },
  // Default Server Actions body limit is 1 MB. Deliverables can be large
  // design/video files, uploaded several at a time - see MAX_DELIVERABLE_SIZE
  // in src/lib/actions/files.ts for the per-file cap.
  experimental: {
    serverActions: {
      bodySizeLimit: "2gb",
    },
    // Separate from the Server Actions limit above: `src/proxy.ts` matches
    // every /admin and /espace-client request, and Next.js buffers the full
    // body (silently truncated past this cap) to let both proxy and the
    // route handler read it. Without raising this, any upload over the
    // default 10 MB gets cut off mid-stream and the multipart parser throws
    // "Unexpected end of form" downstream.
    proxyClientMaxBodySize: "2gb",
  },
};

export default nextConfig;
