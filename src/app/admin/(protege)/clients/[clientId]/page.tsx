import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, EnvelopeSimple } from "@phosphor-icons/react/dist/ssr";
import { verifyAdminSession } from "@/lib/dal";
import { db } from "@/lib/db";
import { ClientForm } from "@/components/admin/client-form";
import { ClientUserForm } from "@/components/admin/client-user-form";
import { ClientUserEditForm } from "@/components/admin/client-user-edit-form";
import { DeleteButton } from "@/components/admin/delete-button";
import { ResetPasswordButton } from "@/components/admin/reset-password-button";
import { ImpersonateButton } from "@/components/admin/impersonate-button";
import { TaskForm } from "@/components/task-form";
import { TaskRow } from "@/components/admin/task-row";
import { DocumentRow } from "@/components/admin/document-row";
import {
  updateClient,
  deleteClient,
  createClientUser,
  updateClientUser,
  deleteClientUser,
} from "@/lib/actions/clients";
import { createTaskByAdmin } from "@/lib/actions/tasks";
import { TASK_STATUS_LIST_KEY, TASK_TYPE_LIST_KEY, TASK_FORMAT_LIST_KEY } from "@/lib/dropdown-lists";
import { buildTaskOrderBy, isTaskSortField, type TaskSortField, type TaskSortDir } from "@/lib/tasks";
import { TaskSortControl } from "@/components/admin/task-sort-control";

export const metadata: Metadata = {
  title: "Client — Admin Mikko Visuel",
};

export default async function ClientDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ clientId: string }>;
  searchParams: Promise<{ tri?: string; dir?: string }>;
}) {
  await verifyAdminSession();
  const { clientId } = await params;
  const { tri, dir } = await searchParams;
  const sortField: TaskSortField = isTaskSortField(tri) ? tri : "evenement";
  const sortDir: TaskSortDir = dir === "desc" ? "desc" : "asc";

  const [client, statusList, typeList, formatList] = await Promise.all([
    db.client.findUnique({
      where: { id: clientId },
      include: {
        users: { orderBy: { createdAt: "asc" } },
        tasks: {
          where: { archivedAt: null },
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
  ]);

  if (!client) notFound();

  const statusOptions =
    statusList?.items.map((item) => ({ slug: item.slug, label: item.label })) ?? [];

  const updateThisClient = updateClient.bind(null, client.id);
  const createUserForThisClient = createClientUser.bind(null, client.id);
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
            }}
            submitLabel="Enregistrer"
          />
        </div>
      </section>

      <section className="mt-12">
        <h2 className="text-sm font-medium text-ink-muted">
          Comptes de connexion ({client.users.length})
        </h2>
        <p className="mt-1 text-sm text-ink-muted">
          Plusieurs comptes peuvent accéder au même espace client, avec le même niveau d&apos;accès.
        </p>

        {client.users.length > 0 && (
          <div className="mt-4 divide-y divide-line rounded-2xl border border-line">
            {client.users.map((user) => (
              <div key={user.id} className="flex flex-wrap items-start justify-between gap-4 px-6 py-4">
                <div className="min-w-0">
                  <p className="font-medium text-ink">
                    {user.name}
                    {user.role && <span className="text-ink-muted"> · {user.role}</span>}
                  </p>
                  <p className="text-sm text-ink-muted">
                    {user.email}
                    {user.phone && ` · ${user.phone}`}
                  </p>
                  <ClientUserEditForm
                    action={updateClientUser.bind(null, user.id, client.id)}
                    defaultValues={{ phone: user.phone, role: user.role }}
                  />
                </div>
                <div className="flex shrink-0 items-center gap-4">
                  <ImpersonateButton clientUserId={user.id} />
                  <ResetPasswordButton clientUserId={user.id} />
                  <DeleteButton
                    action={deleteClientUser.bind(null, user.id, client.id)}
                    confirmMessage={`Supprimer le compte ${user.email} ?`}
                  />
                </div>
              </div>
            ))}
          </div>
        )}

        <div className="mt-6 rounded-2xl border border-line p-6">
          <ClientUserForm action={createUserForThisClient} />
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
            {client.tasks.length > 1 && (
              <TaskSortControl
                basePath={`/admin/clients/${client.id}`}
                sortField={sortField}
                sortDir={sortDir}
              />
            )}
          </div>
        </div>

        {client.tasks.length > 0 && (
          <div className="mt-4 divide-y divide-line rounded-2xl border border-line">
            {client.tasks.map((task) => (
              <TaskRow key={task.id} task={task} statusOptions={statusOptions} />
            ))}
          </div>
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
              <DocumentRow key={doc.id} document={doc} billingEmail={client.billingEmail} />
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
        <DeleteButton
          action={deleteThisClient}
          confirmMessage={`Supprimer définitivement ${client.name} et toutes ses données (comptes, tâches, documents) ?`}
          label="Supprimer ce client"
        />
      </section>
    </div>
  );
}
