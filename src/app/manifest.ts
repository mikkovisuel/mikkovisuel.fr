import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Mikko Visuel — Espace client",
    short_name: "Mikko Visuel",
    description:
      "Accédez à votre espace client Mikko Visuel : suivi de projet, validation des BAT, livrables et documents administratifs.",
    start_url: "/espace-client",
    // Restreint volontairement au périmètre réel de cette PWA (l'espace
    // client). Avec `scope: "/"`, ce manifest revendiquait tout le domaine —
    // y compris /admin, qui a son propre manifest avec son propre scope
    // (voir src/app/admin/manifest.webmanifest) — et les navigateurs
    // associaient alors /admin à l'app "espace client" déjà installée au
    // lieu de proposer d'installer l'app admin séparément.
    scope: "/espace-client",
    display: "standalone",
    lang: "fr",
    background_color: "#f7f6f3",
    theme_color: "#dded2e",
    icons: [
      { src: "/icons/icon-192.png", sizes: "192x192", type: "image/png", purpose: "any" },
      { src: "/icons/icon-512.png", sizes: "512x512", type: "image/png", purpose: "any" },
      {
        src: "/icons/icon-maskable-512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "maskable",
      },
    ],
  };
}
