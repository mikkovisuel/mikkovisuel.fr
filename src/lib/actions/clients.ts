"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { verifyAdminSession, verifyClientSession, assertNotDemo } from "@/lib/dal";
import { hashPassword } from "@/lib/password";
import { requireFreshAdminPassword, type StepUpFormState } from "@/lib/step-up-auth";
import { logAuditEvent } from "@/lib/audit-log";
import { getClientIp } from "@/lib/request-ip";
import { destroyAllSessionsForSubject } from "@/lib/session";
import { sendClientPasswordResetEmail } from "@/lib/actions/password-reset";
import {
  ClientSchema,
  ContactCreateSchema,
  ContactEditSchema,
  type ClientFormState,
  type ContactFormState,
  type ContactEditFormState,
} from "@/lib/validation/client";

export async function createClient(
  _prev: ClientFormState,
  formData: FormData,
): Promise<ClientFormState> {
  await verifyAdminSession();

  const parsed = ClientSchema.safeParse({
    name: formData.get("name"),
    notes: formData.get("notes"),
    address: formData.get("address"),
    siret: formData.get("siret"),
    vatNumber: formData.get("vatNumber"),
    billingEmail: formData.get("billingEmail"),
    driveUrl: formData.get("driveUrl"),
    categoryId: formData.get("categoryId"),
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Formulaire invalide." };
  }

  const client = await db.client.create({ data: parsed.data });
  revalidatePath("/admin/clients");
  redirect(`/admin/clients/${client.id}`);
}

export async function updateClient(
  clientId: string,
  _prev: ClientFormState,
  formData: FormData,
): Promise<ClientFormState> {
  await verifyAdminSession();

  const parsed = ClientSchema.safeParse({
    name: formData.get("name"),
    notes: formData.get("notes"),
    address: formData.get("address"),
    siret: formData.get("siret"),
    vatNumber: formData.get("vatNumber"),
    billingEmail: formData.get("billingEmail"),
    driveUrl: formData.get("driveUrl"),
    categoryId: formData.get("categoryId"),
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Formulaire invalide." };
  }

  await db.client.update({ where: { id: clientId }, data: parsed.data });
  revalidatePath(`/admin/clients/${clientId}`);
  revalidatePath("/admin/clients");
  return undefined;
}

// Action irréversible (supprime aussi tâches/documents/livrables en
// cascade) — protégée par une reconfirmation du mot de passe admin juste
// avant, en plus de la session déjà active (voir requireFreshAdminPassword).
export async function deleteClient(
  clientId: string,
  _prev: StepUpFormState,
  formData: FormData,
): Promise<StepUpFormState> {
  const admin = await verifyAdminSession();
  const error = await requireFreshAdminPassword(formData);
  if (error) return { error };

  const client = await db.client.findUnique({ where: { id: clientId } });
  await db.client.delete({ where: { id: clientId } });

  await logAuditEvent({
    actorType: "ADMIN",
    actorId: admin.id,
    actorLabel: admin.email,
    action: "client_deleted",
    targetType: "Client",
    targetId: clientId,
    targetLabel: client?.name,
    ipAddress: await getClientIp(),
  });

  revalidatePath("/admin/clients");
  redirect("/admin/clients");
}

function revalidateContactPaths(clientId: string) {
  revalidatePath(`/admin/clients/${clientId}`);
  revalidatePath("/admin/contacts");
  revalidatePath("/admin/clients");
}

// Création d'un contact. Selon `access`, il reste une simple entrée du carnet
// d'adresses, reçoit une invitation à choisir son mot de passe, ou se voit
// attribuer un mot de passe défini par l'admin (voir `ContactCreateSchema`).
export async function createClientContact(
  clientId: string,
  _prev: ContactFormState,
  formData: FormData,
): Promise<ContactFormState> {
  await verifyAdminSession();

  const parsed = ContactCreateSchema.safeParse({
    name: formData.get("name"),
    email: formData.get("email"),
    phone: formData.get("phone"),
    role: formData.get("role"),
    access: formData.get("access"),
    password: formData.get("password"),
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Formulaire invalide." };
  }
  const { name, email, phone, role, access, password } = parsed.data;

  if (email) {
    const existing = await db.clientUser.findUnique({ where: { email } });
    if (existing) {
      return { error: "Un contact existe déjà avec cet email." };
    }
  }

  const contact = await db.clientUser.create({
    data: {
      clientId,
      name,
      email,
      phone: phone || null,
      role: role || null,
      portalAccessEnabled: access !== "none",
      // Seul le mode "password" définit un mot de passe tout de suite. En mode
      // "invite", l'accès est ouvert mais le hash reste nul jusqu'à ce que le
      // contact suive son lien — c'est l'état "invitation à envoyer".
      passwordHash: access === "password" ? await hashPassword(password as string) : null,
    },
  });

  if (access === "invite") {
    await sendClientPasswordResetEmail(contact);
  }

  revalidateContactPaths(clientId);
  return undefined;
}

export async function updateClientContact(
  clientUserId: string,
  clientId: string,
  _prev: ContactEditFormState,
  formData: FormData,
): Promise<ContactEditFormState> {
  await verifyAdminSession();

  const parsed = ContactEditSchema.safeParse({
    name: formData.get("name"),
    email: formData.get("email"),
    phone: formData.get("phone"),
    role: formData.get("role"),
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Formulaire invalide." };
  }

  const contact = await db.clientUser.findUnique({ where: { id: clientUserId } });
  if (!contact) return { error: "Contact introuvable." };

  // Retirer l'email d'un contact qui se connecte lui couperait l'accès sans
  // que l'admin l'ait demandé (l'email EST l'identifiant) — on refuse plutôt
  // que de fermer l'accès en douce.
  if (!parsed.data.email && contact.portalAccessEnabled) {
    return {
      error: "Ce contact a un accès à l'espace client : son email ne peut pas être retiré.",
    };
  }

  if (parsed.data.email && parsed.data.email !== contact.email) {
    const existing = await db.clientUser.findUnique({ where: { email: parsed.data.email } });
    if (existing) {
      return { error: "Un contact existe déjà avec cet email." };
    }
  }

  await db.clientUser.update({
    where: { id: clientUserId },
    data: {
      name: parsed.data.name,
      email: parsed.data.email,
      phone: parsed.data.phone || null,
      role: parsed.data.role || null,
    },
  });

  revalidateContactPaths(clientId);
  return { success: true };
}

// Ouvre ou ferme l'accès à l'espace client. Fermer ne supprime ni le contact
// ni son mot de passe : rouvrir plus tard restaure l'accès tel quel, sans
// nouvelle invitation. Les sessions en cours sont en revanche révoquées —
// sinon fermer un accès ne prendrait effet qu'à la prochaine déconnexion.
export async function toggleContactPortalAccess(clientUserId: string, clientId: string) {
  const admin = await verifyAdminSession();

  const contact = await db.clientUser.findUnique({ where: { id: clientUserId } });
  if (!contact) return;

  const enabled = !contact.portalAccessEnabled;
  if (enabled && !contact.email) return;

  await db.clientUser.update({
    where: { id: clientUserId },
    data: { portalAccessEnabled: enabled },
  });

  if (!enabled) {
    await destroyAllSessionsForSubject("CLIENT_USER", clientUserId);
  }

  await logAuditEvent({
    actorType: "ADMIN",
    actorId: admin.id,
    actorLabel: admin.email,
    action: enabled ? "client_portal_access_opened" : "client_portal_access_closed",
    targetType: "ClientUser",
    targetId: contact.id,
    targetLabel: contact.email ?? contact.name,
    ipAddress: await getClientIp(),
  });

  revalidateContactPaths(clientId);
}

// Envoi (ou renvoi) du lien d'invitation. Même email que la réinitialisation
// de mot de passe — c'est le même geste côté contact : suivre un lien et
// choisir un mot de passe.
export async function sendContactInvitation(
  clientUserId: string,
  clientId: string,
): Promise<{ error?: string; success?: boolean }> {
  await verifyAdminSession();

  const contact = await db.clientUser.findUnique({ where: { id: clientUserId } });
  if (!contact) return { error: "Contact introuvable." };
  if (!contact.portalAccessEnabled) {
    return { error: "Ouvrez d'abord l'accès à l'espace client." };
  }

  const sent = await sendClientPasswordResetEmail(contact);
  if (!sent) return { error: "Ce contact n'a pas d'adresse email." };

  revalidateContactPaths(clientId);
  return { success: true };
}

// Bascule "reçoit les emails automatiques" par profil (bouton une pastille,
// même pattern que `toggleTaskPin`) — pour couper les notifications d'un
// profil sans supprimer le compte, ex. un client avec plusieurs contacts
// dont un seul doit être notifié. N'affecte jamais l'email de
// réinitialisation de mot de passe.
export async function toggleClientUserEmailNotifications(clientUserId: string, clientId: string) {
  await verifyAdminSession();

  const clientUser = await db.clientUser.findUnique({ where: { id: clientUserId } });
  if (!clientUser) return;

  await db.clientUser.update({
    where: { id: clientUserId },
    data: { emailNotificationsEnabled: !clientUser.emailNotificationsEnabled },
  });

  revalidatePath(`/admin/clients/${clientId}`);
  // Vue consolidée de tous les profils, tous clients confondus — voir
  // /admin/reglages.
  revalidatePath("/admin/reglages");
}

// Variante self-service de `toggleClientUserEmailNotifications` : le client
// bascule sa propre préférence depuis "Mon compte", sans passer par l'admin
// (même champ `ClientUser.emailNotificationsEnabled`, juste un point d'accès
// différent — les deux restent en phase).
export async function toggleOwnEmailNotifications() {
  const clientUser = await verifyClientSession();
  assertNotDemo(clientUser);

  await db.clientUser.update({
    where: { id: clientUser.id },
    data: { emailNotificationsEnabled: !clientUser.emailNotificationsEnabled },
  });

  revalidatePath("/espace-client/compte");
  revalidatePath(`/admin/clients/${clientUser.clientId}`);
  revalidatePath("/admin/reglages");
}

export async function deleteClientUser(clientUserId: string, clientId: string) {
  await verifyAdminSession();
  await db.clientUser.delete({ where: { id: clientUserId } });
  revalidatePath(`/admin/clients/${clientId}`);
}
