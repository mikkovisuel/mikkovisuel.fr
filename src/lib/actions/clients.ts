"use server";

import { randomUUID } from "node:crypto";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { getStorageAdapter } from "@/lib/storage";
import { contentMatchesDeclaredType } from "@/lib/file-signature";
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
    raisonSociale: formData.get("raisonSociale"),
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
    raisonSociale: formData.get("raisonSociale"),
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
  return { success: true };
}

const MAX_AVATAR_SIZE = 5 * 1024 * 1024;
const ALLOWED_AVATAR_TYPES = new Set(["image/png", "image/jpeg", "image/webp"]);

// Avatar du client (logo ou photo), affiché en rond dans la liste des
// clients. Action séparée du formulaire d'informations : un envoi de fichier
// et une mise à jour de champs texte n'ont ni les mêmes contraintes de taille
// ni le même besoin de revalidation, et les mélanger obligerait à renvoyer
// l'image à chaque simple changement de nom.
//
// Même validation que les autres envois d'image du projet : taille, type
// MIME déclaré, **et** signature binaire réelle (`contentMatchesDeclaredType`)
// — un fichier renommé en `.png` ne passe pas.
export async function updateClientAvatar(
  clientId: string,
  _prev: ClientFormState,
  formData: FormData,
): Promise<ClientFormState> {
  await verifyAdminSession();

  const file = formData.get("avatar");
  if (!(file instanceof File) || file.size === 0) {
    return { error: "Choisissez une image." };
  }
  if (file.size > MAX_AVATAR_SIZE) {
    return { error: "Image trop volumineuse (5 Mo maximum)." };
  }
  if (!ALLOWED_AVATAR_TYPES.has(file.type)) {
    return { error: "Format non autorisé (PNG, JPEG ou WebP)." };
  }
  const buffer = Buffer.from(await file.arrayBuffer());
  if (!(await contentMatchesDeclaredType(buffer, file.type))) {
    return { error: "Le contenu du fichier ne correspond pas à une image valide." };
  }

  const client = await db.client.findUnique({ where: { id: clientId } });
  if (!client) return { error: "Client introuvable." };

  const storage = getStorageAdapter();
  const storageKey = `client-avatars/${randomUUID()}`;
  await storage.save(storageKey, buffer);
  // L'ancienne image n'est supprimée qu'une fois la nouvelle écrite : en cas
  // d'échec de l'envoi, le client garde son avatar précédent.
  if (client.avatarStorageKey) await storage.delete(client.avatarStorageKey);

  await db.client.update({
    where: { id: clientId },
    data: {
      avatarStorageKey: storageKey,
      avatarMimeType: file.type,
      avatarStorageBackend: storage.backend,
    },
  });

  revalidatePath(`/admin/clients/${clientId}`);
  revalidatePath("/admin/clients");
  return undefined;
}

export async function removeClientAvatar(clientId: string) {
  await verifyAdminSession();

  const client = await db.client.findUnique({ where: { id: clientId } });
  if (!client?.avatarStorageKey) return;

  await getStorageAdapter().delete(client.avatarStorageKey);
  await db.client.update({
    where: { id: clientId },
    data: { avatarStorageKey: null, avatarMimeType: null, avatarStorageBackend: null },
  });

  revalidatePath(`/admin/clients/${clientId}`);
  revalidatePath("/admin/clients");
}

// Archivage réversible d'un client, alternative non destructive à
// `deleteClient` : le client sort des listes et des sélecteurs de travail
// (voir `ACTIVE_CLIENTS`) mais conserve tâches, contacts, documents et
// historique, et reste compté dans les Finances et les exports.
//
// Les accès à l'espace client ne sont volontairement **pas** touchés :
// archiver est un geste de rangement, pas une révocation. Couper l'accès
// reste un geste explicite, contact par contact.
export async function toggleClientArchived(clientId: string) {
  await verifyAdminSession();

  const client = await db.client.findUnique({ where: { id: clientId } });
  if (!client) return;

  await db.client.update({
    where: { id: clientId },
    data: { archivedAt: client.archivedAt ? null : new Date() },
  });

  revalidatePath(`/admin/clients/${clientId}`);
  revalidatePath("/admin/clients");
  revalidatePath("/admin");
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
//
// Depuis le 2026-07-31 ("un contact peut être dans plusieurs fiches
// clients"), deux modes selon `formData.get("mode")` :
//  - "nouveau" (par défaut) : crée une nouvelle identité `Contact` (email
//    doit être libre) puis le rattachement à ce client.
//  - "affecter" : réutilise un `Contact` déjà existant (choisi par email
//    dans `existingContactId`), lui ajoute juste un rattachement à ce
//    client — aucune ressaisie de nom/email/téléphone, c'est justement le
//    but.
async function createClientContactCore(
  clientId: string,
  formData: FormData,
): Promise<ContactFormState> {
  const mode = formData.get("mode") === "affecter" ? "affecter" : "nouveau";

  if (mode === "affecter") {
    const existingContactId = formData.get("existingContactId");
    if (typeof existingContactId !== "string" || !existingContactId) {
      return { error: "Choisissez un contact à affecter." };
    }
    const existingLink = await db.clientContact.findUnique({
      where: { clientId_contactId: { clientId, contactId: existingContactId } },
    });
    if (existingLink) {
      return { error: "Ce contact est déjà rattaché à ce client." };
    }
    await db.clientContact.create({ data: { clientId, contactId: existingContactId } });
    revalidateContactPaths(clientId);
    return undefined;
  }

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
    const existing = await db.contact.findUnique({ where: { email } });
    if (existing) {
      return {
        error:
          'Un contact existe déjà avec cet email — utilisez "Affecter un contact existant" pour le rattacher ici.',
      };
    }
  }

  const contact = await db.contact.create({
    data: { name, email, phone: phone || null, role: role || null },
  });
  const clientContact = await db.clientContact.create({
    data: {
      clientId,
      contactId: contact.id,
      portalAccessEnabled: access !== "none",
      // Seul le mode "password" définit un mot de passe tout de suite. En mode
      // "invite", l'accès est ouvert mais le hash reste nul jusqu'à ce que le
      // contact suive son lien — c'est l'état "invitation à envoyer".
      passwordHash: access === "password" ? await hashPassword(password as string) : null,
    },
  });

  if (access === "invite") {
    await sendClientPasswordResetEmail({ id: clientContact.id, email: contact.email });
  }

  revalidateContactPaths(clientId);
  return undefined;
}

// Depuis la fiche d'un client précis (le clientId est déjà connu, lié via
// `.bind`).
export async function createClientContact(
  clientId: string,
  _prev: ContactFormState,
  formData: FormData,
): Promise<ContactFormState> {
  await verifyAdminSession();
  return createClientContactCore(clientId, formData);
}

// Depuis l'onglet Contacts (annuaire global, aucun client déjà déterminé —
// demande du 2026-07-31, "à afficher dans l'onglet et dans la fiche
// clients") : `clientId` vient du formulaire, pas d'un `.bind` déjà fixé.
export async function createClientContactAnyClient(
  _prev: ContactFormState,
  formData: FormData,
): Promise<ContactFormState> {
  await verifyAdminSession();

  const clientId = formData.get("clientId");
  if (typeof clientId !== "string" || !clientId) {
    return { error: "Choisissez un client." };
  }
  return createClientContactCore(clientId, formData);
}

// Édite l'identité partagée (`Contact`) depuis la fiche d'un client donné.
// Depuis le split du 2026-07-31, un même `Contact` peut être rattaché à
// plusieurs clients — modifier son nom/email/téléphone/fonction ici les
// modifie donc partout où ce contact apparaît, ce qui est le comportement
// attendu pour une identité partagée (ce n'est plus une fiche propre à un
// seul client).
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

  const link = await db.clientContact.findUnique({
    where: { id: clientUserId },
    include: { contact: true },
  });
  if (!link) return { error: "Contact introuvable." };

  // Retirer l'email d'un contact qui se connecte lui couperait l'accès sans
  // que l'admin l'ait demandé (l'email EST l'identifiant) — on refuse plutôt
  // que de fermer l'accès en douce.
  if (!parsed.data.email && link.portalAccessEnabled) {
    return {
      error: "Ce contact a un accès à l'espace client : son email ne peut pas être retiré.",
    };
  }

  if (parsed.data.email && parsed.data.email !== link.contact.email) {
    const existing = await db.contact.findUnique({ where: { email: parsed.data.email } });
    if (existing && existing.id !== link.contactId) {
      return { error: "Un contact existe déjà avec cet email." };
    }
  }

  await db.contact.update({
    where: { id: link.contactId },
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

  const contact = await db.clientContact.findUnique({
    where: { id: clientUserId },
    include: { contact: true },
  });
  if (!contact) return;

  const enabled = !contact.portalAccessEnabled;
  if (enabled && !contact.contact.email) return;

  await db.clientContact.update({
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
    targetLabel: contact.contact.email ?? contact.contact.name,
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

  const contact = await db.clientContact.findUnique({
    where: { id: clientUserId },
    include: { contact: true },
  });
  if (!contact) return { error: "Contact introuvable." };
  if (!contact.portalAccessEnabled) {
    return { error: "Ouvrez d'abord l'accès à l'espace client." };
  }

  const sent = await sendClientPasswordResetEmail({ id: contact.id, email: contact.contact.email });
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

  const clientUser = await db.clientContact.findUnique({ where: { id: clientUserId } });
  if (!clientUser) return;

  await db.clientContact.update({
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

  await db.clientContact.update({
    where: { id: clientUser.id },
    data: { emailNotificationsEnabled: !clientUser.emailNotificationsEnabled },
  });

  revalidatePath("/espace-client/compte");
  revalidatePath(`/admin/clients/${clientUser.clientId}`);
  revalidatePath("/admin/reglages");
}

// Ne supprime que le rattachement à CE client (`ClientContact`), pas
// l'identité partagée (`Contact`) — un contact rattaché à plusieurs clients
// (2026-07-31) ne doit pas disparaître de son autre fiche client parce
// qu'on l'a retiré d'une seule. Un `Contact` qui se retrouve rattaché à
// zéro client reste en base, orphelin mais inoffensif (il ne s'affiche
// nulle part) — accepté comme compromis simple plutôt qu'un ménage
// automatique hors scope de cette évolution.
export async function deleteClientUser(clientUserId: string, clientId: string) {
  await verifyAdminSession();
  await db.clientContact.delete({ where: { id: clientUserId } });
  revalidatePath(`/admin/clients/${clientId}`);
}

// Suppression définitive d'une identité `Contact` (2026-08-02, "possible de
// supprimer définitivement un contact ?") — jusqu'ici seul le rattachement à
// UN client pouvait être retiré (`deleteClientUser` ci-dessus), l'identité
// restait en base indéfiniment, orpheline et invisible dans l'admin dès
// qu'elle n'était plus rattachée à aucun client (voir le filtre "Sans
// client" de `/admin/contacts`). Action irréversible, protégée par
// reconfirmation du mot de passe admin (même famille que `deleteClient`).
// `ClientContact.contactId` est en cascade en base : supprimer un contact
// encore rattaché à d'autres clients les lui retire TOUS d'un coup — décision
// validée avec le client (toujours possible, mais avec avertissement listant
// les clients concernés, affiché côté formulaire avant confirmation).
export async function deleteContactPermanently(
  contactId: string,
  _prev: StepUpFormState,
  formData: FormData,
): Promise<StepUpFormState> {
  const admin = await verifyAdminSession();
  const error = await requireFreshAdminPassword(formData);
  if (error) return { error };

  const contact = await db.contact.findUnique({
    where: { id: contactId },
    include: { clientLinks: true },
  });
  if (!contact) return { error: "Contact introuvable." };

  // Invalide toute session active avant la suppression en cascade : effacer
  // la ligne ClientContact ne referme pas de lui-même un cookie de session
  // déjà émis pour ce rattachement.
  for (const link of contact.clientLinks) {
    await destroyAllSessionsForSubject("CLIENT_USER", link.id);
  }

  await db.contact.delete({ where: { id: contactId } });

  await logAuditEvent({
    actorType: "ADMIN",
    actorId: admin.id,
    actorLabel: admin.email,
    action: "contact_deleted",
    targetType: "Contact",
    targetId: contactId,
    targetLabel: contact.name,
    ipAddress: await getClientIp(),
  });

  revalidatePath("/admin/contacts");
  revalidatePath("/admin/clients");
  for (const link of contact.clientLinks) {
    revalidatePath(`/admin/clients/${link.clientId}`);
  }
  return { success: true };
}
