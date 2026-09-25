import { z } from "zod";

export type SocialActionFormState = { error?: string; saved?: boolean } | undefined;

// Action du module Réseaux (2026-09-25) : titre, description, date et
// heure (Paris), client facultatif. Volontairement minimal.
export const SocialActionSchema = z.object({
  title: z.string().trim().min(1, { message: "Donnez un titre à l'action." }).max(160),
  description: z.string().trim().max(4000, { message: "Description trop longue (4 000 caractères maximum)." }).optional(),
  clientId: z.string().optional(),
  // Saisie `datetime-local`, lue en heure de Paris par l'action serveur.
  dueAt: z.string().trim().min(1, { message: "Donnez une date à l'action." }),
});
