import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, EnvelopeSimple } from "@phosphor-icons/react/dist/ssr";
import { verifyAdminSession } from "@/lib/dal";
import { db } from "@/lib/db";
import { ClientInfoForm } from "@/components/admin/client-info-form";
import { ClientAvatarForm } from "@/components/admin/client-avatar-form";
import { ClientArchiveButton } from "@/components/admin/client-archive-button";
import { ContactCard } from "@/components/admin/contact-card";
import { NewContactButton } from "@/components/admin/new-contact-button";
import { NewTaskButton } from "@/components/admin/new-task-button";
import { DeleteButton } from "@/components/admin/delete-button";
import { StepUpButton } from "@/components/admin/step-up-button";
import { ResetPasswordButton } from "@/components/admin/reset-password-button";
import { ImpersonateButton } from "@/components/admin/impersonate-button";
import { TaskTable } from "@/components/admin/task-table";
import { CollapsibleSection } from "@/components/admin/collapsible-section";
import { MonthlyRecapButton } from "@/components/admin/monthly-recap-button";
import { DocumentRow } from "@/components/admin/document-row";
import { FileGrid } from "@/components/file-grid";
import { deleteDocument } from "@/lib/actions/files";
import {
  updateClient,
  updateClientAvatar,
  deleteClient,
  createClientContact,
  updateClientContact,
  deleteClientUser,
} from "@/lib/actions/clients";
import { createTaskByAdmin } from "@/lib/actions/tasks";
import {
  CLIENT_CATEGORY_LIST_KEY,
  TASK_STATUS,
  TASK_STATUS_LIST_KEY,
  TASK_TYPE_LIST_KEY,
  TASK_FORMAT_LIST_KEY,
} from "@/lib/dropdown-lists";
import {
  buildTaskOrderBy,
  isTaskSortField,
  taskDateFormatter,
  type TaskSortField,
  type TaskSortDir,
} from "@/lib/tasks";
import { contactAccessState } from "@/lib/clients";

export const metadata: Metadata = {
  title: "Client — Admin Mikko Visuel",
};

export default async function ClientDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ clientId: string }>;
  searchParams: Promise<{ tri?: string; dir?: string; epingle?: string; prospectConversion?: string }>;
}) {
  await verifyAdminSession();
  const { clientId } = await params;
  const { tri, dir, epingle, prospectConversion } = await searchParams;
  const sortField: TaskSortField = isTaskSortField(tri) ? tri : "evenement";
  const sortDir: TaskSortDir = dir === "desc" ? "desc" : "asc";
  const pinnedOnly = epingle === "1";

  const [client, statusList, typeList, formatList, categoryList, assignableContacts] = await Promise.all([
    db.client.findUnique({
      where: { id: clientId },
      include: {
        contacts: { orderBy: { createdAt: "asc" }, include: { contact: true } },
        tasks: {
          where: {
            archivedAt: null,
            ...(pinnedOnly ? { pinnedAt: { not: null } } : {}),
          },
          include: {
            status: true,
            types: true,
            formats: true,
            // `timeEntries` et le client sont requis par `TaskTable`, qui est
            // désormais partagé avec /admin/taches (jauge de temps, colonne
            // Client) — sans eux la fiche client planterait au rendu.
            timeEntries: { select: { startedAt: true, endedAt: true } },
            client: { select: { name: true } },
            // Livrables finaux (jamais les BAT en attente) requis par la
            // nouvelle section dépliable "Livrables disponibles" — voir plus
            // bas. Chargés ici plutôt qu'en requête séparée : les tâches sont
            // déjà récupérées, filtrer côté JS évite un aller-retour DB en
            // plus.
            deliverables: { where: { kind: "final" }, orderBy: { uploadedAt: "desc" } },
            _count: { select: { deliverables: true, attachments: true } },
          },
          orderBy: buildTaskOrderBy(sortField, sortDir),
        },
        documents: {
          include: { type: true },
          orderBy: { uploadedAt: "desc" },
        },
      },
    }),
    db.dropdownList.findUnique({
      where: { key: TASK_STATUS_LIST_KEY },
      include: { items: { orderBy: { sortOrder: "asc" } } },
    }),
    db.dropdownList.findUnique({
      where: { key: TASK_TYPE_LIST_KEY },
      include: { items: { orderBy: { sortOrder: "asc" } } },
    }),
    db.dropdownList.findUnique({
      where: { key: TASK_FORMAT_LIST_KEY },
      include: { items: { orderBy: { sortOrder: "asc" } } },
    }),
    db.dropdownList.findUnique({
      where: { key: CLIENT_CATEGORY_LIST_KEY },
      include: { items: { orderBy: { sortOrder: "asc" } } },
    }),
    // Contacts affectables à ce client (mode "Affecter un contact existant"
    // de `ContactForm`, 2026-07-31) : ceux pas déjà rattachés — inutile de
    // proposer un contact déjà présent dans la liste juste au-dessus.
    db.contact.findMany({
      where: { clientLinks: { none: { clientId } } },
      orderBy: { name: "asc" },
    }),
  ]);

  if (!client) notFound();

  const statusOptions =
    statusList?.items.map((item) => ({ slug: item.slug, label: item.label })) ?? [];

  const categoryOptions =
    categoryList?.items.map((item) => ({ id: item.id, label: item.label })) ?? [];

  const archivedAtLabel = client.archivedAt
    ? taskDateFormatter.format(client.archivedAt)
    : null;

  const updateThisClient = updateClient.bind(null, client.id);
  const updateAvatarForThisClient = updateClientAvatar.bind(null, client.id);
  const createContactForThisClient = createClientContact.bind(null, client.id);
  const deleteThisClient = deleteClient.bind(null, client.id);
  const createTaskForThisClient = createTaskByAdmin.bind(null, client.id);

  // Tous les livrables finaux du client, toutes tâches confondues — pour la
  // section "Livrables disponibles" plus bas. Jamais les BAT (déjà filtrés
  // à la requête).
  const availableDeliverables = client.tasks.flatMap((task) =>
    task.deliverables.map((deliverable) => ({ ...deliverable, taskTitle: task.title })),
  );

  return (
    <div className="mx-auto max-w-7xl 2xl:max-w-[100rem] px-4 py-10 sm:px-6 lg:px-8">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <Link
          href="/admin/clients"
          className="inline-flex items-center gap-2 text-sm text-ink-muted transition-colors hover:text-ink"
        >
          <ArrowLeft size={16} weight="regular" />
          Retour aux clients
        </Link>
        {/* Lien vers la boîte mail Gmail intégrée, déplacé ici le 2026-07-31
            (demande explicite de retirer le bouton "Emails" du bandeau
            collant, à côté d'"Enregistrer") — sans ce lien, la page ne mène
            plus nulle part vers /emails, qui deviendrait inatteignable
            autrement que par une URL tapée à la main. */}
        <Link
          href={`/admin/clients/${client.id}/emails`}
          className="inline-flex items-center gap-1.5 text-sm text-ink-muted transition-colors hover:text-ink"
        >
          <EnvelopeSimple size={14} weight="regular" />
          Emails
        </Link>
      </div>

      <ClientInfoForm
        action={updateThisClient}
        clientId={client.id}
        clientName={client.name}
        hasAvatar={Boolean(client.avatarStorageKey)}
        archivedBanner={
          client.archivedAt ? (
            <p className="mt-4 flex flex-wrap items-center gap-2 rounded-xl border border-amber-500/30 bg-amber-500/10 px-4 py-3 text-sm text-ink">
              <strong className="font-medium">Client archivé</strong>
              <span className="text-ink-muted">
                depuis le {archivedAtLabel}
                {" — "}
                masqué des listes et des sélecteurs, mais toujours compté dans les Finances et les
                exports. Rien n&apos;a été supprimé.
              </span>
            </p>
          ) : null
        }
        prospectBanner={
          prospectConversion === "no-email" ? (
            <p className="mt-4 rounded-xl border border-line bg-surface-elevated px-4 py-3 text-sm text-ink-muted">
              Client créé depuis un prospect. Aucun compte de connexion créé (le prospect n&apos;avait
              pas d&apos;email) — ajoutez-en un ci-dessous.
            </p>
          ) : null
        }
        avatarForm={
          <ClientAvatarForm
            clientId={client.id}
            clientName={client.name}
            hasAvatar={Boolean(client.avatarStorageKey)}
            action={updateAvatarForThisClient}
          />
        }
        defaultValues={{
          name: client.name,
          raisonSociale: client.raisonSociale,
          notes: client.notes,
          address: client.address,
          siret: client.siret,
          vatNumber: client.vatNumber,
          billingEmail: client.billingEmail,
          driveUrl: client.driveUrl,
          categoryId: client.categoryId,
          requirePaymentForDeliverables: client.requirePaymentForDeliverables,
          requirePaymentBeforeWork: client.requirePaymentBeforeWork,
        }}
        categoryOptions={categoryOptions}
      />

      <section className="mt-12">
        {/* Bouton d'ajout en tête de section plutôt qu'un formulaire déplié
            sous la liste (demande du 2026-07-30) : la création est un geste
            occasionnel, la consultation est permanente. Texte de
            présentation retiré le 2026-07-31 (demande explicite) : après
            plusieurs mois d'usage, le rappel n'apportait plus rien. */}
        <div className="flex flex-wrap items-center gap-3">
          <h2 className="text-sm font-medium text-ink-muted">
            Contacts ({client.contacts.length})
          </h2>
          <NewContactButton action={createContactForThisClient} existingContacts={assignableContacts} />
        </div>

        {client.contacts.length > 0 ? (
          <div className="mt-4 divide-y divide-line rounded-2xl border border-line">
            {client.contacts.map((link) => (
              <ContactCard
                key={link.id}
                contact={{
                  id: link.id,
                  name: link.contact.name,
                  email: link.contact.email,
                  phone: link.contact.phone,
                  role: link.contact.role,
                  emailNotificationsEnabled: link.emailNotificationsEnabled,
                }}
                clientId={client.id}
                accessState={contactAccessState(link)}
                editAction={updateClientContact.bind(null, link.id, client.id)}
                impersonateButton={<ImpersonateButton clientUserId={link.id} />}
                resetPasswordButton={<ResetPasswordButton clientUserId={link.id} />}
                deleteButton={
                  <DeleteButton
                    action={deleteClientUser.bind(null, link.id, client.id)}
                    confirmMessage={`Retirer ${link.contact.name} de ce client ? (le contact reste rattaché à ses autres clients éventuels)`}
                  />
                }
              />
            ))}
          </div>
        ) : (
          <p className="mt-4 text-sm text-ink-muted">Aucun contact pour ce client.</p>
        )}
      </section>

      <section className="mt-12">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex flex-wrap items-center gap-3">
            <h2 className="text-sm font-medium text-ink-muted">Tâches ({client.tasks.length})</h2>
            <NewTaskButton
              action={createTaskForThisClient}
              typeOptions={typeList?.items ?? []}
              formatOptions={formatList?.items ?? []}
            />
          </div>
          <div className="flex flex-wrap items-center gap-4">
            <a
              href={`/api/exports/clients/${client.id}/rapport`}
              className="text-xs text-ink-muted transition-colors hover:text-ink"
            >
              Télécharger le rapport (PDF)
            </a>
            <MonthlyRecapButton clientId={client.id} />
            <Link
              href={
                pinnedOnly
                  ? `/admin/clients/${client.id}?${new URLSearchParams({ ...(tri ? { tri } : {}), ...(dir ? { dir } : {}) }).toString()}`
                  : `/admin/clients/${client.id}?${new URLSearchParams({ ...(tri ? { tri } : {}), ...(dir ? { dir } : {}), epingle: "1" }).toString()}`
              }
              className={`rounded-full border px-3 py-1.5 text-xs font-medium transition-colors ${
                pinnedOnly
                  ? "border-accent bg-accent/10 text-ink"
                  : "border-line text-ink-muted hover:text-ink"
              }`}
            >
              Épinglées uniquement
            </Link>
          </div>
        </div>

        {/* Même tableau que /admin/taches (demande du 2026-07-30) plutôt que
            les cartes empilées de `TaskRow` : mêmes colonnes, même tri, mêmes
            actions groupées. `basePath` garde les liens de tri sur la fiche.
            Les terminées sont repliées, comme sur la liste globale. */}
        {(() => {
          const activeTasks = client.tasks.filter(
            (task) => task.status.slug !== TASK_STATUS.TERMINE,
          );
          const doneTasks = client.tasks.filter(
            (task) => task.status.slug === TASK_STATUS.TERMINE,
          );
          return (
            <>
              <TaskTable
                tasks={activeTasks}
                statusOptions={statusOptions}
                sortField={sortField}
                sortDir={sortDir}
                basePath={`/admin/clients/${client.id}`}
                emptyMessage={
                  pinnedOnly ? "Aucune tâche épinglée." : "Aucune tâche en cours pour ce client."
                }
              />
              {doneTasks.length > 0 && (
                <div className="mt-10">
                  <CollapsibleSection title="Terminées" count={doneTasks.length}>
                    <TaskTable
                      tasks={doneTasks}
                      statusOptions={statusOptions}
                      sortField={sortField}
                      sortDir={sortDir}
                      basePath={`/admin/clients/${client.id}`}
                    />
                  </CollapsibleSection>
                </div>
              )}
            </>
          );
        })()}
      </section>

      {/* Nouvelle section le 2026-07-31 (demande explicite) : vue agrégée de
          tout ce que le client peut actuellement télécharger, tâche par
          tâche, sans avoir à ouvrir chacune. Repliée par défaut — c'est une
          consultation ponctuelle, pas une information qu'on veut voir à
          chaque visite de la fiche. */}
      <section className="mt-12">
        <CollapsibleSection title="Livrables disponibles" count={availableDeliverables.length}>
          {availableDeliverables.length === 0 ? (
            <p className="text-sm text-ink-muted">Aucun livrable final pour ce client.</p>
          ) : (
            <div className="flex flex-col gap-6">
              {client.tasks
                .filter((task) => task.deliverables.length > 0)
                .map((task) => (
                  <div key={task.id}>
                    <Link
                      href={`/admin/taches/${task.id}`}
                      className="text-sm font-medium text-ink transition-colors hover:text-accent"
                    >
                      {task.title}
                    </Link>
                    <div className="mt-2">
                      <FileGrid files={task.deliverables} downloadBasePath="/api/fichiers/livrables" />
                    </div>
                  </div>
                ))}
            </div>
          )}
        </CollapsibleSection>
      </section>

      <section className="mt-12">
        <h2 className="text-sm font-medium text-ink-muted">
          Factures / Devis / Contrats ({client.documents.length})
        </h2>

        {client.documents.length > 0 ? (
          <div className="mt-4 divide-y divide-line rounded-2xl border border-line">
            {client.documents.map((doc) => (
              <DocumentRow
                key={doc.id}
                document={doc}
                billingEmail={client.billingEmail}
                deleteAction={deleteDocument}
              />
            ))}
          </div>
        ) : (
          <p className="mt-1 text-sm text-ink-muted">
            Aucun document pour ce client. Ajoutez-en un depuis{" "}
            <Link href="/admin/documents" className="text-ink underline underline-offset-2">
              la page Documents
            </Link>
            .
          </p>
        )}
      </section>

      <section className="mt-12 flex flex-wrap items-center gap-4 border-t border-line pt-8">
        <ClientArchiveButton clientId={client.id} archived={Boolean(client.archivedAt)} />
        <StepUpButton
          action={deleteThisClient}
          label="Supprimer ce client"
          confirmMessage={`Confirmez votre mot de passe admin pour supprimer définitivement ${client.name} et toutes ses données (comptes, tâches, documents).`}
          submitLabel="Supprimer définitivement"
          danger
        />
      </section>
    </div>
  );
}
