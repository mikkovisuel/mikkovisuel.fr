import { z } from "zod";

export const PillarSchema = z.object({
  title: z.string().trim().min(1, { message: "Le titre est requis." }),
  description: z.string().trim().min(1, { message: "La description est requise." }),
});

export const MediaItemSchema = z.object({
  title: z.string().trim().min(1, { message: "Le titre est requis." }),
  aspectRatio: z.enum(["3:4", "9:16"]),
});

export type PillarFormState = { error?: string } | undefined;
export type MediaItemFormState = { error?: string } | undefined;
