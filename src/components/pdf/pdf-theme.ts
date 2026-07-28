import path from "node:path";
import { Font } from "@react-pdf/renderer";

// Même Clash Display auto-hébergée que le site (voir src/app/fonts), mais en
// .ttf plutôt que le .woff2 utilisé côté web : fontkit (utilisé par
// react-pdf) décompresse mal certaines tables de ce woff2 particulier — les
// mots affichaient des espaces parasites ("af che" au lieu de "affiche").
// Les .ttf sont une simple décompression du même fichier (`fonttools
// ttLib.woff2 decompress`), pas une police différente. Seuls les titres
// utilisent Clash Display, le corps de texte reste sur Helvetica (intégrée à
// react-pdf) pour ne pas dépendre d'un second fichier de police à charger
// (Manrope vient de next/font/google côté web, pas d'un fichier statique
// simple à référencer ici). Partagé entre tous les documents PDF du projet
// (rapport de tâches, guide client...) pour ne pas dupliquer
// `Font.register` — l'appeler deux fois avec la même famille est inoffensif,
// mais ce module garantit que chaque document importe la même définition.
let fontsRegistered = false;
export function registerPdfFonts() {
  if (fontsRegistered) return;
  Font.register({
    family: "ClashDisplay",
    fonts: [
      { src: path.join(process.cwd(), "src/app/fonts/ClashDisplay-Regular.ttf"), fontWeight: 400 },
      { src: path.join(process.cwd(), "src/app/fonts/ClashDisplay-Bold.ttf"), fontWeight: 700 },
    ],
  });
  fontsRegistered = true;
}

// Reprend les tokens de `globals.css` (thème sombre) — la DA du site, mais
// en valeurs fixes : un PDF n'a pas de media query ni de bascule clair/
// sombre, il fige un des deux rendus.
export const PDF_COLORS = {
  surface: "#0b0b0d",
  surfaceElevated: "#17171b",
  ink: "#f5f4f2",
  inkMuted: "#a1a1aa",
  line: "#2a2a2f",
  accent: "#dded2e",
  accentInk: "#14141a",
};

// Mêmes teintes que `PALETTE_BADGE_CLASSES` (src/lib/dropdown-lists.ts),
// réécrites en couleurs fixes adaptées à un fond sombre — react-pdf n'a pas
// accès aux classes Tailwind ni aux variables CSS du site.
export const PDF_STATUS_COLORS: Record<string, { bg: string; text: string }> = {
  slate: { bg: "rgba(148,163,184,0.18)", text: "#cbd5e1" },
  blue: { bg: "rgba(59,130,246,0.2)", text: "#93c5fd" },
  emerald: { bg: "rgba(16,185,129,0.2)", text: "#6ee7b7" },
  amber: { bg: "rgba(245,158,11,0.2)", text: "#fcd34d" },
  rose: { bg: "rgba(244,63,94,0.2)", text: "#fda4af" },
  violet: { bg: "rgba(139,92,246,0.2)", text: "#c4b5fd" },
  orange: { bg: "rgba(249,115,22,0.2)", text: "#fdba74" },
  cyan: { bg: "rgba(6,182,212,0.2)", text: "#67e8f9" },
};
