import { z } from "zod";

export const ClientSchema = z.object({
  name: z.string().trim().min(1, { message: "Le nom est requis." }),
  notes: z.string().trim().optional(),
  address: z.string().trim().optional(),
  siret: z.string().trim().optional(),
  vatNumber: z.string().trim().optional(),
});

export const ClientUserSchema = z.object({
  name: z.string().trim().min(1, { message: "Le nom est requis." }),
  email: z.string().trim().toLowerCase().email({ message: "Adresse email invalide." }),
  password: z.string().min(8, { message: "8 caractères minimum." }),
  phone: z.string().trim().optional(),
  role: z.string().trim().optional(),
});

export const ClientUserEditSchema = z.object({
  phone: z.string().trim().optional(),
  role: z.string().trim().optional(),
});

export type ClientFormState = { error?: string } | undefined;
export type ClientUserFormState = { error?: string } | undefined;
export type ClientUserEditFormState = { error?: string; success?: boolean } | undefined;
