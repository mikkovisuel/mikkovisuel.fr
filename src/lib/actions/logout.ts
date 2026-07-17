"use server";

import { redirect } from "next/navigation";
import { readSession } from "@/lib/session";
import { destroySession } from "@/lib/session";

export async function logout() {
  const session = await readSession();
  await destroySession();
  redirect(session?.subjectType === "ADMIN" ? "/admin/connexion" : "/espace-client/connexion");
}
