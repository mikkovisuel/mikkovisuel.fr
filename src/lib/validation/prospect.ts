import { z } from "zod";

// Même pattern que ClientSchema (src/lib/validation/client.ts) : une chaîne
// vide devient `null` avant validation, pour qu'un champ vidé par l'admin
// efface bien la valeur en base plutôt que d'être ignoré par Prisma.
const emptyToNull = (val: unknown) => (typeof val === "string" && val.trim() === "" ? null : val);

export const ProspectSchema = z.object({
  name: z.string().trim().min(1, { message: "Le nom est requis." }),
  company: z.string().trim().optional(),
  address: z.string().trim().optional(),
  phone: z.string().trim().optional(),
  email: z.preprocess(
    emptyToNull,
    z.string().trim().toLowerCase().email({ message: "Adresse email invalide." }).nullable(),
  ),
  instagram: z.string().trim().optional(),
  website: z.string().trim().optional(),
  notes: z.string().trim().optional(),
  statusSlug: z.string().trim().min(1, { message: "Le statut est requis." }),
  nextReminderAt: z.preprocess(emptyToNull, z.string().nullable()),
});

export type ProspectFormState = { error?: string } | undefined;

export const ProspectSearchSchema = z.object({
  query: z.string().trim().min(3, { message: "Décrivez le type de prospect recherché." }),
  limit: z.coerce.number().int().min(1).max(15).default(8),
});

export type ProspectSearchState =
  | { error?: string; message?: string }
  | undefined;

export type ImportProspectsState = { error?: string; message?: string } | undefined;
