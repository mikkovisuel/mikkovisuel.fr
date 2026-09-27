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

// Démo interactive de l'application pour clubs, servie sous /demo (voir
// src/app/application-club et public/demo). C'est une application web
// construite à part, dans le dépôt de l'application
// (`pnpm demo:site` dans apps/mobile), puis déposée ici telle quelle : elle
// appelle l'API de démonstration, hébergée sur son propre domaine. Cette
// origine doit correspondre à l'adresse figée dans la démo à sa
// construction ; en changer, c'est reconstruire la démo.
const DEMO_API_ORIGIN = "https://mikkoclub-demo-api.osc-fr1.scalingo.io";

const cspDirectives = [
  "default-src 'self'",
  `script-src 'self' 'unsafe-inline'${isDev ? " 'unsafe-eval'" : ""}`,
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data: blob: https://picsum.photos",
  "font-src 'self'",
  `connect-src 'self' ${DEMO_API_ORIGIN}`,
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
  // La démo est une application d'une seule page : ses fichiers
  // (public/demo/_expo, public/demo/assets) sont servis tels quels, et toute
  // autre adresse sous /demo (/demo, /demo/agenda...) renvoie sa page
  // d'entrée, qui choisit l'écran. `afterFiles` : ces réécritures ne passent
  // qu'après les fichiers de public/, elles ne masquent donc jamais un
  // fichier réel.
  async rewrites() {
    return {
      beforeFiles: [],
      afterFiles: [
        { source: "/demo", destination: "/demo/index.html" },
        { source: "/demo/:path*", destination: "/demo/index.html" },
      ],
      fallback: [],
    };
  },
  // Default Server Actions body limit is 1 MB. Deliverables can be several
  // files at a time - see MAX_DELIVERABLE_SIZE / MAX_UPLOAD_TOTAL_SIZE in
  // src/lib/actions/files.ts for the caps actually enforced.
  //
  // Ces deux valeurs étaient à "2gb" jusqu'au 2026-08-23. C'était intenable :
  // le corps de la requête est **bufferisé en mémoire**, sur un conteneur qui
  // n'a que 512 Mo au total. Autoriser 2 Go revenait à autoriser n'importe
  // quel envoi à tuer le processus. Elles sont désormais calées juste
  // au-dessus du plafond applicatif (80 Mo cumulés) : la marge couvre le
  // surcoût d'encodage multipart, sans laisser passer un envoi que la machine
  // ne pourrait pas absorber.
  experimental: {
    serverActions: {
      bodySizeLimit: "100mb",
    },
    // Separate from the Server Actions limit above: `src/proxy.ts` matches
    // every /admin and /espace-client request, and Next.js buffers the full
    // body (silently truncated past this cap) to let both proxy and the
    // route handler read it. Without raising this, any upload over the
    // default 10 MB gets cut off mid-stream and the multipart parser throws
    // "Unexpected end of form" downstream.
    proxyClientMaxBodySize: "100mb",
  },
};

export default nextConfig;
