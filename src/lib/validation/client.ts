import { z } from "zod";

export const ClientSchema = z.object({
  name: z.string().trim().min(1, { message: "Le nom est requis." }),
  notes: z.string().trim().optional(),
});

export const ClientUserSchema = z.object({
  name: z.string().trim().min(1, { message: "Le nom est requis." }),
  email: z.string().trim().toLowerCase().email({ message: "Adresse email invalide." }),
  password: z.string().min(8, { message: "8 caractères minimum." }),
});

export type ClientFormState = { error?: string } | undefined;
export type ClientUserFormState = { error?: string } | undefined;
