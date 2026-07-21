import { z } from "zod";

export const TaskSchema = z.object({
  title: z.string().trim().min(1, { message: "Le titre est requis." }),
  description: z.string().trim().optional(),
  eventDate: z.string().trim().optional(),
  types: z.array(z.string()).optional().default([]),
  formats: z.array(z.string()).optional().default([]),
});

export const RefusalSchema = z.object({
  reason: z.string().trim().min(1, { message: "Le motif est requis." }),
});

// Ajout manuel de temps passé (correction, oubli de lancer le chronomètre)
// — voir `addManualTimeEntry`.
export const ManualTimeEntrySchema = z.object({
  date: z.string().trim().min(1, { message: "La date est requise." }),
  minutes: z.coerce
    .number({ message: "Durée invalide." })
    .int()
    .min(1, { message: "La durée doit être d'au moins 1 minute." }),
});

export type TaskFormState = { error?: string } | undefined;
export type RefusalFormState = { error?: string } | undefined;
export type ManualTimeEntryFormState = { error?: string } | undefined;
