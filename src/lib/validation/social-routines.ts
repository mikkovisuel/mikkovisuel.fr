import { z } from "zod";
import { SOCIAL_FORMATS, SOCIAL_NETWORKS } from "@/lib/social-posts";
import { ROUTINE_CADENCES } from "@/lib/social-routines";

const NETWORK_SLUGS = SOCIAL_NETWORKS.map((network) => network.slug) as [string, ...string[]];
const FORMAT_SLUGS = SOCIAL_FORMATS.map((format) => format.slug) as [string, ...string[]];
const CADENCE_SLUGS = ROUTINE_CADENCES.map((cadence) => cadence.slug) as [string, ...string[]];

export type SocialRoutineFormState = { error?: string; saved?: boolean } | undefined;

const optionalDate = (message: string) =>
  z
    .string()
    .trim()
    .refine(
      (value) =>
        value === "" ||
        (/^\d{4}-\d{2}-\d{2}$/.test(value) && new Date(value).toISOString().slice(0, 10) === value),
      { message },
    );

export const RoutineSetSchema = z.object({
  name: z.string().trim().min(1, { message: "Donnez un nom à ce calendrier." }).max(120),
});

// Une routine : la cadence conditionne les champs obligatoires, d'où le
// `superRefine` plutôt que quatre schémas séparés (le formulaire est unique,
// les champs inutiles y sont simplement masqués).
export const RoutineSchema = z
  .object({
    title: z.string().trim().min(1, { message: "Donnez un titre à la routine." }).max(160),
    cadence: z.enum(CADENCE_SLUGS),
    weekdays: z.array(z.coerce.number().int().min(1).max(7)),
    monthDay: z.union([z.coerce.number().int().min(1).max(31), z.literal("")]).optional(),
    monthWeek: z.union([z.coerce.number().int().min(-1).max(4), z.literal("")]).optional(),
    monthWeekday: z.union([z.coerce.number().int().min(1).max(7), z.literal("")]).optional(),
    time: z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/, { message: "Heure invalide." }),
    activeFrom: optionalDate("Date de début invalide."),
    activeUntil: optionalDate("Date de fin invalide."),
    createsReminder: z.boolean(),
    createsDraft: z.boolean(),
    createsTask: z.boolean(),
    createsAction: z.boolean(),
    leadDays: z.coerce
      .number({ message: "Nombre de jours invalide." })
      .int()
      .min(0, { message: "L'avance ne peut pas être négative." })
      .max(60, { message: "60 jours maximum." }),
    // Réseaux et format ne sont saisis que quand la routine crée un
    // brouillon : valeurs par défaut sinon (routine interne, ou routine de
    // client qui ne produit qu'un rappel).
    networks: z.array(z.enum(NETWORK_SLUGS)).default([]),
    format: z.enum(FORMAT_SLUGS).default("post"),
    categoryId: z.string().optional(),
    captionTemplate: z.string().trim().max(4000).optional(),
    hashtags: z.string().trim().max(2000).optional(),
    taskTypeSlug: z.string().optional(),
    taskLeadDays: z.union([z.coerce.number().int().min(0).max(120), z.literal("")]).optional(),
    taskBrief: z.string().trim().max(4000).optional(),
    actionLeadDays: z.union([z.coerce.number().int().min(0).max(120), z.literal("")]).optional(),
    actionBrief: z.string().trim().max(4000).optional(),
  })
  .superRefine((data, ctx) => {
    const needsWeekdays = data.cadence === "weekly" || data.cadence === "biweekly";
    if (needsWeekdays && data.weekdays.length === 0) {
      ctx.addIssue({ code: "custom", message: "Choisissez au moins un jour." });
    }
    if (data.cadence === "monthly_day" && !data.monthDay) {
      ctx.addIssue({ code: "custom", message: "Choisissez le jour du mois." });
    }
    if (data.cadence === "monthly_weekday" && (!data.monthWeek || !data.monthWeekday)) {
      ctx.addIssue({ code: "custom", message: "Choisissez la semaine et le jour." });
    }
    if (!data.createsReminder && !data.createsDraft && !data.createsTask && !data.createsAction) {
      ctx.addIssue({ code: "custom", message: "Une routine doit produire au moins une chose." });
    }
    if (data.createsDraft && data.networks.length === 0) {
      ctx.addIssue({ code: "custom", message: "Choisissez au moins un réseau pour le brouillon." });
    }
    // Le type de tâche n'est exigé que pour une routine **de client** : une
    // routine interne alimente le pense-bête, qui n'a pas de type. La règle
    // vit donc dans l'action, qui sait à quel ensemble la routine appartient.
    if (data.activeFrom && data.activeUntil && data.activeFrom > data.activeUntil) {
      ctx.addIssue({ code: "custom", message: "La date de fin précède la date de début." });
    }
  });

export const ApplyTemplateSchema = z.object({
  templateSetId: z.string().min(1, { message: "Choisissez un modèle." }),
  clientId: z.string().min(1, { message: "Choisissez un client." }),
  name: z.string().trim().max(120).optional(),
});
