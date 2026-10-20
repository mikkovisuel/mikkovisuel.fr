import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import {
  ArrowLeft,
  DotsThreeVertical,
  EnvelopeSimple,
  GoogleDriveLogo,
  IdentificationCard,
  MapPin,
} from "@phosphor-icons/react/dist/ssr";
import { verifyAdminSession } from "@/lib/dal";
import { db } from "@/lib/db";
import { ClientAvatar } from "@/components/admin/client-avatar";
import { ClientBlockEditButton, ModalTrigger } from "@/components/admin/client-block-editor";
import { NewDocumentButton } from "@/components/admin/new-document-button";
import { formatAmount } from "@/lib/documents";
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
import { DocumentDriveTable } from "@/components/admin/document-drive-table";
import { PaymentRecordRow } from "@/components/admin/payment-record-row";
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
  isTaskOverdue,
  isTaskSortField,
  taskDateFormatter,
  type TaskSortField,
  type TaskSortDir,
} from "@/lib/tasks";
import { contactAccessState, EXCLUDE_DEMO_CLIENT } from "@/lib/clients";
import {
  DOCUMENT_TYPE,
  DOCUMENT_TYPE_LIST_KEY,
  PALETTE_BADGE_CLASSES,
  type PaletteColor,
} from "@/lib/dropdown-lists";
import { getMyPreferences } from "@/lib/admin-preferences-server";
import { visibleColumns } from "@/lib/admin-preferences";
import { getAppSettings } from "@/lib/settings";
import {
  DEFAULT_DOCUMENT_SENT_SUBJECT,
  DEFAULT_DOCUMENT_SENT_BODY,
} from "@/lib/invoice-email-templates";

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

  const [client, statusList, typeList, formatList, categoryList, assignableContacts, companyDocuments, settings, editClients, documentTypeList] =
    await Promise.all([
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
            assignedAdmin: { select: { email: true } },
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
        // Paiements sans facture de ce client (2026-09-07, "il faudrait
        // également voir les paiements sans facture de visible") — jusqu'ici
        // uniquement consultables globalement dans la section Finances de
        // /admin/administratif, pas sur la fiche d'un client précis.
        paymentRecords: { orderBy: { date: "desc" } },
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
    // Documents Commercial/Société (ex. RIB) proposables en pièce jointe à
    // l'envoi d'une facture — voir `SendDocumentDialog`, même liste que sur
    // /admin/administratif.
    db.companyDocument.findMany({ orderBy: { uploadedAt: "desc" } }),
    getAppSettings(),
    // Formulaires « Modifier » des documents et paiements (2026-10-20) : on
    // peut y rattacher l'élément à un autre client, archivé compris.
    db.client.findMany({ where: EXCLUDE_DEMO_CLIENT, orderBy: { name: "asc" }, select: { id: true, name: true } }),
    db.dropdownList.findUnique({
      where: { key: DOCUMENT_TYPE_LIST_KEY },
      include: { items: { orderBy: { sortOrder: "asc" } } },
    }),
  ]);

  if (!client) notFound();

  // Colonnes de la liste des tâches choisies dans « Mon affichage ».
  const taskColumns = visibleColumns(await getMyPreferences(), "taches");

  const editOptions = {
    clients: editClients,
    types: documentTypeList?.items.map((item) => ({ id: item.id, label: item.label })) ?? [],
  };

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

  // Chiffres clés de l'en-tête (refonte « Google Contacts », 2026-10-20) :
  // calculés sur toutes les tâches actives, même quand la liste n'affiche que
  // les épinglées.
  const year = new Date().getFullYear();
  const activeTaskStates = await db.task.findMany({
    where: { clientId: client.id, archivedAt: null },
    select: { dueDate: true, status: { select: { slug: true } } },
  });
  const openTaskCount = activeTaskStates.filter((task) => task.status.slug !== TASK_STATUS.TERMINE).length;
  const overdueTaskCount = activeTaskStates.filter((task) => isTaskOverdue(task)).length;
  const unpaidDocuments = client.documents.filter(
    (doc) => doc.paymentStatus === "unpaid" && doc.amountCents !== null,
  );
  const toCollectCents =
    unpaidDocuments.reduce((sum, doc) => sum + (doc.amountCents ?? 0), 0) +
    client.paymentRecords
      .filter((record) => record.paymentStatus !== "paid")
      .reduce((sum, record) => sum + record.amountCents, 0);
  // Même règle que les Finances : les factures (pas les devis), rattachées à
  // leur mois convenu quand elles sont mensuelles, plus les paiements sans
  // facture.
  const billedThisYearCents =
    client.documents
      .filter(
        (doc) =>
          doc.type.slug === DOCUMENT_TYPE.FACTURE &&
          (doc.isMonthlyInvoice && doc.invoiceYear ? doc.invoiceYear : doc.uploadedAt.getFullYear()) === year,
      )
      .reduce((sum, doc) => sum + (doc.amountCents ?? 0), 0) +
    client.paymentRecords
      .filter((record) => record.date.getFullYear() === year)
      .reduce((sum, record) => sum + record.amountCents, 0);
  const category = categoryList?.items.find((item) => item.id === client.categoryId) ?? null;
  // « Voir son espace client » : le premier contact dont l'espace est actif.
  const portalContact = client.contacts.find((link) => contactAccessState(link) === "active");
  const clientValues = {
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
  };
  const editProps = { values: clientValues, categoryOptions, action: updateThisClient };
  // Sur la fiche, la colonne « Client » des tâches ne dirait rien de plus.
  const clientTaskColumns = taskColumns.filter((column) => column !== "client");
  const money = (cents: number) => formatAmount(cents, "EUR");
  const CARD = "rounded-xl border border-line bg-surface";
  const PILL =
    "inline-flex h-9 items-center gap-2 rounded-full border border-[var(--color-outline)] px-4 text-sm font-medium text-ink transition-colors hover:bg-ink/[0.04]";

  // Fiche client façon Google Contacts (maquette A validée le 2026-10-20) :
  // en-tête avec avatar et actions, coordonnées en lecture à gauche
  // (modification par bloc), chiffres clés, tâches et documents à droite.
  // Toutes les fonctions de l'ancienne fiche restent.
  return (
    <div className="px-4 pb-10 sm:px-6 lg:px-8 2xl:px-12">
      <div className="pt-3">
        <Link
          href="/admin/clients"
          className="inline-flex items-center gap-2 rounded-full py-1 pr-3 text-sm text-ink-muted transition-colors hover:text-ink"
        >
          <ArrowLeft size={18} />
          Clients
        </Link>
      </div>

      <header className="flex items-center gap-4 pb-5 pt-2 sm:gap-5">
        <ModalTrigger
          title="Logo du client"
          label="Changer le logo du client"
          className="w-fit shrink-0 rounded-full transition-opacity hover:opacity-80"
          content={
            <ClientAvatarForm
              clientId={client.id}
              clientName={client.name}
              hasAvatar={Boolean(client.avatarStorageKey)}
              action={updateAvatarForThisClient}
            />
          }
        >
          <ClientAvatar clientId={client.id} name={client.name} hasAvatar={Boolean(client.avatarStorageKey)} size="xl" />
        </ModalTrigger>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-1">
            <h1 className="text-2xl font-normal leading-tight text-ink sm:truncate sm:text-[32px]">{client.name}</h1>
            <ClientBlockEditButton block="identite" {...editProps} />
          </div>
          <p className="mt-1 text-sm text-ink-muted">
            {[client.raisonSociale, `client depuis ${MONTH_YEAR.format(client.createdAt)}`].filter(Boolean).join(" · ")}
          </p>
          <div className="mt-2 flex flex-wrap gap-2">
            {category && (
              <span
                className={`inline-flex h-6 items-center rounded-full border px-2.5 text-xs font-medium ${
                  PALETTE_BADGE_CLASSES[category.color as PaletteColor] ?? ""
                }`}
              >
                {category.label}
              </span>
            )}
            {unpaidDocuments.length > 0 && (
              <span className="inline-flex h-6 items-center rounded-full bg-red-500/10 px-2.5 text-xs font-medium text-danger">
                {unpaidDocuments.length} document{unpaidDocuments.length > 1 ? "s" : ""} en attente de paiement
              </span>
            )}
            {client.archivedAt && (
              <span className="inline-flex h-6 items-center rounded-full bg-amber-500/15 px-2.5 text-xs font-medium text-ink">
                Archivé le {archivedAtLabel}
              </span>
            )}
          </div>
        </div>
      </header>

      <div className="flex flex-wrap items-center gap-2 border-b border-line pb-5">
        <NewTaskButton
          action={createTaskForThisClient}
          typeOptions={typeList?.items ?? []}
          formatOptions={formatList?.items ?? []}
          label="Nouvelle tâche"
          primary
        />
        {/* Boîte mail Gmail intégrée (2026-07-31). */}
        <Link href={`/admin/clients/${client.id}/emails`} className={PILL}>
          <EnvelopeSimple size={16} />
          E-mails
        </Link>
        <NewDocumentButton clients={[{ id: client.id, name: client.name }]} types={editOptions.types} />
        {client.driveUrl && (
          <a href={client.driveUrl} target="_blank" rel="noopener noreferrer" className={PILL}>
            <GoogleDriveLogo size={16} />
            Drive
          </a>
        )}
        {portalContact && (
          <span title={`Ouvrir l'espace client comme ${portalContact.contact.name}`}>
            <ImpersonateButton clientUserId={portalContact.id} pill />
          </span>
        )}
        {/* Gestes rares et sensibles rangés derrière « ⋮ », comme dans
            Google Contacts. */}
        <details className="relative ml-auto">
          <summary
            aria-label="Plus d'actions"
            className="flex h-9 w-9 cursor-pointer list-none items-center justify-center rounded-full border border-[var(--color-outline)] text-ink-muted hover:bg-ink/[0.04] [&::-webkit-details-marker]:hidden"
          >
            <DotsThreeVertical size={18} weight="bold" />
          </summary>
          <div className="absolute right-0 z-30 mt-2 flex w-64 flex-col items-start gap-3 rounded-xl bg-surface p-4 shadow-lg">
            <a
              href={`/api/exports/clients/${client.id}/rapport`}
              className="text-sm text-ink transition-colors hover:underline"
            >
              Télécharger le rapport (PDF)
            </a>
            <ClientArchiveButton clientId={client.id} archived={Boolean(client.archivedAt)} />
            <StepUpButton
              action={deleteThisClient}
              label="Supprimer ce client"
              confirmMessage={`Confirmez votre mot de passe admin pour supprimer définitivement ${client.name} et toutes ses données (comptes, tâches, documents).`}
              submitLabel="Supprimer définitivement"
              danger
            />
          </div>
        </details>
      </div>

      {client.archivedAt && (
        <p className="mt-4 rounded-xl border border-amber-500/30 bg-amber-500/10 px-4 py-3 text-sm text-ink-muted">
          Masqué des listes et des sélecteurs, mais toujours compté dans les Finances et les exports. Rien n&apos;a été
          supprimé.
        </p>
      )}
      {prospectConversion === "no-email" && (
        <p className="mt-4 rounded-xl border border-line bg-surface-elevated px-4 py-3 text-sm text-ink-muted">
          Client créé depuis un prospect. Aucun compte de connexion créé (le prospect n&apos;avait pas d&apos;email) —
          ajoutez un contact ci-dessous.
        </p>
      )}

      {/* Deux colonnes à partir de 1 400 px seulement : en dessous, la colonne
          de droite n'a pas la place du tableau des tâches (signalé le
          2026-10-20) ; les blocs de la fiche passent alors en tête, sur deux
          colonnes, et l'activité prend toute la largeur. */}
      <div className="mt-6 grid gap-6 min-[1400px]:grid-cols-[minmax(0,22rem)_minmax(0,1fr)] 2xl:grid-cols-[minmax(0,26rem)_minmax(0,1fr)]">
        {/* Colonne de gauche : la fiche en lecture. `grid-cols-1` (une piste
            `minmax(0, 1fr)`) : sans elle, la piste unique prenait la largeur
            du contenu le plus large et débordait sous la colonne de droite
            (signalé le 2026-10-20 sur une vraie fiche). */}
        <div className="grid min-w-0 grid-cols-1 content-start gap-4 md:max-[1399px]:grid-cols-2">
          <section className={`${CARD} px-5 py-4`}>
            <div className="flex items-center justify-between">
              <h2 className="text-base font-medium text-ink">Coordonnées</h2>
              <ClientBlockEditButton block="coordonnees" {...editProps} />
            </div>
            <dl className="mt-1 grid gap-3 text-sm">
              <InfoLine icon={<MapPin size={18} />} value={client.address} empty="Ajouter l'adresse" />
              <InfoLine
                icon={<EnvelopeSimple size={18} />}
                value={client.billingEmail}
                hint="E-mail de facturation"
                empty="Ajouter l'e-mail de facturation"
              />
              <InfoLine
                icon={<IdentificationCard size={18} />}
                value={[client.siret && `SIRET ${client.siret}`, client.vatNumber && `TVA ${client.vatNumber}`]
                  .filter(Boolean)
                  .join(" · ")}
                empty="Ajouter le SIRET et la TVA"
              />
              <InfoLine
                icon={<GoogleDriveLogo size={18} />}
                value={client.driveUrl ? "Dossier Drive" : null}
                href={client.driveUrl ?? undefined}
                empty="Ajouter le lien Drive"
              />
            </dl>
          </section>

          <section className={CARD}>
            <div className="flex flex-wrap items-center justify-between gap-2 px-5 py-4">
              <h2 className="text-base font-medium text-ink">Contacts ({client.contacts.length})</h2>
              <NewContactButton action={createContactForThisClient} existingContacts={assignableContacts} />
            </div>
            {client.contacts.length > 0 ? (
              <div className="divide-y divide-line border-t border-line">
            {client.contacts.map((link) => (
              <ContactCard
                stacked
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
              <p className="px-5 pb-4 text-sm text-ink-muted">Aucun contact pour ce client.</p>
            )}
          </section>

          <section className={`${CARD} px-5 py-4`}>
            <div className="flex items-center justify-between">
              <h2 className="text-base font-medium text-ink">Règles de paiement</h2>
              <ClientBlockEditButton block="paiement" {...editProps} />
            </div>
            <ul className="mt-1 grid gap-2 text-sm">
              {[
                { on: client.requirePaymentBeforeWork, label: "Paiement avant de commencer le travail" },
                { on: client.requirePaymentForDeliverables, label: "Paiement avant les livrables finaux" },
              ].map((rule) => (
                <li key={rule.label} className="flex items-center gap-3">
                  <span className={`h-2.5 w-2.5 shrink-0 rounded-full ${rule.on ? "bg-emerald-600" : "bg-slate-300"}`} />
                  <span className="flex-1 text-ink">{rule.label}</span>
                  <span className="text-xs text-ink-muted">{rule.on ? "Activé" : "Désactivé"}</span>
                </li>
              ))}
            </ul>
          </section>

          <section className="rounded-xl border border-amber-400/40 bg-amber-300/10 px-5 py-4">
            <div className="flex items-center justify-between">
              <h2 className="text-base font-medium text-ink">Notes internes</h2>
              <ClientBlockEditButton block="notes" {...editProps} />
            </div>
            {client.notes ? (
              <p className="mt-1 whitespace-pre-line text-sm text-ink">{client.notes}</p>
            ) : (
              <p className="mt-1 text-sm text-ink-muted">Aucune note — jamais visible du client.</p>
            )}
          </section>
        </div>

        {/* Colonne de droite : l'activité. */}
        <div className="grid min-w-0 grid-cols-1 content-start gap-5">
          <div className="grid grid-cols-2 gap-3 2xl:grid-cols-4">
            {[
              { label: "Tâches en cours", value: String(openTaskCount) },
              { label: "En retard", value: String(overdueTaskCount), alert: overdueTaskCount > 0 },
              { label: "À encaisser", value: money(toCollectCents), alert: toCollectCents > 0 },
              { label: `Facturé en ${year}`, value: money(billedThisYearCents) },
            ].map((kpi) => (
              <div key={kpi.label} className="rounded-xl bg-surface-elevated px-4 py-3">
                <p className="text-sm text-ink-muted">{kpi.label}</p>
                <p className={`mt-1 text-2xl font-normal tabular-nums ${kpi.alert ? "text-danger" : "text-ink"}`}>
                  {kpi.value}
                </p>
              </div>
            ))}
          </div>

          <section className={`${CARD} overflow-hidden`}>
            <div className="flex flex-wrap items-center gap-3 border-b border-line px-4 py-3">
              <h2 className="flex-1 text-base font-medium text-ink">
                Tâches <span className="font-normal text-ink-muted">({client.tasks.length})</span>
              </h2>
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
            {(() => {
              const activeTasks = client.tasks.filter((task) => task.status.slug !== TASK_STATUS.TERMINE);
              const doneTasks = client.tasks.filter((task) => task.status.slug === TASK_STATUS.TERMINE);
              return (
                <>
                  <TaskTable
                    inCard
                    tasks={activeTasks}
                    statusOptions={statusOptions}
                    sortField={sortField}
                    sortDir={sortDir}
                    basePath={`/admin/clients/${client.id}`}
                    columns={clientTaskColumns}
                    emptyMessage={pinnedOnly ? "Aucune tâche épinglée." : "Aucune tâche en cours pour ce client."}
                  />
                  {doneTasks.length > 0 && (
                    <div className="border-t border-line px-4 py-3">
                      <CollapsibleSection title="Terminées" count={doneTasks.length}>
                        <TaskTable
                          inCard
                          tasks={doneTasks}
                          statusOptions={statusOptions}
                          sortField={sortField}
                          sortDir={sortDir}
                          basePath={`/admin/clients/${client.id}`}
                          columns={clientTaskColumns}
                        />
                      </CollapsibleSection>
                    </div>
                  )}
                </>
              );
            })()}
          </section>

          <section className={`${CARD} overflow-hidden`}>
            <div className="flex items-center gap-3 border-b border-line px-4 py-3">
              <h2 className="flex-1 text-base font-medium text-ink">
                Factures, devis, contrats <span className="font-normal text-ink-muted">({client.documents.length})</span>
              </h2>
              <Link href={`/admin/administratif?clientId=${client.id}&vue=detaille`} className="text-sm text-ink-muted hover:text-ink">
                Tout voir dans Administratif →
              </Link>
            </div>
            {client.documents.length > 0 ? (
              <DocumentDriveTable
                inCard
                showClient={false}
                documents={client.documents.map((doc) => ({
                  ...doc,
                  client: { name: client.name, billingEmail: client.billingEmail },
                }))}
                deleteAction={deleteDocument}
                editOptions={editOptions}
                companyDocuments={companyDocuments.map((d) => ({ id: d.id, fileName: d.fileName }))}
                emailSubjectTemplate={settings.documentSentEmailSubject ?? DEFAULT_DOCUMENT_SENT_SUBJECT}
                emailBodyTemplate={settings.documentSentEmailBody ?? DEFAULT_DOCUMENT_SENT_BODY}
              />
            ) : (
              <p className="px-4 py-3 text-sm text-ink-muted">Aucun document — « Ajouter un document » en haut de la fiche.</p>
            )}
          </section>

          {/* Paiements sans facture (2026-09-07). */}
          {client.paymentRecords.length > 0 && (
            <section className={`${CARD} overflow-hidden`}>
              <h2 className="border-b border-line px-4 py-3 text-base font-medium text-ink">
                Paiements sans facture <span className="font-normal text-ink-muted">({client.paymentRecords.length})</span>
              </h2>
              <div className="divide-y divide-line">
            {client.paymentRecords.map((record) => (
              <PaymentRecordRow
                key={record.id}
                inCard
                editClients={editClients}
                record={{
                  id: record.id,
                  clientId: record.clientId,
                  clientName: client.name,
                  label: record.label,
                  amountCents: record.amountCents,
                  currency: record.currency,
                  paymentStatus: record.paymentStatus,
                  date: record.date.toISOString().slice(0, 10),
                }}
              />
            ))}
              </div>
            </section>
          )}

          {/* Livrables disponibles (2026-07-31), repliés : une consultation
              ponctuelle. */}
          <section className={`${CARD} px-4 py-3`}>
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
        </div>
      </div>
    </div>
  );
}

const MONTH_YEAR = new Intl.DateTimeFormat("fr-FR", { month: "long", year: "numeric" });

/** Ligne de coordonnées, façon Google Contacts : icône, valeur, précision. */
function InfoLine({
  icon,
  value,
  hint,
  href,
  empty,
}: {
  icon: React.ReactNode;
  value: string | null | undefined;
  hint?: string;
  href?: string;
  empty: string;
}) {
  return (
    <div className="flex items-start gap-4">
      <dt className="mt-0.5 shrink-0 text-ink-muted">{icon}</dt>
      <dd className="min-w-0">
        {value ? (
          href ? (
            <a href={href} target="_blank" rel="noopener noreferrer" className="break-words text-ink hover:underline">
              {value}
            </a>
          ) : (
            <span className="whitespace-pre-line break-words text-ink">{value}</span>
          )
        ) : (
          <span className="text-ink-muted">{empty}</span>
        )}
        {value && hint && <span className="block text-xs text-ink-muted">{hint}</span>}
      </dd>
    </div>
  );
}
