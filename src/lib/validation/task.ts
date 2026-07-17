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

export type TaskFormState = { error?: string } | undefined;
export type RefusalFormState = { error?: string } | undefined;
