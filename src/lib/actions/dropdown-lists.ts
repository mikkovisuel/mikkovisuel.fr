"use server";

import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { verifyAdminSession } from "@/lib/dal";
import { slugify } from "@/lib/slugify";
import { DropdownItemSchema, type DropdownItemFormState } from "@/lib/validation/dropdown";

async function nextSortOrder(listId: string) {
  const last = await db.dropdownItem.findFirst({
    where: { listId },
    orderBy: { sortOrder: "desc" },
  });
  return (last?.sortOrder ?? -1) + 1;
}

export async function createDropdownItem(
  listId: string,
  listKey: string,
  _prev: DropdownItemFormState,
  formData: FormData,
): Promise<DropdownItemFormState> {
  await verifyAdminSession();

  const list = await db.dropdownList.findUnique({ where: { id: listId } });
  if (!list || !list.allowCustomItems) {
    return { error: "Cette liste n'autorise pas l'ajout de nouveaux éléments." };
  }

  const parsed = DropdownItemSchema.safeParse({
    label: formData.get("label"),
    color: formData.get("color"),
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Formulaire invalide." };
  }

  const slug = slugify(parsed.data.label);

  const existing = await db.dropdownItem.findUnique({
    where: { listId_slug: { listId, slug } },
  });
  if (existing) {
    return { error: "Un élément avec un libellé équivalent existe déjà." };
  }

  await db.dropdownItem.create({
    data: {
      listId,
      slug,
      label: parsed.data.label,
      color: parsed.data.color,
      sortOrder: await nextSortOrder(listId),
    },
  });

  revalidatePath(`/admin/listes/${listKey}`);
  return undefined;
}

export async function updateDropdownItem(
  itemId: string,
  listKey: string,
  _prev: DropdownItemFormState,
  formData: FormData,
): Promise<DropdownItemFormState> {
  await verifyAdminSession();

  const parsed = DropdownItemSchema.safeParse({
    label: formData.get("label"),
    color: formData.get("color"),
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Formulaire invalide." };
  }

  await db.dropdownItem.update({
    where: { id: itemId },
    data: { label: parsed.data.label, color: parsed.data.color },
  });

  revalidatePath(`/admin/listes/${listKey}`);
  return { success: true };
}

export async function deleteDropdownItem(itemId: string, listKey: string) {
  await verifyAdminSession();

  const item = await db.dropdownItem.findUnique({ where: { id: itemId } });
  if (!item || item.locked) return;

  await db.dropdownItem.delete({ where: { id: itemId } });
  revalidatePath(`/admin/listes/${listKey}`);
}

export async function moveDropdownItem(
  listId: string,
  itemId: string,
  listKey: string,
  direction: "up" | "down",
) {
  await verifyAdminSession();

  const items = await db.dropdownItem.findMany({
    where: { listId },
    orderBy: { sortOrder: "asc" },
  });
  const index = items.findIndex((item) => item.id === itemId);
  const swapIndex = direction === "up" ? index - 1 : index + 1;
  if (index === -1 || swapIndex < 0 || swapIndex >= items.length) return;

  const current = items[index];
  const swapWith = items[swapIndex];

  await db.$transaction([
    db.dropdownItem.update({ where: { id: current.id }, data: { sortOrder: swapWith.sortOrder } }),
    db.dropdownItem.update({ where: { id: swapWith.id }, data: { sortOrder: current.sortOrder } }),
  ]);

  revalidatePath(`/admin/listes/${listKey}`);
}
