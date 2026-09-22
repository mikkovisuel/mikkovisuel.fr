import { z } from "zod";
import { SOCIAL_FORMATS, SOCIAL_NETWORKS } from "@/lib/social-posts";

const NETWORK_SLUGS = SOCIAL_NETWORKS.map((network) => network.slug) as [string, ...string[]];
const FORMAT_SLUGS = SOCIAL_FORMATS.map((format) => format.slug) as [string, ...string[]];

export const SocialPostSchema = z.object({
  title: z.string().trim().min(1, { message: "Le titre est requis." }).max(160),
  networks: z
    .array(z.enum(NETWORK_SLUGS))
    .min(1, { message: "Choisissez au moins un réseau." }),
  format: z.enum(FORMAT_SLUGS, { message: "Choisissez un format." }),
  caption: z.string().trim().optional(),
  hashtags: z.string().trim().optional(),
  // Saisie brute `datetime-local`, interprétée en heure de Paris par l'action
  // (parseParisDateTimeLocal) — jamais par `new Date()`.
  scheduledAt: z.string().trim().optional(),
});

export interface SocialPostFormValues {
  clientId?: string;
  categoryId?: string;
  /** Variantes de légende par réseau (slug → texte). */
  captionVariants?: Record<string, string>;
  title: string;
  networks: string[];
  format: string;
  caption: string;
  hashtags: string;
  scheduledAt: string;
}

// `saved` : confirmation affichée sous le formulaire de modification (la
// création, elle, redirige vers la fiche).
export type SocialPostFormState = { error?: string; saved?: boolean } | undefined;

export const SocialPostRefusalSchema = z.object({
  reason: z.string().trim().min(1, { message: "Le motif est requis." }).max(2000),
});

export type SocialPostRefusalState = { error?: string } | undefined;

export const SocialPostPublishSchema = z.object({
  publishedUrl: z
    .string()
    .trim()
    .refine((value) => value === "" || /^https?:\/\/\S+$/i.test(value), {
      message: "Lien invalide (il doit commencer par http:// ou https://).",
    }),
});

export type SocialPostPublishState = { error?: string } | undefined;

// Date "AAAA-MM-JJ" facultative (champ `<input type="date">`) : vide ou
// une vraie date. Vérifiée par aller-retour : `new Date("2026-02-30")`
// donne silencieusement le 2 mars (défaut trouvé en test), une date
// impossible doit être refusée.
function isRealIsoDate(value: string) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const date = new Date(value);
  return !Number.isNaN(date.getTime()) && date.toISOString().slice(0, 10) === value;
}

export const optionalIsoDate = (message: string) =>
  z
    .string()
    .trim()
    .refine((value) => value === "" || isRealIsoDate(value), { message });

// Demande de création depuis une publication (tâche interne, 2026-09-18).
export const SocialTaskRequestSchema = z.object({
  title: z.string().trim().min(1, { message: "Donnez un titre à la tâche." }).max(160),
  taskType: z.string().min(1, { message: "Choisissez le type de création." }),
  dueDate: optionalIsoDate("Échéance invalide."),
  // Date de l'évènement promu par la publication (ajout du 2026-09-18),
  // reprise telle quelle dans `Task.eventDate`.
  eventDate: optionalIsoDate("Date de l'évènement invalide."),
  description: z.string().trim().max(4000, { message: "Brief trop long (4 000 caractères maximum)." }),
});

export const SocialPostNoteSchema = z.object({
  body: z
    .string()
    .trim()
    .min(1, { message: "La note est vide." })
    .max(4000, { message: "Note trop longue (4 000 caractères maximum)." }),
});

// Message de l'échange admin ↔ client sur une publication (2026-09-18).
export const SocialPostCommentSchema = z.object({
  body: z
    .string()
    .trim()
    .min(1, { message: "Le message est vide." })
    .max(4000, { message: "Message trop long (4 000 caractères maximum)." }),
});
