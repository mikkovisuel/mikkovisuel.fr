import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, EnvelopeSimple } from "@phosphor-icons/react/dist/ssr";
import { verifyAdminSession } from "@/lib/dal";
import { db } from "@/lib/db";
import { ClientForm } from "@/components/admin/client-form";
import { ContactForm } from "@/components/admin/contact-form";
import { ContactEditForm } from "@/components/admin/contact-edit-form";
import { ContactAccessBadge } from "@/components/admin/contact-access-badge";
import { ContactAccessControls } from "@/components/admin/contact-access-controls";
import { ClientUserEmailToggle } from "@/components/admin/client-user-email-toggle";
import { DeleteButton } from "@/components/admin/delete-button";
import { StepUpButton } from "@/components/admin/step-up-button";
import { ResetPasswordButton } from "@/components/admin/reset-password-button";
import { ImpersonateButton } from "@/components/admin/impersonate-button";
import { TaskForm } from "@/components/task-form";
import { TaskRow } from "@/components/admin/task-row";
import { DocumentRow } from "@/components/admin/document-row";
import { deleteDocument } from "@/lib/actions/files";
import {
  updateClient,
  deleteClient,
  createClientContact,
  updateClientContact,
  deleteClientUser,
} from "@/lib/actions/clients";
import { createTaskByAdmin } from "@/lib/actions/tasks";
import {
  CLIENT_CATEGORY_LIST_KEY,
  TASK_STATUS_LIST_KEY,
  TASK_TYPE_LIST_KEY,
  TASK_FORMAT_LIST_KEY,
} from "@/lib/dropdown-lists";
import { buildTaskOrderBy, isTaskSortField, type TaskSortField, type TaskSortDir } from "@/lib/tasks";
import { TaskSortControl } from "@/components/admin/task-sort-control";
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

  const updateThisClient = updateClient.bind(null, client.id);
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

      <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
        <h1 className="font-display text-2xl font-medium tracking-tight text-ink">
          {client.name}
        </h1>
        <Link
          href={`/admin/clients/${client.id}/emails`}
          className="inline-flex items-center gap-2 rounded-full border border-line px-4 py-2 text-sm text-ink-muted transition-colors hover:border-accent hover:text-ink"
        >
          <EnvelopeSimple size={16} weight="regular" />
          Emails
        </Link>
      </div>

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
          <ClientForm
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
            submitLabel="Enregistrer"
          />
        </div>
      </section>

      <section className="mt-12">
        <h2 className="text-sm font-medium text-ink-muted">
          Contacts ({client.users.length})
        </h2>
        <p className="mt-1 text-sm text-ink-muted">
          Le carnet d&apos;adresses du client. Un contact n&apos;a pas d&apos;accès à
          l&apos;espace client par défaut — ouvrez-le au cas par cas. Plusieurs accès
          ouverts partagent le même espace, avec le même niveau de droits.
        </p>

        {client.users.length > 0 && (
          <div className="mt-4 divide-y divide-line rounded-2xl border border-line">
            {client.users.map((user) => {
              const accessState = contactAccessState(user);
              return (
                <div
                  key={user.id}
                  className="flex flex-wrap items-start justify-between gap-4 px-6 py-4"
                >
                  <div className="min-w-0">
                    <p className="flex flex-wrap items-center gap-2 font-medium text-ink">
                      {user.name}
                      {user.role && <span className="text-ink-muted">· {user.role}</span>}
                      <ContactAccessBadge state={accessState} />
                    </p>
                    <p className="break-all text-sm text-ink-muted">
                      {user.email ?? "Pas d'email"}
                      {user.phone && ` · ${user.phone}`}
                    </p>
                    <ContactEditForm
                      action={updateClientContact.bind(null, user.id, client.id)}
                      defaultValues={{
                        name: user.name,
                        email: user.email,
                        phone: user.phone,
                        role: user.role,
                      }}
                    />
                    <div className="mt-3">
                      <ContactAccessControls
                        clientUserId={user.id}
                        clientId={client.id}
                        state={accessState}
                        hasEmail={Boolean(user.email)}
                      />
                    </div>
                  </div>
                  <div className="flex flex-wrap items-center gap-3">
                    {/* Notifications, usurpation et réinitialisation n'ont de
                        sens que pour un contact qui a réellement un espace :
                        les masquer évite des boutons qui échouent. */}
                    {accessState !== "none" && (
                      <>
                        <ClientUserEmailToggle
                          clientUserId={user.id}
                          clientId={client.id}
                          enabled={user.emailNotificationsEnabled}
                        />
                        {accessState === "active" && <ImpersonateButton clientUserId={user.id} />}
                        <ResetPasswordButton clientUserId={user.id} />
                      </>
                    )}
                    <DeleteButton
                      action={deleteClientUser.bind(null, user.id, client.id)}
                      confirmMessage={`Supprimer le contact ${user.name} ?`}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        )}

        <div className="mt-6 rounded-2xl border border-line p-6">
          <ContactForm action={createContactForThisClient} />
        </div>
      </section>

      <section className="mt-12">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <h2 className="text-sm font-medium text-ink-muted">Tâches ({client.tasks.length})</h2>
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
            {client.tasks.length > 1 && (
              <TaskSortControl
                basePath={`/admin/clients/${client.id}`}
                sortField={sortField}
                sortDir={sortDir}
                extraParams={{ epingle: pinnedOnly ? "1" : undefined }}
              />
            )}
          </div>
        </div>

        {client.tasks.length > 0 ? (
          <div className="mt-4 divide-y divide-line rounded-2xl border border-line">
            {client.tasks.map((task) => (
              <TaskRow key={task.id} task={task} statusOptions={statusOptions} />
            ))}
          </div>
        ) : (
          pinnedOnly && <p className="mt-4 text-sm text-ink-muted">Aucune tâche épinglée.</p>
        )}

        <div className="mt-6 rounded-2xl border border-line p-6">
          <TaskForm
            action={createTaskForThisClient}
            typeOptions={typeList?.items ?? []}
            formatOptions={formatList?.items ?? []}
          />
        </div>
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

      <section className="mt-12 border-t border-line pt-8">
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
