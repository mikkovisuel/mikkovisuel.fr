import { z } from "zod";
import { SOCIAL_FORMATS, SOCIAL_NETWORKS } from "@/lib/social-posts";

const NETWORK_SLUGS = SOCIAL_NETWORKS.map((network) => network.slug) as [string, ...string[]];
const FORMAT_SLUGS = SOCIAL_FORMATS.map((format) => format.slug) as [string, ...string[]];

export type SocialPlanFormState = { error?: string; saved?: boolean } | undefined;

export const PlanSchema = z.object({
  name: z.string().trim().min(1, { message: "Donnez un nom au plan." }).max(120),
  description: z.string().trim().max(1000).optional(),
});

export const PlanStepSchema = z
  .object({
    label: z.string().trim().min(1, { message: "Donnez un nom à l'étape." }).max(120),
    // Négatif avant l'évènement (J-30), positif après (J+1), 0 le jour même.
    offsetDays: z.coerce
      .number({ message: "Décalage invalide." })
      .int()
      .min(-365, { message: "365 jours avant au maximum." })
      .max(365, { message: "365 jours après au maximum." }),
    time: z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/, { message: "Heure invalide." }),
    createsDraft: z.boolean(),
    createsReminder: z.boolean(),
    createsTask: z.boolean(),
    createsAction: z.boolean(),
    remindDaysBefore: z.coerce.number().int().min(0).max(60).default(2),
    networks: z.array(z.enum(NETWORK_SLUGS)).default([]),
    format: z.enum(FORMAT_SLUGS).default("post"),
    categoryId: z.string().optional(),
    titlePattern: z.string().trim().min(1, { message: "Le titre est requis." }).max(160),
    captionTemplate: z.string().trim().max(4000).optional(),
    hashtags: z.string().trim().max(2000).optional(),
    taskTypeSlug: z.string().optional(),
    taskLeadDays: z.union([z.coerce.number().int().min(0).max(120), z.literal("")]).optional(),
    taskBrief: z.string().trim().max(4000).optional(),
    actionLeadDays: z.union([z.coerce.number().int().min(0).max(120), z.literal("")]).optional(),
    actionBrief: z.string().trim().max(4000).optional(),
  })
  .superRefine((data, ctx) => {
    if (!data.createsDraft && !data.createsReminder && !data.createsTask && !data.createsAction) {
      ctx.addIssue({ code: "custom", message: "Une étape doit produire au moins une chose." });
    }
    if (data.createsDraft && data.networks.length === 0) {
      ctx.addIssue({ code: "custom", message: "Choisissez au moins un réseau pour le brouillon." });
    }
    if (data.createsTask && !data.taskTypeSlug) {
      ctx.addIssue({ code: "custom", message: "Choisissez le type de la tâche de travail." });
    }
  });

export const ApplyPlanSchema = z.object({
  planId: z.string().min(1, { message: "Choisissez un plan." }),
  clientId: z.string().min(1, { message: "Choisissez un client." }),
  eventName: z.string().trim().min(1, { message: "Donnez un nom à l'évènement." }).max(160),
  eventPlace: z.string().trim().max(160).optional(),
  eventDate: z
    .string()
    .trim()
    .regex(/^\d{4}-\d{2}-\d{2}$/, { message: "Date de l'évènement invalide." })
    .refine((value) => new Date(value).toISOString().slice(0, 10) === value, {
      message: "Date de l'évènement invalide.",
    }),
  /** Identifiants des étapes cochées dans l'aperçu. */
  stepIds: z.array(z.string()).min(1, { message: "Cochez au moins une étape." }),
  sourceTaskId: z.string().optional(),
});
