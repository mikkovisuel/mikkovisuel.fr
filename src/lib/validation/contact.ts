import { z } from "zod";

export const ContactSchema = z.object({
  name: z.string().trim().min(1, { message: "Le nom est requis." }),
  email: z.string().trim().toLowerCase().email({ message: "Adresse email invalide." }),
  subject: z.enum(["devis", "question", "autre"]),
  message: z.string().trim().min(1, { message: "Le message est requis." }),
});

export type ContactFormState = { error?: string; success?: boolean } | undefined;
