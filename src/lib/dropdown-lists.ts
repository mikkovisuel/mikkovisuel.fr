// Single source of truth for seeded dropdown lists. `prisma/seed.ts` and any
// application code that branches on a specific status/type import from here,
// so the seed data and the code can never drift apart.

export const TASK_STATUS_LIST_KEY = "task_status";
export const DOCUMENT_TYPE_LIST_KEY = "document_type";
export const PORTFOLIO_CATEGORY_LIST_KEY = "portfolio_category";
export const TASK_TYPE_LIST_KEY = "task_type";
export const TASK_FORMAT_LIST_KEY = "task_format";
export const PROSPECT_STATUS_LIST_KEY = "prospect_status";
export const CLIENT_CATEGORY_LIST_KEY = "client_category";

export const TASK_STATUS = {
  NOUVEAU: "nouveau",
  NON_COMMENCE: "non-commence",
  BLOQUE: "bloque",
  EN_COURS: "en-cours",
  A_VALIDER: "a-valider",
  BAT_VALIDE: "bat-valide",
  A_MODIFIER: "a-modifier",
  TERMINE: "termine",
} as const;

export type TaskStatusSlug = (typeof TASK_STATUS)[keyof typeof TASK_STATUS];

export const DOCUMENT_TYPE = {
  DEVIS: "devis",
  CONTRAT: "contrat",
  FACTURE: "facture",
} as const;

export type DocumentTypeSlug = (typeof DOCUMENT_TYPE)[keyof typeof DOCUMENT_TYPE];

// Cycle demandé par le client le 2026-07-28 : 5 statuts verrouillés pour la
// prospection. "Fermé" = converti en client (voir convertProspectToClient),
// "Archivé" = abandonné/mis de côté sans suppression.
export const PROSPECT_STATUS = {
  A_FAIRE: "a-faire",
  EN_COURS: "en-cours",
  DISCUSSIONS_EN_COURS: "discussions-en-cours",
  FERME: "ferme",
  ARCHIVE: "archive",
} as const;

export type ProspectStatusSlug = (typeof PROSPECT_STATUS)[keyof typeof PROSPECT_STATUS];

// Palette fixe dans laquelle l'admin choisit (§7.2 du cahier des charges),
// élargie de 8 à 24 teintes le 2026-07-31 — le client manquait de couleurs
// pour distinguer ses listes.
//
// Chaque classe Tailwind ci-dessous est écrite en toutes lettres pour que
// le scanner la trouve au build — ne jamais fabriquer un nom de classe à
// partir d'une chaîne calculée à l'exécution (`bg-${color}-500`), elle
// n'existerait tout simplement pas dans le bundle de production. C'est
// cette contrainte, et elle seule, qui impose une liste fermée plutôt
// qu'un sélecteur de couleur libre.
//
// Les identifiants restent en anglais (convention du projet : code en
// anglais, interface en français) ; les libellés affichés vivent dans
// `PALETTE_LABELS`. Les 8 valeurs d'origine sont toutes conservées à
// l'identique : les lignes déjà en base restent valides, aucune migration
// n'est nécessaire.
//
// Les 4 dernières (`wine`, `brown`, `pine`, `navy`) sont des variantes
// foncées et non de nouvelles teintes : à 24 entrées, l'enjeu devient de
// rester distinguable d'un coup d'œil, d'où le choix d'écarter les gris
// quasi identiques de Tailwind (`zinc`, `neutral`) au profit de tons
// nettement différenciés.
export const PALETTE_COLORS = [
  "slate",
  "gray",
  "stone",
  "red",
  "rose",
  "pink",
  "fuchsia",
  "wine",
  "orange",
  "amber",
  "yellow",
  "brown",
  "lime",
  "green",
  "emerald",
  "teal",
  "pine",
  "cyan",
  "sky",
  "blue",
  "indigo",
  "navy",
  "violet",
  "purple",
] as const;

export type PaletteColor = (typeof PALETTE_COLORS)[number];

export const PALETTE_LABELS: Record<PaletteColor, string> = {
  slate: "Ardoise",
  gray: "Gris",
  stone: "Pierre",
  red: "Rouge",
  rose: "Framboise",
  pink: "Rose",
  fuchsia: "Fuchsia",
  wine: "Bordeaux",
  orange: "Orange",
  amber: "Ambre",
  yellow: "Jaune",
  brown: "Brun",
  lime: "Vert citron",
  green: "Vert",
  emerald: "Émeraude",
  teal: "Sarcelle",
  pine: "Vert sapin",
  cyan: "Cyan",
  sky: "Ciel",
  blue: "Bleu",
  indigo: "Indigo",
  navy: "Bleu nuit",
  violet: "Violet",
  purple: "Pourpre",
};

export const PALETTE_BADGE_CLASSES: Record<PaletteColor, string> = {
  slate: "bg-slate-500/15 text-slate-700 border-slate-500/30 dark:text-slate-300",
  gray: "bg-gray-500/15 text-gray-700 border-gray-500/30 dark:text-gray-300",
  stone: "bg-stone-500/15 text-stone-700 border-stone-500/30 dark:text-stone-300",
  red: "bg-red-500/15 text-red-700 border-red-500/30 dark:text-red-300",
  rose: "bg-rose-500/15 text-rose-700 border-rose-500/30 dark:text-rose-300",
  pink: "bg-pink-500/15 text-pink-700 border-pink-500/30 dark:text-pink-300",
  fuchsia: "bg-fuchsia-500/15 text-fuchsia-700 border-fuchsia-500/30 dark:text-fuchsia-300",
  wine: "bg-rose-800/15 text-rose-800 border-rose-800/30 dark:text-rose-300",
  orange: "bg-orange-500/15 text-orange-700 border-orange-500/30 dark:text-orange-300",
  amber: "bg-amber-500/15 text-amber-700 border-amber-500/30 dark:text-amber-300",
  yellow: "bg-yellow-500/15 text-yellow-700 border-yellow-500/30 dark:text-yellow-300",
  brown: "bg-amber-800/15 text-amber-800 border-amber-800/30 dark:text-amber-300",
  lime: "bg-lime-500/15 text-lime-700 border-lime-500/30 dark:text-lime-300",
  green: "bg-green-500/15 text-green-700 border-green-500/30 dark:text-green-300",
  emerald: "bg-emerald-500/15 text-emerald-700 border-emerald-500/30 dark:text-emerald-300",
  teal: "bg-teal-500/15 text-teal-700 border-teal-500/30 dark:text-teal-300",
  pine: "bg-emerald-800/15 text-emerald-800 border-emerald-800/30 dark:text-emerald-300",
  cyan: "bg-cyan-500/15 text-cyan-700 border-cyan-500/30 dark:text-cyan-300",
  sky: "bg-sky-500/15 text-sky-700 border-sky-500/30 dark:text-sky-300",
  blue: "bg-blue-500/15 text-blue-700 border-blue-500/30 dark:text-blue-300",
  indigo: "bg-indigo-500/15 text-indigo-700 border-indigo-500/30 dark:text-indigo-300",
  navy: "bg-blue-800/15 text-blue-800 border-blue-800/30 dark:text-blue-300",
  violet: "bg-violet-500/15 text-violet-700 border-violet-500/30 dark:text-violet-300",
  purple: "bg-purple-500/15 text-purple-700 border-purple-500/30 dark:text-purple-300",
};

export const PALETTE_SWATCH_CLASSES: Record<PaletteColor, string> = {
  slate: "bg-slate-400",
  gray: "bg-gray-500",
  stone: "bg-stone-500",
  red: "bg-red-500",
  rose: "bg-rose-500",
  pink: "bg-pink-500",
  fuchsia: "bg-fuchsia-500",
  wine: "bg-rose-800",
  orange: "bg-orange-500",
  amber: "bg-amber-500",
  yellow: "bg-yellow-500",
  brown: "bg-amber-800",
  lime: "bg-lime-500",
  green: "bg-green-500",
  emerald: "bg-emerald-500",
  teal: "bg-teal-500",
  pine: "bg-emerald-800",
  cyan: "bg-cyan-500",
  sky: "bg-sky-500",
  blue: "bg-blue-500",
  indigo: "bg-indigo-500",
  navy: "bg-blue-800",
  violet: "bg-violet-500",
  purple: "bg-purple-500",
};

export interface SeedDropdownItem {
  slug: string;
  label: string;
  color: PaletteColor;
  locked: boolean;
  sortOrder: number;
}

// Cycle confirmé avec le client — 6 statuts verrouillés le 2026-07-13,
// "Non commencé" ajouté le 2026-07-21 et "Bloqué" le 2026-07-31 (chaque
// fois sur demande explicite du client de rouvrir ce cycle). Do not
// add/remove further without revisiting the cahier des charges.
// `locked: true` blocks add/remove of list items in the admin UI
// (labels/colors/order stay editable).
//
// Modifier cette liste ne suffit PAS à faire apparaître un statut en
// production : le seed ne tourne pas au déploiement (le Procfile n'exécute
// que `prisma migrate deploy`). Tout ajout doit s'accompagner d'une
// migration de données — voir `20260731_add_task_status_bloque`.
export const TASK_STATUS_SEED: SeedDropdownItem[] = [
  { slug: TASK_STATUS.NOUVEAU, label: "Nouveau", color: "slate", locked: true, sortOrder: 0 },
  {
    slug: TASK_STATUS.NON_COMMENCE,
    label: "Non commencé",
    color: "cyan",
    locked: true,
    sortOrder: 1,
  },
  { slug: TASK_STATUS.BLOQUE, label: "Bloqué", color: "red", locked: true, sortOrder: 2 },
  { slug: TASK_STATUS.EN_COURS, label: "En cours", color: "blue", locked: true, sortOrder: 3 },
  { slug: TASK_STATUS.A_VALIDER, label: "À valider", color: "amber", locked: true, sortOrder: 4 },
  { slug: TASK_STATUS.BAT_VALIDE, label: "BAT validé", color: "emerald", locked: true, sortOrder: 5 },
  { slug: TASK_STATUS.A_MODIFIER, label: "À modifier", color: "rose", locked: true, sortOrder: 6 },
  { slug: TASK_STATUS.TERMINE, label: "Terminé", color: "emerald", locked: true, sortOrder: 7 },
];

export const PROSPECT_STATUS_SEED: SeedDropdownItem[] = [
  { slug: PROSPECT_STATUS.A_FAIRE, label: "À faire", color: "slate", locked: true, sortOrder: 0 },
  { slug: PROSPECT_STATUS.EN_COURS, label: "En cours", color: "blue", locked: true, sortOrder: 1 },
  {
    slug: PROSPECT_STATUS.DISCUSSIONS_EN_COURS,
    label: "Discussions en cours",
    color: "amber",
    locked: true,
    sortOrder: 2,
  },
  { slug: PROSPECT_STATUS.FERME, label: "Fermé", color: "emerald", locked: true, sortOrder: 3 },
  { slug: PROSPECT_STATUS.ARCHIVE, label: "Archivé", color: "cyan", locked: true, sortOrder: 4 },
];

// Document types stay open for admins to extend, except "facture" which the
// Stripe payment flow branches on and must not be deleted.
export const DOCUMENT_TYPE_SEED: SeedDropdownItem[] = [
  { slug: DOCUMENT_TYPE.DEVIS, label: "Devis", color: "blue", locked: false, sortOrder: 0 },
  { slug: DOCUMENT_TYPE.CONTRAT, label: "Contrat", color: "violet", locked: false, sortOrder: 1 },
  { slug: DOCUMENT_TYPE.FACTURE, label: "Facture", color: "emerald", locked: true, sortOrder: 2 },
];

// Migré depuis la base Notion "TASKS" du client (propriétés Type/Formats,
// multi-select) - listes ouvertes, l'admin peut en ajouter depuis
// /admin/listes.
export const TASK_TYPE_SEED: SeedDropdownItem[] = [
  { slug: "video", label: "Vidéo", color: "orange", locked: false, sortOrder: 0 },
  { slug: "photo", label: "Photo", color: "rose", locked: false, sortOrder: 1 },
  { slug: "graphisme", label: "Graphisme", color: "amber", locked: false, sortOrder: 2 },
  { slug: "montage", label: "Montage", color: "emerald", locked: false, sortOrder: 3 },
  { slug: "flyer", label: "Flyer", color: "blue", locked: false, sortOrder: 4 },
  { slug: "motion", label: "Motion", color: "violet", locked: false, sortOrder: 5 },
  { slug: "3d", label: "3D", color: "cyan", locked: false, sortOrder: 6 },
  { slug: "psd", label: "PSD", color: "slate", locked: false, sortOrder: 7 },
];

// Catégories de client (2026-07-30) — liste entièrement ouverte, aucun code
// ne branche sur un slug particulier : ces valeurs ne sont qu'un point de
// départ raisonnable pour l'activité (clubs, marques, artistes...), à
// renommer/compléter librement depuis /admin/listes.
export const CLIENT_CATEGORY_SEED: SeedDropdownItem[] = [
  { slug: "club", label: "Club", color: "violet", locked: false, sortOrder: 0 },
  { slug: "marque", label: "Marque", color: "blue", locked: false, sortOrder: 1 },
  { slug: "artiste", label: "Artiste", color: "rose", locked: false, sortOrder: 2 },
  { slug: "agence", label: "Agence", color: "amber", locked: false, sortOrder: 3 },
  { slug: "evenementiel", label: "Événementiel", color: "orange", locked: false, sortOrder: 4 },
  { slug: "particulier", label: "Particulier", color: "slate", locked: false, sortOrder: 5 },
];

export const TASK_FORMAT_SEED: SeedDropdownItem[] = [
  { slug: "4-5", label: "4:5", color: "blue", locked: false, sortOrder: 0 },
  { slug: "9-16", label: "9:16", color: "violet", locked: false, sortOrder: 1 },
  { slug: "16-9", label: "16:9", color: "rose", locked: false, sortOrder: 2 },
  { slug: "15x15", label: "15x15", color: "orange", locked: false, sortOrder: 3 },
  { slug: "1-1", label: "1:1", color: "emerald", locked: false, sortOrder: 4 },
  { slug: "png", label: "PNG", color: "amber", locked: false, sortOrder: 5 },
  { slug: "custom", label: "Custom", color: "slate", locked: false, sortOrder: 6 },
  { slug: "logo", label: "Logo", color: "cyan", locked: false, sortOrder: 7 },
];
