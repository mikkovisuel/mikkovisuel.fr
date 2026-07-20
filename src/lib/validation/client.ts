import { z } from "zod";

// Convertit une chaîne vide en `null` avant validation. Ces champs sont
// facultatifs mais strictement validés dès qu'une valeur est saisie — et le
// résultat est toujours `string | null` (jamais `undefined`), pour qu'un
// champ vidé par l'admin efface bien la valeur en base : Prisma ignore les
// clés `undefined` dans un `update` (donc l'ancienne valeur resterait),
// alors que `null` l'écrase explicitement.
const emptyToNull = (val: unknown) => (typeof val === "string" && val.trim() === "" ? null : val);

export const ClientSchema = z.object({
  name: z.string().trim().min(1, { message: "Le nom est requis." }),
  notes: z.string().trim().optional(),
  address: z.string().trim().optional(),
  siret: z.string().trim().optional(),
  vatNumber: z.string().trim().optional(),
  billingEmail: z.preprocess(
    emptyToNull,
    z.string().trim().toLowerCase().email({ message: "Email de facturation invalide." }).nullable(),
  ),
  driveUrl: z.preprocess(
    emptyToNull,
    z.string().trim().url({ message: "Lien Google Drive invalide." }).nullable(),
  ),
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
