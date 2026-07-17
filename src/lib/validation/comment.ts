import { z } from "zod";

export const CommentSchema = z.object({
  body: z.string().trim().min(1, { message: "Le commentaire est requis." }),
});

export type CommentFormState = { error?: string } | undefined;
