import type { Metadata } from "next";

// Wraps the whole /admin subtree — including /admin/connexion, which the
// (protege) layout below does NOT cover. That gap was the actual bug:
// logging in loads /admin/connexion first (client manifest, since that
// page sat outside the override), then soft-navigates to /admin after
// auth; Chrome's installability can lock onto whichever manifest was
// present on that first hard page load and not pick up the swap made
// during the client-side transition. Declaring the admin manifest here
// instead means every /admin/* entry point, including a fresh load of the
// login page itself, has the right manifest from the start.
export const metadata: Metadata = {
  manifest: "/admin/manifest.webmanifest",
  icons: {
    apple: "/icons/apple-touch-icon-admin.png",
  },
  appleWebApp: {
    title: "Mikko Admin",
    statusBarStyle: "default",
  },
};

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return children;
}
