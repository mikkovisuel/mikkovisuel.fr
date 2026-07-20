import { z } from "zod";

export const GmailMessageSchema = z.object({
  to: z.string().trim().email({ message: "Adresse email invalide." }),
  subject: z.string().trim().min(1, { message: "L'objet est requis." }),
  body: z.string().trim().min(1, { message: "Le message est requis." }),
});

export type GmailMessageFormState = { error?: string; success?: boolean } | undefined;
