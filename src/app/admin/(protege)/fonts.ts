import localFont from "next/font/local";

// Roboto pour le back-office « Workspace » (2026-10-20), servie par le site
// lui-même : `next/font/google` télécharge la police chez Google au moment du
// build, et un déploiement a déjà échoué pour ça (Manrope). Fichier variable
// (graisses 100 à 900), jeu « latin » : il couvre tout le français — accents,
// œ, guillemets et espaces fines.
export const roboto = localFont({
  src: "../../../../node_modules/@fontsource-variable/roboto/files/roboto-latin-wght-normal.woff2",
  weight: "100 900",
  style: "normal",
  variable: "--font-roboto",
  display: "swap",
  fallback: ["Arial", "Helvetica", "sans-serif"],
});
