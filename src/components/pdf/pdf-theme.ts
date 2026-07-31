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
// Les 24 entrées de `PALETTE_COLORS` doivent figurer ici : les appelants
// retombent sur `slate` si une clé manque, donc un oubli ne casserait pas
// le PDF mais afficherait discrètement la mauvaise couleur.
export const PDF_STATUS_COLORS: Record<string, { bg: string; text: string }> = {
  slate: { bg: "rgba(148,163,184,0.18)", text: "#cbd5e1" },
  gray: { bg: "rgba(107,114,128,0.2)", text: "#d1d5db" },
  stone: { bg: "rgba(120,113,108,0.2)", text: "#d6d3d1" },
  red: { bg: "rgba(239,68,68,0.2)", text: "#fca5a5" },
  rose: { bg: "rgba(244,63,94,0.2)", text: "#fda4af" },
  pink: { bg: "rgba(236,72,153,0.2)", text: "#f9a8d4" },
  fuchsia: { bg: "rgba(217,70,239,0.2)", text: "#f0abfc" },
  wine: { bg: "rgba(159,18,57,0.28)", text: "#fda4af" },
  orange: { bg: "rgba(249,115,22,0.2)", text: "#fdba74" },
  amber: { bg: "rgba(245,158,11,0.2)", text: "#fcd34d" },
  yellow: { bg: "rgba(234,179,8,0.2)", text: "#fde047" },
  brown: { bg: "rgba(146,64,14,0.28)", text: "#fcd34d" },
  lime: { bg: "rgba(132,204,22,0.2)", text: "#bef264" },
  green: { bg: "rgba(34,197,94,0.2)", text: "#86efac" },
  emerald: { bg: "rgba(16,185,129,0.2)", text: "#6ee7b7" },
  teal: { bg: "rgba(20,184,166,0.2)", text: "#5eead4" },
  pine: { bg: "rgba(6,95,70,0.32)", text: "#6ee7b7" },
  cyan: { bg: "rgba(6,182,212,0.2)", text: "#67e8f9" },
  sky: { bg: "rgba(14,165,233,0.2)", text: "#7dd3fc" },
  blue: { bg: "rgba(59,130,246,0.2)", text: "#93c5fd" },
  indigo: { bg: "rgba(99,102,241,0.2)", text: "#a5b4fc" },
  navy: { bg: "rgba(30,64,175,0.3)", text: "#93c5fd" },
  violet: { bg: "rgba(139,92,246,0.2)", text: "#c4b5fd" },
  purple: { bg: "rgba(168,85,247,0.2)", text: "#d8b4fe" },
};
