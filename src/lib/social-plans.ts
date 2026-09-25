import { parseParisDateTimeLocal, toParisDateTimeLocal } from "@/lib/social-posts";

// Plans de communication (2026-09-25) : une séquence d'étapes calées sur un
// évènement (J-30, J-7, J+1...). Pas de garde `server-only` : le calcul des
// dates et le remplissage des variables servent aussi à l'aperçu affiché
// avant application.

/** "J-30", "J+1", "Jour J". */
export function describeOffset(offsetDays: number): string {
  if (offsetDays === 0) return "Jour J";
  return offsetDays < 0 ? `J-${Math.abs(offsetDays)}` : `J+${offsetDays}`;
}

/**
 * Date exacte d'une étape : le jour de l'évènement décalé de `offsetDays`,
 * à l'heure de Paris de l'étape. Calculé sur le calendrier de Paris pour
 * qu'un J-7 reste à la même heure de part et d'autre d'un changement
 * d'heure.
 */
export function stepDate(eventDate: Date, offsetDays: number, time: string): Date | null {
  const day = new Date(`${toParisDateTimeLocal(eventDate).slice(0, 10)}T00:00:00.000Z`);
  day.setUTCDate(day.getUTCDate() + offsetDays);
  return parseParisDateTimeLocal(`${day.toISOString().slice(0, 10)}T${time}`);
}

export interface PlanVariables {
  evenement: string;
  client: string;
  lieu: string;
  date: string;
  etape: string;
}

/** Remplace {evenement}, {client}, {lieu}, {date} et {etape}. */
export function fillPlanTemplate(text: string, values: PlanVariables): string {
  return text
    .replaceAll("{evenement}", values.evenement)
    .replaceAll("{client}", values.client)
    .replaceAll("{lieu}", values.lieu)
    .replaceAll("{date}", values.date)
    .replaceAll("{etape}", values.etape);
}

export const PLAN_VARIABLES = ["{evenement}", "{date}", "{lieu}", "{client}", "{etape}"] as const;
