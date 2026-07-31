import type { Prisma } from "@/generated/prisma/client";

// Même logique que `EXCLUDE_DEMO_CLIENT_TASKS` (src/lib/tasks.ts), mais pour
// les requêtes qui listent des clients plutôt que des tâches : le client de
// démo (`Client.isDemo`) est un outil interne (espace public de démo pour
// les prospects), pas un vrai client, donc à exclure des listes/sélecteurs
// de client courants de l'admin. Reste géré normalement depuis sa propre
// fiche (`/admin/clients/[clientId]`, qui ne l'utilise pas). Pour revenir en
// arrière, retirer ce filtre des requêtes qui l'utilisent (grep
// `EXCLUDE_DEMO_CLIENT`).
export const EXCLUDE_DEMO_CLIENT = {
  isDemo: false,
} satisfies Prisma.ClientWhereInput;

// Le filtre des clients "en activité" : démo exclu **et** clients archivés
// exclus. À utiliser partout où l'on travaille — listes, sélecteurs de
// création, compteurs du tableau de bord, digest hebdomadaire.
//
// Deux endroits gardent délibérément `EXCLUDE_DEMO_CLIENT` seul, et il ne
// faut pas les "corriger" :
//   - **Finances** : les factures d'un ancien client font toujours partie du
//     chiffre d'affaires. L'archiver ne doit pas réécrire l'historique.
//   - **Exports** : une sauvegarde amputée des anciens clients n'en est pas
//     une, et la réversibilité promise au client en dépend.
// La **recherche globale** les garde aussi : c'est justement le chemin par
// lequel on retrouve un ancien client.
export const ACTIVE_CLIENTS = {
  isDemo: false,
  archivedAt: null,
} satisfies Prisma.ClientWhereInput;

// Trois conditions pour recevoir une notification automatique, et pas
// seulement l'interrupteur `emailNotificationsEnabled` comme avant le
// 2026-07-30 :
//  1. avoir une adresse (un contact peut n'avoir qu'un téléphone) ;
//  2. avoir l'interrupteur activé ;
//  3. avoir un accès ouvert à l'espace client — toutes ces notifications
//     disent "c'est disponible dans votre espace client", les envoyer à
//     quelqu'un qui ne peut pas s'y connecter n'a aucun sens.
// Seul point de vérité : grep `notifiableEmails` pour retrouver les envois.
export function notifiableEmails(
  users: {
    email: string | null;
    emailNotificationsEnabled: boolean;
    portalAccessEnabled?: boolean;
  }[],
): string[] {
  return users
    .filter(
      (user) =>
        user.emailNotificationsEnabled &&
        user.email &&
        // `undefined` = l'appelant ne connaît pas ce champ (cas de l'acteur
        // d'une validation, déjà authentifié donc forcément avec un accès).
        user.portalAccessEnabled !== false,
    )
    .map((user) => user.email as string);
}

// Même chose que `notifiableEmails`, mais à partir de rattachements
// `ClientContact` chargés avec leur `contact` (identité) — depuis le split
// Contact/ClientContact du 2026-07-31, l'email n'est plus directement sur
// la ligne de compte, il faut le lire via `.contact.email`. Seul point de
// vérité pour ce petit aplatissement, plutôt que de le répéter à chaque
// appel (`task.client.contacts`, `document.client.contacts`...).
export function notifiableEmailsFromContacts(
  links: {
    emailNotificationsEnabled: boolean;
    portalAccessEnabled?: boolean;
    contact: { email: string | null };
  }[],
): string[] {
  return notifiableEmails(links.map((link) => ({ ...link, email: link.contact.email })));
}

// Un contact ne peut se connecter que si l'accès a été explicitement ouvert
// **et** qu'il a un email (identifiant) et un mot de passe défini. Les trois
// conditions sont distinctes : un contact invité mais qui n'a pas encore
// suivi son lien a l'accès ouvert et pas encore de mot de passe.
export function canLogIn(user: {
  email: string | null;
  passwordHash: string | null;
  portalAccessEnabled: boolean;
}): boolean {
  return user.portalAccessEnabled && Boolean(user.email) && Boolean(user.passwordHash);
}

// État d'accès d'un contact, tel qu'affiché dans l'admin. Les trois états
// sont distincts et se lisent dans cet ordre : pas d'accès → accès ouvert
// mais mot de passe pas encore choisi (invitation en attente) → accès
// opérationnel.
export type ContactAccessState = "none" | "pending" | "active";

export function contactAccessState(user: {
  passwordHash: string | null;
  portalAccessEnabled: boolean;
}): ContactAccessState {
  if (!user.portalAccessEnabled) return "none";
  return user.passwordHash ? "active" : "pending";
}

export const CONTACT_ACCESS_LABELS: Record<ContactAccessState, string> = {
  none: "Contact seul",
  pending: "Invitation à envoyer",
  active: "Espace client actif",
};

// Tri de la vue `/admin/clients` — voir `ClientSortControl`.
// Le tri par nombre de tâches a été retiré le 2026-07-30 en même temps que
// les compteurs de chaque ligne (demande du client) : trier sur un chiffre
// qui ne s'affiche plus nulle part n'avait plus de sens.
export type ClientSortField = "nom" | "date_ajout";
export type ClientSortDir = "asc" | "desc";

const CLIENT_SORT_FIELDS: ClientSortField[] = ["nom", "date_ajout"];

export function isClientSortField(value: string | undefined): value is ClientSortField {
  return CLIENT_SORT_FIELDS.includes(value as ClientSortField);
}

export function buildClientOrderBy(
  field: ClientSortField,
  dir: ClientSortDir,
): Prisma.ClientOrderByWithRelationInput {
  return field === "nom" ? { name: dir } : { createdAt: dir };
}

// Filtres de la vue `/admin/clients`. La recherche porte sur le nom du client
// **et** sur ses contacts (nom/email) : chercher "Julie" doit retrouver le
// club dont Julie est la responsable, pas seulement un client nommé Julie.
export function buildClientWhere(options: {
  search?: string;
  categoryId?: string;
  /** `true` = ne lister que les clients archivés (vue dédiée), `false` (par
   * défaut) = ne lister que les clients en activité. */
  archived?: boolean;
}): Prisma.ClientWhereInput {
  const search = options.search?.trim();
  const filters: Prisma.ClientWhereInput[] = [
    options.archived
      ? { isDemo: false, archivedAt: { not: null } }
      : ACTIVE_CLIENTS,
  ];

  if (search) {
    filters.push({
      OR: [
        { name: { contains: search, mode: "insensitive" } },
        { billingEmail: { contains: search, mode: "insensitive" } },
        { contacts: { some: { contact: { name: { contains: search, mode: "insensitive" } } } } },
        { contacts: { some: { contact: { email: { contains: search, mode: "insensitive" } } } } },
      ],
    });
  }

  if (options.categoryId) {
    // "aucune" est la valeur réservée pour filtrer les clients non catégorisés
    // — un `categoryId` vide en URL voudrait dire "pas de filtre".
    filters.push(
      options.categoryId === "aucune" ? { categoryId: null } : { categoryId: options.categoryId },
    );
  }

  return { AND: filters };
}
