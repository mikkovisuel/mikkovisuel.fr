import { z } from "zod";

export const LoginSchema = z.object({
  email: z.string().trim().toLowerCase().email({ message: "Adresse email invalide." }),
  password: z.string().min(1, { message: "Mot de passe requis." }),
});

export type LoginFormState = {
  error?: string;
} | undefined;
