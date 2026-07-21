// Single source of truth for seeded dropdown lists. `prisma/seed.ts` and any
// application code that branches on a specific status/type import from here,
// so the seed data and the code can never drift apart.

export const TASK_STATUS_LIST_KEY = "task_status";
export const DOCUMENT_TYPE_LIST_KEY = "document_type";
export const PORTFOLIO_CATEGORY_LIST_KEY = "portfolio_category";
export const TASK_TYPE_LIST_KEY = "task_type";
export const TASK_FORMAT_LIST_KEY = "task_format";

export const TASK_STATUS = {
  NOUVEAU: "nouveau",
  NON_COMMENCE: "non-commence",
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

// The small, fixed color palette admins pick from (§7.2 du cahier des
// charges). Every Tailwind class below is written out in full so the
// scanner can find it at build time — never build a class name from a
// runtime string (e.g. `bg-${color}-500`), or it silently won't exist in
// the production bundle.
export const PALETTE_COLORS = [
  "slate",
  "blue",
  "emerald",
  "amber",
  "rose",
  "violet",
  "orange",
  "cyan",
] as const;

export type PaletteColor = (typeof PALETTE_COLORS)[number];

export const PALETTE_BADGE_CLASSES: Record<PaletteColor, string> = {
  slate: "bg-slate-500/15 text-slate-700 border-slate-500/30 dark:text-slate-300",
  blue: "bg-blue-500/15 text-blue-700 border-blue-500/30 dark:text-blue-300",
  emerald: "bg-emerald-500/15 text-emerald-700 border-emerald-500/30 dark:text-emerald-300",
  amber: "bg-amber-500/15 text-amber-700 border-amber-500/30 dark:text-amber-300",
  rose: "bg-rose-500/15 text-rose-700 border-rose-500/30 dark:text-rose-300",
  violet: "bg-violet-500/15 text-violet-700 border-violet-500/30 dark:text-violet-300",
  orange: "bg-orange-500/15 text-orange-700 border-orange-500/30 dark:text-orange-300",
  cyan: "bg-cyan-500/15 text-cyan-700 border-cyan-500/30 dark:text-cyan-300",
};

export const PALETTE_SWATCH_CLASSES: Record<PaletteColor, string> = {
  slate: "bg-slate-400",
  blue: "bg-blue-500",
  emerald: "bg-emerald-500",
  amber: "bg-amber-500",
  rose: "bg-rose-500",
  violet: "bg-violet-500",
  orange: "bg-orange-500",
  cyan: "bg-cyan-500",
};

export interface SeedDropdownItem {
  slug: string;
  label: string;
  color: PaletteColor;
  locked: boolean;
  sortOrder: number;
}

// Cycle confirmé avec le client — 6 statuts verrouillés le 2026-07-13,
// "Non commencé" ajouté le 2026-07-21 (demande explicite du client de
// rouvrir ce cycle). Do not add/remove further without revisiting the
// cahier des charges. `locked: true` blocks add/remove of list items in the
// admin UI (labels/colors/order stay editable).
export const TASK_STATUS_SEED: SeedDropdownItem[] = [
  { slug: TASK_STATUS.NOUVEAU, label: "Nouveau", color: "slate", locked: true, sortOrder: 0 },
  {
    slug: TASK_STATUS.NON_COMMENCE,
    label: "Non commencé",
    color: "cyan",
    locked: true,
    sortOrder: 1,
  },
  { slug: TASK_STATUS.EN_COURS, label: "En cours", color: "blue", locked: true, sortOrder: 2 },
  { slug: TASK_STATUS.A_VALIDER, label: "À valider", color: "amber", locked: true, sortOrder: 3 },
  { slug: TASK_STATUS.BAT_VALIDE, label: "BAT validé", color: "emerald", locked: true, sortOrder: 4 },
  { slug: TASK_STATUS.A_MODIFIER, label: "À modifier", color: "rose", locked: true, sortOrder: 5 },
  { slug: TASK_STATUS.TERMINE, label: "Terminé", color: "emerald", locked: true, sortOrder: 6 },
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
