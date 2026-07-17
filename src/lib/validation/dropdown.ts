import { z } from "zod";
import { PALETTE_COLORS } from "@/lib/dropdown-lists";

export const DropdownItemSchema = z.object({
  label: z.string().trim().min(1, { message: "Le libellé est requis." }),
  color: z.enum(PALETTE_COLORS, { message: "Couleur invalide." }),
});

export type DropdownItemFormState = { error?: string } | undefined;
