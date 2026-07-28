import type { NextConfig } from "next";

// CSP posée en Report-Only pour l'instant (2026-07-28, choix explicite du
// client) : elle n'bloque rien, le navigateur envoie juste des rapports de
// violation dans sa console — le temps de confirmer qu'aucune ressource
// légitime (Stripe Checkout est un redirect serveur, pas un script
// embarqué ; les polices sont auto-hébergées via next/font, aucune requête
// runtime vers Google Fonts) n'est bloquée avant d'basculer en
// `Content-Security-Policy` bloquante dans une session future. Pas de
// nonce ici (approche "Without Nonces" documentée par Next — voir
// node_modules/next/dist/docs/01-app/02-guides/content-security-policy.md) :
// un CSP à base de nonce imposerait un rendu dynamique sur toute
// l'application, un changement d'architecture plus large que ce qui a été
// validé pour cette passe.
const isDev = process.env.NODE_ENV === "development";
const cspDirectives = [
  "default-src 'self'",
  `script-src 'self' 'unsafe-inline'${isDev ? " 'unsafe-eval'" : ""}`,
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data: blob: https://picsum.photos",
  "font-src 'self'",
  "connect-src 'self'",
  "frame-src 'self'",
  "worker-src 'self'",
  "manifest-src 'self'",
  "object-src 'none'",
  "base-uri 'self'",
  "form-action 'self'",
  "frame-ancestors 'none'",
  "upgrade-insecure-requests",
];
const cspHeaderValue = cspDirectives.join("; ");

const securityHeaders = [
  { key: "Content-Security-Policy-Report-Only", value: cspHeaderValue },
  // 2 ans + sous-domaines, sans `preload` (irréversible sans démarche
  // externe auprès des navigateurs — pas activé sans décision explicite).
  { key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains" },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "X-Frame-Options", value: "DENY" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  {
    key: "Permissions-Policy",
    value: "camera=(), microphone=(), geolocation=(), interest-cohort=()",
  },
];

const nextConfig: NextConfig = {
  poweredByHeader: false,
  images: {
    remotePatterns: [{ protocol: "https", hostname: "picsum.photos" }],
  },
  async headers() {
    return [{ source: "/(.*)", headers: securityHeaders }];
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
