import "server-only";
import { cache } from "react";
import { redirect } from "next/navigation";
import { readSession } from "@/lib/session";
import { db } from "@/lib/db";

// This is the real authorization boundary — proxy.ts only does an optimistic
// cookie-presence redirect. Every Server Action, Route Handler, and
// data-fetching Server Component that touches protected data must call one
// of the verify* functions below (or the get* variants for optional checks).
// See /Users/mikko/.claude/plans/smooth-crafting-rose.md.

export const getAdminSession = cache(async () => {
  const session = await readSession();
  if (!session || session.subjectType !== "ADMIN") return null;
  return db.admin.findUnique({ where: { id: session.subjectId } });
});

export const verifyAdminSession = cache(async () => {
  const admin = await getAdminSession();
  if (!admin) {
    redirect("/admin/connexion");
  }
  return admin;
});

// Fusionne `ClientContact` (compte d'accès, un par rattachement client) et
// `Contact` (identité partagée, voir la migration du 2026-07-31 "split
// Contact/ClientContact") en un seul objet à plat, avec exactement les
// mêmes noms de champs qu'avant la scission (`.name`, `.email`, `.phone`,
// `.role`). Choix délibéré : toutes les pages de l'espace client (une
// quinzaine) lisaient `clientUser.name`/`.email` directement — aplatir ici,
// au seul point d'entrée de la session, évite de les toucher une par une.
// `.id` reste l'id du compte de connexion (`ClientContact.id`, identique à
// l'ancien `ClientUser.id`) puisque c'est lui que `session.subjectId`
// référence ; `.contactId` est ajouté à part pour le rare appelant qui a
// vraiment besoin de l'identité partagée plutôt que du compte.
function flattenClientContact<
  T extends {
    id: string;
    contact: {
      id: string;
      name: string;
      email: string | null;
      phone: string | null;
      role: string | null;
      clientLinks: { id: string; client: { id: string; name: string } }[];
    };
  },
>(clientContact: T) {
  const { contact, ...rest } = clientContact;
  return {
    ...rest,
    contactId: contact.id,
    name: contact.name,
    email: contact.email,
    phone: contact.phone,
    role: contact.role,
    // Sélecteur de club (2026-08-25, "peut-on faire en sorte de tout
    // voir ?" — un contact partagé entre deux clients bascule maintenant
    // sans se reconnecter, plutôt qu'une vue fusionnée qui aurait cassé
    // le cloisonnement voulu par le split Contact/ClientContact). Ne liste
    // que les autres accès réellement utilisables (`canLogIn`, filtré côté
    // requête) — un accès fermé ou une invitation encore en attente
    // n'apparaît pas dans le sélecteur.
    otherClients: contact.clientLinks
      .filter((link) => link.id !== clientContact.id)
      .map((link) => ({ clientContactId: link.id, clientId: link.client.id, clientName: link.client.name })),
  };
}

export const getClientSession = cache(async () => {
  const session = await readSession();
  if (!session || session.subjectType !== "CLIENT_USER") return null;
  const clientContact = await db.clientContact.findUnique({
    where: { id: session.subjectId },
    include: {
      client: true,
      contact: {
        include: {
          clientLinks: {
            where: { portalAccessEnabled: true, passwordHash: { not: null } },
            include: { client: { select: { id: true, name: true } } },
          },
        },
      },
    },
  });
  if (!clientContact) return null;
  return flattenClientContact(clientContact);
});

export const verifyClientSession = cache(async () => {
  const clientUser = await getClientSession();
  if (!clientUser) {
    redirect("/espace-client/connexion");
  }
  return clientUser;
});

// Verrou du mode lecture seule de l'espace client de démonstration
// (Client.isDemo — voir src/lib/actions/demo.ts). L'espace démo est
// accessible publiquement sans connexion, donc masquer les boutons
// d'action côté UI ne suffit pas : chaque Server Action d'écriture côté
// client doit appeler ce garde en tête, juste après verifyClientSession().
export function assertNotDemo(clientUser: { client: { isDemo: boolean } }) {
  if (clientUser.client.isDemo) {
    throw new Error("Cette action n'est pas disponible dans l'espace de démonstration.");
  }
}
