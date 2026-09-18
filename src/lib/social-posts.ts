import type { PaletteColor } from "@/lib/dropdown-lists";

// Module Community management — constantes et utilitaires partagés entre
// l'admin, l'espace client et les actions serveur. Pas de garde
// `server-only` : les libellés et couleurs servent aussi aux composants
// client, et rien ici ne touche la base.

export const SOCIAL_NETWORKS = [
  { slug: "instagram", label: "Instagram" },
  { slug: "facebook", label: "Facebook" },
  { slug: "tiktok", label: "TikTok" },
  { slug: "linkedin", label: "LinkedIn" },
] as const;

export type SocialNetworkSlug = (typeof SOCIAL_NETWORKS)[number]["slug"];

export const SOCIAL_FORMATS = [
  { slug: "post", label: "Post" },
  { slug: "carrousel", label: "Carrousel" },
  { slug: "story", label: "Story" },
  { slug: "reel", label: "Reel / vidéo" },
] as const;

export type SocialFormatSlug = (typeof SOCIAL_FORMATS)[number]["slug"];

// Cycle standard du métier (voir CAHIER_DES_CHARGES.md, section 4) :
// relecture interne avant la validation client, puis publication.
export const SOCIAL_POST_STATUS = {
  IDEE: "idee",
  REDACTION: "redaction",
  A_VALIDER: "a_valider",
  A_MODIFIER: "a_modifier",
  VALIDE: "valide",
  PUBLIE: "publie",
} as const;

export type SocialPostStatus = (typeof SOCIAL_POST_STATUS)[keyof typeof SOCIAL_POST_STATUS];

export const SOCIAL_POST_STATUS_META: Record<SocialPostStatus, { label: string; color: PaletteColor }> = {
  idee: { label: "Idée", color: "slate" },
  redaction: { label: "Rédaction", color: "sky" },
  a_valider: { label: "À valider", color: "amber" },
  a_modifier: { label: "À modifier", color: "red" },
  valide: { label: "Validé", color: "emerald" },
  publie: { label: "Publié", color: "violet" },
};

export const SOCIAL_POST_STATUS_ORDER: SocialPostStatus[] = [
  "idee",
  "redaction",
  "a_valider",
  "a_modifier",
  "valide",
  "publie",
];

// Le client ne voit jamais les brouillons internes ("Idée", "Rédaction") —
// bonne pratique du métier : relecture interne d'abord, le client ne reçoit
// que ce qui est prêt à être validé.
export const CLIENT_VISIBLE_STATUSES: SocialPostStatus[] = ["a_valider", "a_modifier", "valide", "publie"];

// Statuts que l'admin peut choisir librement dans le sélecteur. Les autres
// transitions passent par des actions dédiées qui déclenchent leurs effets
// (emails, dates) : envoi en validation, validation/refus, publication.
export const ADMIN_SELECTABLE_STATUSES: SocialPostStatus[] = ["idee", "redaction"];

export function isSocialPostStatus(value: unknown): value is SocialPostStatus {
  return typeof value === "string" && (SOCIAL_POST_STATUS_ORDER as string[]).includes(value);
}

export function networkLabel(slug: string) {
  return SOCIAL_NETWORKS.find((network) => network.slug === slug)?.label ?? slug;
}

export function formatLabel(slug: string) {
  return SOCIAL_FORMATS.find((format) => format.slug === slug)?.label ?? slug;
}

// --- Heure de Paris --------------------------------------------------------
//
// Le serveur de production tourne en UTC (vérifié le 2026-09-18). Une
// publication prévue "jeudi 18 h" s'entend en heure de Paris : toute
// conversion implicite (`new Date("2026-09-24T18:00")`, `getHours()`...)
// dépendrait du fuseau du serveur et décalerait de 1 à 2 h selon l'heure
// d'été. Tout passe donc par le fuseau explicite ci-dessous.

const PARIS_TZ = "Europe/Paris";

const PARTS_FORMATTER = new Intl.DateTimeFormat("en-GB", {
  timeZone: PARIS_TZ,
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
  hour: "2-digit",
  minute: "2-digit",
  hourCycle: "h23",
});

function parisParts(date: Date) {
  const parts = Object.fromEntries(
    PARTS_FORMATTER.formatToParts(date).map((part) => [part.type, part.value]),
  );
  return {
    year: Number(parts.year),
    month: Number(parts.month),
    day: Number(parts.day),
    hour: Number(parts.hour),
    minute: Number(parts.minute),
  };
}

const pad = (n: number) => String(n).padStart(2, "0");

/** Valeur pour un `<input type="datetime-local">`, en heure de Paris. */
export function toParisDateTimeLocal(date: Date | null | undefined): string {
  if (!date) return "";
  const p = parisParts(date);
  return `${p.year}-${pad(p.month)}-${pad(p.day)}T${pad(p.hour)}:${pad(p.minute)}`;
}

/**
 * Lit une saisie `datetime-local` ("2026-09-24T18:00") comme une heure de
 * Paris et renvoie l'instant exact correspondant. `null` si la saisie est
 * vide ou invalide.
 */
export function parseParisDateTimeLocal(value: string | null | undefined): Date | null {
  const match = value ? /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})$/.exec(value.trim()) : null;
  if (!match) return null;
  const [, y, mo, d, h, mi] = match.map(Number);
  const wallClockAsUtc = Date.UTC(y, mo - 1, d, h, mi);
  // `Date.UTC` reporte silencieusement les valeurs hors limites ("30 février"
  // → 2 mars, "25:00" → 1 h le lendemain) : une saisie impossible doit être
  // refusée, pas transformée en une autre date (défaut trouvé en test).
  const check = new Date(wallClockAsUtc);
  if (
    h > 23 ||
    mi > 59 ||
    check.getUTCFullYear() !== y ||
    check.getUTCMonth() !== mo - 1 ||
    check.getUTCDate() !== d
  ) {
    return null;
  }
  // Décalage de Paris à cet instant, puis correction : deux passes suffisent
  // à retomber juste au changement d'heure.
  let instant = wallClockAsUtc;
  for (let i = 0; i < 2; i++) {
    const p = parisParts(new Date(instant));
    const parisAsUtc = Date.UTC(p.year, p.month - 1, p.day, p.hour, p.minute);
    instant += wallClockAsUtc - parisAsUtc;
  }
  return new Date(instant);
}

/**
 * Date dont les accesseurs locaux (`getDate()`, `getHours()`...) donnent
 * l'heure de Paris, quel que soit le fuseau du serveur — pour les composants
 * existants qui regroupent par jour avec ces accesseurs (vue Calendrier).
 */
export function toParisWallClockDate(date: Date): Date {
  const p = parisParts(date);
  return new Date(p.year, p.month - 1, p.day, p.hour, p.minute);
}

const SCHEDULE_FORMATTER = new Intl.DateTimeFormat("fr-FR", {
  timeZone: PARIS_TZ,
  weekday: "short",
  day: "numeric",
  month: "short",
  hour: "2-digit",
  minute: "2-digit",
});

/** Ex. "jeu. 24 sept., 18:00" — toujours en heure de Paris. */
export function formatSchedule(date: Date | null | undefined): string {
  return date ? SCHEDULE_FORMATTER.format(date) : "Date à définir";
}

// --- Livraison 2 : créneaux récurrents et chiffres mensuels ---------------

/** Index 0 = lundi (ISO 1) ... 6 = dimanche (ISO 7). */
export const WEEKDAY_LABELS = ["Lundi", "Mardi", "Mercredi", "Jeudi", "Vendredi", "Samedi", "Dimanche"];

/**
 * Prochaine occurrence d'un créneau récurrent (jour ISO 1-7 + "HH:mm",
 * **heure de Paris**) à partir de `from` inclus. Construite jour par jour
 * sur le calendrier de Paris puis convertie en instant exact : un créneau
 * "jeudi 18 h" reste à 18 h de part et d'autre d'un changement d'heure.
 */
export function nextSlotOccurrence(weekday: number, time: string, from: Date): Date | null {
  const match = /^(\d{2}):(\d{2})$/.exec(time);
  if (!match || weekday < 1 || weekday > 7) return null;
  const start = parisParts(from);
  for (let offset = 0; offset <= 7; offset++) {
    const day = new Date(Date.UTC(start.year, start.month - 1, start.day + offset));
    const isoWeekday = day.getUTCDay() === 0 ? 7 : day.getUTCDay();
    if (isoWeekday !== weekday) continue;
    const candidate = parseParisDateTimeLocal(
      `${day.getUTCFullYear()}-${pad(day.getUTCMonth() + 1)}-${pad(day.getUTCDate())}T${match[1]}:${match[2]}`,
    );
    if (candidate && candidate.getTime() >= from.getTime()) return candidate;
  }
  return null;
}

/** Même jour calendaire à Paris (pour ne pas rappeler un créneau déjà couvert). */
export function isSameParisDay(a: Date, b: Date): boolean {
  const pa = parisParts(a);
  const pb = parisParts(b);
  return pa.year === pb.year && pa.month === pb.month && pa.day === pb.day;
}

/** Taux d'engagement en % (interactions ÷ portée), `null` s'il n'est pas calculable. */
export function engagementRate(reach: number | null, interactions: number | null): number | null {
  if (reach === null || interactions === null || reach <= 0) return null;
  return (interactions / reach) * 100;
}

const INTEGER_FORMATTER = new Intl.NumberFormat("fr-FR");
const RATE_FORMATTER = new Intl.NumberFormat("fr-FR", { maximumFractionDigits: 1, minimumFractionDigits: 1 });

export function formatCount(value: number | null | undefined): string {
  return value === null || value === undefined ? "—" : INTEGER_FORMATTER.format(value);
}

export function formatRate(value: number | null): string {
  return value === null ? "—" : `${RATE_FORMATTER.format(value)} %`;
}

/**
 * Moment du rappel d'un créneau récurrent : 8 h (Paris) le jour situé
 * `daysBefore` jours avant l'occurrence. Pour un créneau matinal rappelé le
 * jour même (ex. 7 h, 0 jour), le rappel est avancé à 1 h avant le créneau —
 * sinon il tomberait après.
 */
export function slotReminderTime(occurrence: Date, daysBefore: number): Date {
  const p = parisParts(occurrence);
  const day = new Date(Date.UTC(p.year, p.month - 1, p.day - daysBefore));
  const morning = parseParisDateTimeLocal(
    `${day.getUTCFullYear()}-${pad(day.getUTCMonth() + 1)}-${pad(day.getUTCDate())}T08:00`,
  );
  const latest = new Date(occurrence.getTime() - 60 * 60 * 1000);
  return morning && morning < latest ? morning : latest;
}
