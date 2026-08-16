import { z } from "zod";

export const PillarSchema = z.object({
  title: z.string().trim().min(1, { message: "Le titre est requis." }),
  description: z.string().trim().min(1, { message: "La description est requise." }),
});

export const MediaItemSchema = z.object({
  title: z.string().trim().min(1, { message: "Le titre est requis." }),
  aspectRatio: z.enum(["3:4", "9:16"]),
});

// `textBefore`/`textAfter` sont volontairement facultatifs et indépendants
// (voir prisma/schema.prisma sur `PortfolioGallery`) : un projet peut
// n'avoir qu'une intro, qu'une conclusion, les deux, ou aucun texte.
export const GallerySchema = z.object({
  title: z.string().trim().min(1, { message: "Le titre est requis." }),
  textBefore: z.string().trim().optional(),
  textAfter: z.string().trim().optional(),
});

export type PillarFormState = { error?: string; success?: boolean } | undefined;
export type MediaItemFormState = { error?: string } | undefined;
export type GalleryFormState = { error?: string; success?: boolean } | undefined;
