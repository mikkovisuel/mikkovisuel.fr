"use server";

import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { verifyAdminSession } from "@/lib/dal";

// Pense-bête de l'onglet Tâches — voir le commentaire sur `ScratchpadItem`
// dans schema.prisma pour le contexte (2026-08-27, "petite liste qui ne
// sont reliées à rien, à la Google Tasks").
export async function addScratchpadItem(label: string) {
  await verifyAdminSession();
  const trimmed = label.trim();
  if (!trimmed) throw new Error("Le libellé est requis.");

  const first = await db.scratchpadItem.findFirst({ orderBy: { sortOrder: "asc" } });
  const item = await db.scratchpadItem.create({
    data: { label: trimmed, sortOrder: (first?.sortOrder ?? 0) - 1 },
  });
  revalidatePath("/admin/taches");
  return { id: item.id, label: item.label };
}

// Cocher un item le supprime directement (pas de section "Terminé" —
// choix confirmé, un pense-bête reste jetable) ; `deleteMany` plutôt que
// `delete` pour rester silencieux si l'item a déjà été retiré ailleurs.
export async function removeScratchpadItem(id: string) {
  await verifyAdminSession();
  await db.scratchpadItem.deleteMany({ where: { id } });
  revalidatePath("/admin/taches");
}
