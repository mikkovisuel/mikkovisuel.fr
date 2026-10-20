"use client";

import { useActionState, useEffect, useState } from "react";
import { PencilSimple, Warning, WarningCircle } from "@phosphor-icons/react/dist/ssr";
import { Modal } from "@/components/admin/modal";
import { FilePicker } from "@/components/file-picker";
import { useFormSubmit } from "@/lib/use-form-submit";
import {
  updateCompanyDocument,
  updateDocument,
  updatePaymentRecord,
  type EditState,
} from "@/lib/actions/administratif-edit";
import { COMPANY_DOCUMENT_CATEGORY_LABELS } from "@/lib/dropdown-lists";

// Bouton « Modifier » des lignes de la page Administratif (demande du
// 2026-10-20 : corriger une erreur de saisie). Une fenêtre par type
// d'élément, préremplie avec les valeurs actuelles. Pour un document engagé
// (devis signé, facture payée en ligne), le serveur renvoie d'abord un
// avertissement ; l'enregistrement n'a lieu qu'après « Enregistrer quand
// même » (voir `src/lib/actions/administratif-edit.ts`).

const FIELD =
  "rounded-xl border border-line bg-surface-elevated px-3 py-2.5 text-sm text-ink focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/30";
const LABEL = "text-sm font-medium text-ink";
const ICON_BUTTON =
  "flex h-8 w-8 items-center justify-center rounded-full border border-line text-ink-muted transition-colors hover:border-accent hover:bg-accent hover:text-accent-ink";

const CURRENT_YEAR = new Date().getFullYear();
const MONTH_NAMES = [
  "Janvier", "Février", "Mars", "Avril", "Mai", "Juin",
  "Juillet", "Août", "Septembre", "Octobre", "Novembre", "Décembre",
];

const centsToInput = (cents: number | null) => (cents === null ? "" : (cents / 100).toFixed(2).replace(".", ","));

/** Fenêtre et formulaire communs : état du serveur, fermeture après succès,
 * avertissement à confirmer. */
function EditDialog({
  title,
  label,
  action,
  children,
}: {
  title: string;
  label: string;
  action: (prev: EditState, formData: FormData) => Promise<EditState>;
  children: React.ReactNode;
}) {
  const [open, setOpen] = useState(false);
  // Remonter le formulaire à chaque ouverture : il repart des valeurs
  // enregistrées et oublie l'erreur ou l'avertissement précédents.
  const [session, setSession] = useState(0);

  return (
    <>
      <button
        type="button"
        onClick={() => {
          setSession((value) => value + 1);
          setOpen(true);
        }}
        title={label}
        aria-label={label}
        className={ICON_BUTTON}
      >
        <PencilSimple size={16} weight="regular" />
      </button>
      <Modal open={open} onClose={() => setOpen(false)} title={title}>
        {open && (
          <EditForm key={session} action={action} onDone={() => setOpen(false)}>
            {children}
          </EditForm>
        )}
      </Modal>
    </>
  );
}

function EditForm({
  action,
  onDone,
  children,
}: {
  action: (prev: EditState, formData: FormData) => Promise<EditState>;
  onDone: () => void;
  children: React.ReactNode;
}) {
  const [state, formAction, pending] = useActionState(action, undefined);
  const { onSubmit } = useFormSubmit(formAction, { pending, state });

  useEffect(() => {
    if (state?.done) onDone();
  }, [state, onDone]);

  return (
    <form action={formAction} onSubmit={onSubmit} className="grid gap-4 sm:grid-cols-2">
      {children}

      {state?.error && (
        <p role="alert" className="flex items-center gap-2 text-sm text-danger sm:col-span-2">
          <WarningCircle size={16} weight="fill" className="shrink-0" />
          {state.error}
        </p>
      )}

      {state?.warning && (
        <div role="alert" className="flex gap-3 rounded-xl border border-amber-500/40 bg-amber-500/10 p-3 text-sm text-ink sm:col-span-2">
          <Warning size={18} weight="fill" className="mt-0.5 shrink-0 text-amber-600" />
          <p>{state.warning}</p>
        </div>
      )}

      <div className="flex flex-wrap items-center gap-3 sm:col-span-2">
        {state?.warning ? (
          <button
            type="submit"
            name="confirmEngaged"
            value="1"
            disabled={pending}
            className="inline-flex items-center rounded-full bg-accent px-6 py-3 text-sm font-medium text-accent-ink disabled:opacity-60"
          >
            {pending ? "Enregistrement…" : "Enregistrer quand même"}
          </button>
        ) : (
          <button
            type="submit"
            disabled={pending}
            className="inline-flex items-center rounded-full bg-accent px-6 py-3 text-sm font-medium text-accent-ink disabled:opacity-60"
          >
            {pending ? "Enregistrement…" : "Enregistrer"}
          </button>
        )}
        <button
          type="button"
          onClick={onDone}
          className="rounded-full px-4 py-3 text-sm text-ink-muted transition-colors hover:text-ink"
        >
          Annuler
        </button>
      </div>
    </form>
  );
}

function ClientSelect({ clients, value }: { clients: { id: string; name: string }[]; value: string }) {
  return (
    <div className="flex flex-col gap-2">
      <label htmlFor="edit-clientId" className={LABEL}>
        Client
      </label>
      <select id="edit-clientId" name="clientId" required defaultValue={value} className={FIELD}>
        {/* Un client archivé reste proposé s'il est celui du document. */}
        {clients.map((client) => (
          <option key={client.id} value={client.id}>
            {client.name}
          </option>
        ))}
      </select>
    </div>
  );
}

function FileNameField({ value }: { value: string }) {
  return (
    <div className="flex flex-col gap-2 sm:col-span-2">
      <label htmlFor="edit-fileName" className={LABEL}>
        Nom du fichier
      </label>
      <input id="edit-fileName" name="fileName" required maxLength={200} defaultValue={value} className={FIELD} />
    </div>
  );
}

function ReplaceFileField({ accept, helper }: { accept: string; helper: string }) {
  return (
    <div className="flex flex-col gap-2 sm:col-span-2">
      <span className={LABEL}>Remplacer le fichier (facultatif)</span>
      <FilePicker name="file" accept={accept} dropzone helperText={helper} />
    </div>
  );
}

// ---------------------------------------------------------------------------

export function EditDocumentButton({
  document,
  clients,
  types,
}: {
  document: {
    id: string;
    clientId: string;
    typeId: string;
    fileName: string;
    amountCents: number | null;
    dueDate: Date | null;
    isMonthlyInvoice?: boolean;
    invoiceYear?: number | null;
    invoiceMonth?: number | null;
  };
  clients: { id: string; name: string }[];
  types: { id: string; label: string }[];
}) {
  return (
    <EditDialog
      title="Modifier le document"
      label="Modifier"
      action={updateDocument.bind(null, document.id)}
    >
      <DocumentFields document={document} clients={clients} types={types} />
    </EditDialog>
  );
}

function DocumentFields({
  document,
  clients,
  types,
}: Parameters<typeof EditDocumentButton>[0]) {
  const [monthly, setMonthly] = useState(Boolean(document.isMonthlyInvoice));
  const years = Array.from(
    new Set([CURRENT_YEAR - 1, CURRENT_YEAR, CURRENT_YEAR + 1, ...(document.invoiceYear ? [document.invoiceYear] : [])]),
  ).sort();

  return (
    <>
      <FileNameField value={document.fileName} />
      <ClientSelect clients={clients} value={document.clientId} />
      <div className="flex flex-col gap-2">
        <label htmlFor="edit-typeId" className={LABEL}>
          Type de document
        </label>
        <select id="edit-typeId" name="typeId" required defaultValue={document.typeId} className={FIELD}>
          {types.map((type) => (
            <option key={type.id} value={type.id}>
              {type.label}
            </option>
          ))}
        </select>
      </div>
      <div className="flex flex-col gap-2">
        <label htmlFor="edit-amount" className={LABEL}>
          Montant (€, vide = sans montant)
        </label>
        <input
          id="edit-amount"
          name="amountEuros"
          inputMode="decimal"
          defaultValue={centsToInput(document.amountCents)}
          placeholder="Ex : 450,00"
          className={FIELD}
        />
      </div>
      <div className="flex flex-col gap-2">
        <label htmlFor="edit-dueDate" className={LABEL}>
          Échéance
        </label>
        <input
          id="edit-dueDate"
          name="dueDate"
          type="date"
          defaultValue={document.dueDate ? new Date(document.dueDate).toISOString().slice(0, 10) : ""}
          className={FIELD}
        />
      </div>
      <div className="flex flex-col gap-2 sm:col-span-2">
        <label className="flex items-center gap-2 text-sm text-ink">
          <input
            type="checkbox"
            name="isMonthlyInvoice"
            checked={monthly}
            onChange={(event) => setMonthly(event.target.checked)}
            className="h-4 w-4 rounded border-line"
          />
          Facture mensuelle (client au forfait)
        </label>
        {monthly && (
          <div className="flex flex-wrap gap-3">
            <select name="invoiceYear" required defaultValue={document.invoiceYear ?? CURRENT_YEAR} className={FIELD}>
              {years.map((year) => (
                <option key={year} value={year}>
                  {year}
                </option>
              ))}
            </select>
            <select name="invoiceMonth" required defaultValue={document.invoiceMonth ?? ""} className={FIELD}>
              <option value="">Choisir un mois</option>
              {MONTH_NAMES.map((name, index) => (
                <option key={name} value={index + 1}>
                  {name}
                </option>
              ))}
            </select>
          </div>
        )}
      </div>
      <ReplaceFileField accept="application/pdf" helper="PDF · 20 Mo max. Laissez vide pour garder le fichier actuel." />
    </>
  );
}

// ---------------------------------------------------------------------------

export function EditPaymentRecordButton({
  record,
  clients,
}: {
  record: { id: string; clientId: string; label: string | null; amountCents: number; date: string };
  clients: { id: string; name: string }[];
}) {
  return (
    <EditDialog
      title="Modifier le paiement"
      label="Modifier"
      action={updatePaymentRecord.bind(null, record.id)}
    >
      <ClientSelect clients={clients} value={record.clientId} />
      <div className="flex flex-col gap-2">
        <label htmlFor="edit-amount" className={LABEL}>
          Montant (€)
        </label>
        <input
          id="edit-amount"
          name="amountEuros"
          inputMode="decimal"
          required
          defaultValue={centsToInput(record.amountCents)}
          className={FIELD}
        />
      </div>
      <div className="flex flex-col gap-2">
        <label htmlFor="edit-label" className={LABEL}>
          Libellé (facultatif)
        </label>
        <input id="edit-label" name="label" maxLength={200} defaultValue={record.label ?? ""} className={FIELD} />
      </div>
      <div className="flex flex-col gap-2">
        <label htmlFor="edit-date" className={LABEL}>
          Date
        </label>
        <input id="edit-date" name="date" type="date" required defaultValue={record.date} className={FIELD} />
      </div>
    </EditDialog>
  );
}

// ---------------------------------------------------------------------------

export function EditCompanyDocumentButton({
  document,
}: {
  document: { id: string; fileName: string; category: string };
}) {
  return (
    <EditDialog
      title="Modifier le document"
      label="Modifier"
      action={updateCompanyDocument.bind(null, document.id)}
    >
      <FileNameField value={document.fileName} />
      <div className="flex flex-col gap-2">
        <label htmlFor="edit-category" className={LABEL}>
          Catégorie
        </label>
        <select id="edit-category" name="category" required defaultValue={document.category} className={FIELD}>
          {Object.entries(COMPANY_DOCUMENT_CATEGORY_LABELS).map(([value, name]) => (
            <option key={value} value={value}>
              {name}
            </option>
          ))}
        </select>
      </div>
      <ReplaceFileField
        accept="application/pdf,image/png,image/jpeg"
        helper="PDF, JPEG ou PNG · 20 Mo max. Laissez vide pour garder le fichier actuel."
      />
    </EditDialog>
  );
}
