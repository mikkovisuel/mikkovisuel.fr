import { z } from "zod";

export const FeedbackSchema = z.object({
  message: z.string().trim().min(1, { message: "Le message est requis." }),
});

export type FeedbackFormState = { error?: string; success?: boolean } | undefined;
