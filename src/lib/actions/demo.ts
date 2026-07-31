"use server";

import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { createSession } from "@/lib/session";
import { setThemeCookie } from "@/lib/actions/theme";

const DEMO_SESSION_DURATION_MS = 2 * 60 * 60 * 1000;

// Point d'entrée public (aucune authentification requise) pour le bouton
// "Voir l'espace client de démo" du site vitrine — ouvre une session client
// de courte durée sur le compte marqué `Client.isDemo`, seedé par
// `seedPublicDemoClient` (prisma/seed.ts). L'espace reste en lecture seule :
// voir `assertNotDemo` dans src/lib/dal.ts, appelé par chaque Server Action
// d'écriture côté client.
export async function viewDemoClientSpace() {
  const demoUser = await db.clientContact.findFirst({
    where: { client: { isDemo: true } },
  });
  if (!demoUser) return;

  await createSession("CLIENT_USER", demoUser.id, DEMO_SESSION_DURATION_MS);
  await setThemeCookie(demoUser.themePreference === "dark" ? "dark" : "light");
  redirect("/espace-client");
}
