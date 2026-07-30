import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, EnvelopeSimple } from "@phosphor-icons/react/dist/ssr";
import { verifyAdminSession } from "@/lib/dal";
import { db } from "@/lib/db";
import { ClientForm } from "@/components/admin/client-form";
import { ClientAvatar } from "@/components/admin/client-avatar";
import { ClientAvatarForm } from "@/components/admin/client-avatar-form";
import { FormSubmitButton } from "@/components/admin/form-submit-button";
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
import { DocumentRow } from "@/components/admin/document-row";
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

// Rattache le bouton "Enregistrer" du bandeau au formulaire d'informations,
// rendu plus bas dans la page (attribut HTML `form`, voir FormSubmitButton).
const CLIENT_FORM_ID = "client-info-form";

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

  const [client, statusList, typeList, formatList, categoryList] = await Promise.all([
    db.client.findUnique({
      where: { id: clientId },
      include: {
        users: { orderBy: { createdAt: "asc" } },
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

  return (
    <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
      <Link
        href="/admin/clients"
        className="inline-flex items-center gap-2 text-sm text-ink-muted transition-colors hover:text-ink"
      >
        <ArrowLeft size={16} weight="regular" />
        Retour aux clients
      </Link>

      {/* Bandeau collant : "Enregistrer" reste accessible en haut à droite
          quelle que soit la position dans la page (demande du 2026-07-30).
          Le bouton est rattaché au formulaire d'informations par son `form`,
          bien qu'il soit rendu hors de lui — voir FormSubmitButton. */}
      <div className="sticky top-0 z-10 -mx-4 mt-4 flex flex-wrap items-center justify-between gap-3 bg-surface/95 px-4 py-3 backdrop-blur sm:-mx-6 sm:px-6 lg:-mx-8 lg:px-8">
        <div className="flex min-w-0 items-center gap-3">
          <ClientAvatar
            clientId={client.id}
            name={client.name}
            hasAvatar={Boolean(client.avatarStorageKey)}
            size="md"
          />
          <h1 className="font-display text-2xl font-medium tracking-tight text-ink">
            {client.name}
          </h1>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <Link
            href={`/admin/clients/${client.id}/emails`}
            className="inline-flex items-center gap-2 rounded-full border border-line px-4 py-2 text-sm text-ink-muted transition-colors hover:border-accent hover:text-ink"
          >
            <EnvelopeSimple size={16} weight="regular" />
            Emails
          </Link>
          <FormSubmitButton formId={CLIENT_FORM_ID} label="Enregistrer" />
        </div>
      </div>

      {client.archivedAt && (
        <p className="mt-4 flex flex-wrap items-center gap-2 rounded-xl border border-amber-500/30 bg-amber-500/10 px-4 py-3 text-sm text-ink">
          <strong className="font-medium">Client archivé</strong>
          <span className="text-ink-muted">
            depuis le {archivedAtLabel}
            {" — "}
            masqué des listes et des sélecteurs, mais toujours compté dans les Finances et les
            exports. Rien n&apos;a été supprimé.
          </span>
        </p>
      )}

      {prospectConversion && prospectConversion !== "ok" && (
        <p className="mt-4 rounded-xl border border-line bg-surface-elevated px-4 py-3 text-sm text-ink-muted">
          Client créé depuis un prospect.{" "}
          {prospectConversion === "no-email"
            ? "Aucun compte de connexion créé (le prospect n'avait pas d'email) — ajoutez-en un ci-dessous."
            : "Aucun nouveau compte créé : un compte existait déjà avec cet email."}
        </p>
      )}

      <section className="mt-8">
        <h2 className="text-sm font-medium text-ink-muted">Informations</h2>
        <div className="mt-4">
          <ClientAvatarForm
            clientId={client.id}
            clientName={client.name}
            hasAvatar={Boolean(client.avatarStorageKey)}
            action={updateAvatarForThisClient}
          />
        </div>
        <div className="mt-8">
          {/* Deux colonnes sur grand écran : identité à gauche, facturation et
              échanges de documents à droite. Le bouton d'enregistrement est
              dans le bandeau ci-dessus, d'où l'absence de `submitLabel`. */}
          <ClientForm
            formId={CLIENT_FORM_ID}
            action={updateThisClient}
            defaultValues={{
              name: client.name,
              notes: client.notes,
              address: client.address,
              siret: client.siret,
              vatNumber: client.vatNumber,
              billingEmail: client.billingEmail,
              driveUrl: client.driveUrl,
              categoryId: client.categoryId,
            }}
            categoryOptions={categoryOptions}
          />
        </div>
      </section>

      <section className="mt-12">
        {/* Bouton d'ajout en tête de section plutôt qu'un formulaire déplié
            sous la liste (demande du 2026-07-30) : la création est un geste
            occasionnel, la consultation est permanente. */}
        <div className="flex flex-wrap items-center gap-3">
          <h2 className="text-sm font-medium text-ink-muted">
            Contacts ({client.users.length})
          </h2>
          <NewContactButton action={createContactForThisClient} />
        </div>
        <p className="mt-2 max-w-2xl text-sm text-ink-muted">
          Le carnet d&apos;adresses du client. Un contact n&apos;a pas d&apos;accès à
          l&apos;espace client par défaut — ouvrez-le au cas par cas.
        </p>

        {client.users.length > 0 ? (
          <div className="mt-4 divide-y divide-line rounded-2xl border border-line">
            {client.users.map((user) => (
              <ContactCard
                key={user.id}
                contact={user}
                clientId={client.id}
                accessState={contactAccessState(user)}
                editAction={updateClientContact.bind(null, user.id, client.id)}
                impersonateButton={<ImpersonateButton clientUserId={user.id} />}
                resetPasswordButton={<ResetPasswordButton clientUserId={user.id} />}
                deleteButton={
                  <DeleteButton
                    action={deleteClientUser.bind(null, user.id, client.id)}
                    confirmMessage={`Supprimer le contact ${user.name} ?`}
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

      <section className="mt-12">
        <h2 className="text-sm font-medium text-ink-muted">
          Documents ({client.documents.length})
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
