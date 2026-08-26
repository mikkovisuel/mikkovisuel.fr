"use server";

import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { verifyPassword } from "@/lib/password";
import { createSession, destroySession } from "@/lib/session";
import { isRateLimited, recordLoginAttempt } from "@/lib/rate-limit";
import { getClientIp } from "@/lib/request-ip";
import { setThemeCookie } from "@/lib/actions/theme";
import { canLogIn } from "@/lib/clients";
import { verifyClientSession } from "@/lib/dal";
import { LoginSchema, type LoginFormState } from "@/lib/validation/auth";
import type { ClientContact } from "@/generated/prisma/client";

const GENERIC_ERROR = "Email ou mot de passe incorrect.";

export async function clientLogin(
  _prevState: LoginFormState,
  formData: FormData,
): Promise<LoginFormState> {
  const parsed = LoginSchema.safeParse({
    email: formData.get("email"),
    password: formData.get("password"),
  });

  if (!parsed.success) {
    return { error: GENERIC_ERROR };
  }

  const { email, password } = parsed.data;
  const ipAddress = await getClientIp();

  if (await isRateLimited(email, ipAddress)) {
    return { error: "Trop de tentatives. Réessayez dans quelques minutes." };
  }

  // Depuis le split Contact/ClientContact (2026-07-31, "un contact peut être
  // dans plusieurs fiches clients"), l'email identifie une personne
  // (`Contact`), qui peut avoir un accès ouvert chez plusieurs clients à la
  // fois, chacun avec son propre mot de passe indépendant — "l'accès reste
  // par client". Le mot de passe saisi désigne donc lui-même la bonne fiche
  // client, sans qu'aucun écran de sélection ne soit nécessaire : on
  // l'essaie contre chaque accès ouvert jusqu'à trouver celui qui
  // correspond.
  const contact = await db.contact.findUnique({
    where: { email },
    include: { clientLinks: { where: { portalAccessEnabled: true } } },
  });

  let matched: ClientContact | null = null;
  if (contact) {
    for (const link of contact.clientLinks) {
      // `canLogIn` couvre aussi les accès sans mot de passe encore défini
      // (invitation en attente) — on ne vérifie le mot de passe que si le
      // lien a effectivement le droit d'entrer.
      if (canLogIn({ ...link, email: contact.email }) && (await verifyPassword(password, link.passwordHash as string))) {
        matched = link;
        break;
      }
    }
  }

  // Message générique dans tous les cas, y compris "email inconnu" ou
  // "accès fermé" : le distinguer renseignerait un attaquant sur l'existence
  // du compte.
  await recordLoginAttempt(email, Boolean(matched), ipAddress);

  if (!matched) {
    return { error: GENERIC_ERROR };
  }

  await db.clientContact.update({
    where: { id: matched.id },
    data: { lastLoginAt: new Date() },
  });
  await db.clientLoginEvent.create({ data: { clientContactId: matched.id } });

  await createSession("CLIENT_USER", matched.id);
  await setThemeCookie(matched.themePreference === "dark" ? "dark" : "light");
  redirect("/espace-client");
}

// Sélecteur de club (2026-08-25, "peut-on faire en sorte de tout voir ?") :
// un contact partagé entre plusieurs clients peut basculer d'un accès à
// l'autre sans ressaisir de mot de passe, plutôt qu'une vue fusionnée qui
// aurait cassé le cloisonnement des données voulu par le split
// Contact/ClientContact. Reste malgré tout un changement de compte, pas une
// simple préférence d'affichage : on revérifie ici, côté serveur, que la
// cible appartient bien au même `Contact` que la session en cours et que son
// accès est toujours ouvert — sans ça, passer n'importe quel id de
// ClientContact suffirait à usurper l'espace d'un autre client.
export async function switchClientSpace(targetClientContactId: string) {
  const current = await verifyClientSession();

  const target = await db.clientContact.findUnique({
    where: { id: targetClientContactId },
    include: { contact: true },
  });

  if (
    !target ||
    target.contactId !== current.contactId ||
    !canLogIn({ ...target, email: target.contact.email })
  ) {
    throw new Error("Accès non autorisé.");
  }

  await destroySession();
  await createSession("CLIENT_USER", target.id);
  await setThemeCookie(target.themePreference === "dark" ? "dark" : "light");
  await db.clientContact.update({ where: { id: target.id }, data: { lastLoginAt: new Date() } });
  await db.clientLoginEvent.create({ data: { clientContactId: target.id } });

  redirect("/espace-client");
}
