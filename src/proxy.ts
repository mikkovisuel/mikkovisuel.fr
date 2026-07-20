import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

// Optimistic redirect only — checks cookie presence, never the database.
// This is NOT the security boundary; see src/lib/dal.ts for the real
// authorization checks that run in every Server Action / Route Handler /
// protected Server Component.
const SESSION_COOKIE = "session_token";

// Le manifest et l'icône admin doivent rester accessibles sans session : ce
// sont des assets PWA (manifest.webmanifest, icon.png, générés par les
// conventions de fichiers Next.js sous src/app/admin/) que le navigateur va
// chercher lui-même pour évaluer l'installabilité de l'app — y compris
// depuis /admin/connexion, avant toute authentification. Sans cette
// exception, la requête était redirigée vers une page HTML (la connexion)
// au lieu de renvoyer le JSON/l'image attendus, ce qui invalide le manifest
// aux yeux du navigateur et empêche purement et simplement l'installation.
const ADMIN_PUBLIC_PATHS = new Set([
  "/admin/connexion",
  "/admin/mot-de-passe-oublie",
  "/admin/manifest.webmanifest",
  "/admin/icon.png",
]);
const CLIENT_PUBLIC_PATHS = new Set([
  "/espace-client/connexion",
  "/espace-client/mot-de-passe-oublie",
]);

export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const hasSession = request.cookies.has(SESSION_COOKIE);

  if (hasSession) {
    return NextResponse.next();
  }

  const isAdminReset = pathname.startsWith("/admin/reinitialiser-mot-de-passe");
  if (
    pathname.startsWith("/admin") &&
    !ADMIN_PUBLIC_PATHS.has(pathname) &&
    !isAdminReset
  ) {
    return NextResponse.redirect(new URL("/admin/connexion", request.url));
  }

  const isClientReset = pathname.startsWith("/espace-client/reinitialiser-mot-de-passe");
  if (
    pathname.startsWith("/espace-client") &&
    !CLIENT_PUBLIC_PATHS.has(pathname) &&
    !isClientReset
  ) {
    return NextResponse.redirect(new URL("/espace-client/connexion", request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/admin/:path*", "/espace-client/:path*"],
};
