"use server";

import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { verifyClientSession } from "@/lib/dal";

export async function dismissTour() {
  const clientUser = await verifyClientSession();
  await db.clientContact.update({ where: { id: clientUser.id }, data: { hasSeenTour: true } });
  revalidatePath("/espace-client", "layout");
}
