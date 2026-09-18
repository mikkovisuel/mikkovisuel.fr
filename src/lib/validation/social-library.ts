import { z } from "zod";
import { SOCIAL_FORMATS, SOCIAL_NETWORKS } from "@/lib/social-posts";

const NETWORK_SLUGS = SOCIAL_NETWORKS.map((network) => network.slug) as [string, ...string[]];
const FORMAT_SLUGS = SOCIAL_FORMATS.map((format) => format.slug) as [string, ...string[]];

export type SocialLibraryFormState = { error?: string; saved?: boolean } | undefined;

export const SocialProfileSchema = z.object({
  editorialLine: z.string().trim().max(4000).optional(),
  brandTone: z.string().trim().max(2000).optional(),
});

export const SocialLibraryItemSchema = z.object({
  kind: z.enum(["hashtags", "template"]),
  name: z.string().trim().min(1, { message: "Donnez un nom." }).max(80),
  content: z.string().trim().min(1, { message: "Le contenu est vide." }).max(4000),
});

export const SocialRecurringSlotSchema = z.object({
  title: z.string().trim().min(1, { message: "Donnez un titre au créneau." }).max(160),
  weekday: z.coerce.number().int().min(1).max(7),
  time: z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/, { message: "Heure invalide." }),
  networks: z.array(z.enum(NETWORK_SLUGS)).min(1, { message: "Choisissez au moins un réseau." }),
  format: z.enum(FORMAT_SLUGS),
  remindDaysBefore: z.coerce
    .number({ message: "Nombre de jours invalide." })
    .int()
    .min(0, { message: "Le rappel ne peut pas être après le créneau." })
    .max(30, { message: "30 jours maximum." }),
});

// Chiffres saisis à la main : un champ vide = inconnu (null), jamais 0 —
// "0 abonné" et "pas renseigné" ne veulent pas dire la même chose, et le
// taux d'engagement n'est calculé que si portée et interactions sont
// connues.
const optionalCount = z.preprocess(
  (value) => (typeof value === "string" && value.trim() === "" ? null : value),
  z.coerce
    .number({ message: "Nombre invalide." })
    .int({ message: "Nombre entier attendu." })
    .min(0, { message: "Un chiffre ne peut pas être négatif." })
    .nullable(),
);

export const SocialMonthlyStatsSchema = z.object({
  year: z.coerce.number().int().min(2020).max(2100),
  month: z.coerce.number().int().min(1).max(12),
  followers: optionalCount,
  reach: optionalCount,
  interactions: optionalCount,
  notes: z.string().trim().max(4000).optional(),
});

export const SocialCaptionRequestSchema = z.object({
  clientId: z.string().min(1, { message: "Choisissez d'abord un client." }),
  title: z.string().trim().min(1, { message: "Donnez d'abord un titre (le sujet de la publication)." }).max(160),
  format: z.enum(FORMAT_SLUGS),
  networks: z.array(z.enum(NETWORK_SLUGS)).max(4),
  draft: z.string().trim().max(4000, { message: "Brouillon trop long (4 000 caractères maximum)." }),
});
