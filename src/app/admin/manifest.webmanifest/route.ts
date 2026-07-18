import { NextResponse } from "next/server";

// A distinct manifest from the client-facing one (app/manifest.ts): scoped
// to /admin so it doesn't show up as installable anywhere else, and only
// ever fetched by an already-authenticated admin (proxy.ts requires a
// session for every /admin/* route, this one included).
export function GET() {
  return NextResponse.json(
    {
      name: "Mikko Visuel — Admin",
      short_name: "Mikko Admin",
      description: "Tableau de bord d'administration Mikko Visuel : clients, tâches, documents, portfolio.",
      start_url: "/admin",
      scope: "/admin",
      display: "standalone",
      lang: "fr",
      background_color: "#14141a",
      theme_color: "#14141a",
      icons: [
        { src: "/icons/icon-admin-192.png", sizes: "192x192", type: "image/png", purpose: "any" },
        { src: "/icons/icon-admin-512.png", sizes: "512x512", type: "image/png", purpose: "any" },
        {
          src: "/icons/icon-admin-maskable-512.png",
          sizes: "512x512",
          type: "image/png",
          purpose: "maskable",
        },
      ],
    },
    { headers: { "Content-Type": "application/manifest+json" } },
  );
}
