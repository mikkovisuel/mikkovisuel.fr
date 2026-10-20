"use client";

import { useActionState, useEffect, useState } from "react";
import { PencilSimple, WarningCircle } from "@phosphor-icons/react/dist/ssr";
import { Modal } from "@/components/admin/modal";
import { useFormSubmit } from "@/lib/use-form-submit";
import type { ClientFormState } from "@/lib/validation/client";

// Modification par bloc de la fiche client (refonte « Google Contacts »,
// 2026-10-20) : la fiche s'affiche en lecture, et le crayon de chaque bloc
// ouvre une fenêtre avec ses seuls champs. L'action `updateClient` attend la
// fiche complète : les champs des autres blocs partent en champs cachés avec
// leur valeur actuelle, pour ne rien effacer.

export interface ClientValues {
  name: string;
  raisonSociale: string | null;
  notes: string | null;
  address: string | null;
  siret: string | null;
  vatNumber: string | null;
  billingEmail: string | null;
  driveUrl: string | null;
  categoryId: string | null;
  requirePaymentForDeliverables: boolean;
  requirePaymentBeforeWork: boolean;
}

export type ClientBlock = "identite" | "coordonnees" | "paiement" | "notes";

const BLOCK_FIELDS: Record<ClientBlock, (keyof ClientValues)[]> = {
  identite: ["name", "raisonSociale", "categoryId"],
  coordonnees: ["address", "billingEmail", "siret", "vatNumber", "driveUrl"],
  paiement: ["requirePaymentBeforeWork", "requirePaymentForDeliverables"],
  notes: ["notes"],
};

const TITLES: Record<ClientBlock, string> = {
  identite: "Modifier le nom et la catégorie",
  coordonnees: "Modifier les coordonnées",
  paiement: "Modifier les règles de paiement",
  notes: "Modifier les notes internes",
};

const FIELD =
  "rounded-xl border border-line bg-surface-elevated px-3 py-2.5 text-sm text-ink placeholder:text-ink-muted/70 focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/30";
const LABEL = "text-sm font-medium text-ink";

export const ICON_BUTTON =
  "flex h-9 w-9 items-center justify-center rounded-full text-ink-muted transition-colors hover:bg-ink/[0.08] hover:text-ink";

function HiddenField({ name, value }: { name: keyof ClientValues; value: ClientValues[keyof ClientValues] }) {
  if (typeof value === "boolean") return value ? <input type="hidden" name={name} value="on" /> : null;
  return <input type="hidden" name={name} value={value ?? ""} />;
}

function Text({
  name,
  label,
  value,
  type = "text",
  placeholder,
  required,
  wide,
}: {
  name: keyof ClientValues;
  label: string;
  value: string | null;
  type?: string;
  placeholder?: string;
  required?: boolean;
  wide?: boolean;
}) {
  return (
    <div className={`flex flex-col gap-2 ${wide ? "sm:col-span-2" : ""}`}>
      <label htmlFor={`block-${name}`} className={LABEL}>
        {label}
      </label>
      <input
        id={`block-${name}`}
        name={name}
        type={type}
        defaultValue={value ?? ""}
        placeholder={placeholder}
        required={required}
        className={FIELD}
      />
    </div>
  );
}

function BlockForm({
  block,
  values,
  categoryOptions,
  action,
  onDone,
}: {
  block: ClientBlock;
  values: ClientValues;
  categoryOptions: { id: string; label: string }[];
  action: (state: ClientFormState, formData: FormData) => Promise<ClientFormState>;
  onDone: () => void;
}) {
  const [state, formAction, pending] = useActionState(action, undefined);
  const { onSubmit } = useFormSubmit(formAction, { pending, state });

  useEffect(() => {
    if (state?.success) onDone();
  }, [state, onDone]);

  const hidden = (Object.keys(values) as (keyof ClientValues)[]).filter(
    (key) => !BLOCK_FIELDS[block].includes(key),
  );

  return (
    <form action={formAction} onSubmit={onSubmit} className="grid gap-4 sm:grid-cols-2">
      {hidden.map((key) => (
        <HiddenField key={key} name={key} value={values[key]} />
      ))}

      {block === "identite" && (
        <>
          <Text name="name" label="Nom du client" value={values.name} required wide />
          <Text name="raisonSociale" label="Raison sociale (facultatif)" value={values.raisonSociale} />
          <div className="flex flex-col gap-2">
            <label htmlFor="block-categoryId" className={LABEL}>
              Catégorie
            </label>
            <select id="block-categoryId" name="categoryId" defaultValue={values.categoryId ?? ""} className={FIELD}>
              <option value="">Non catégorisé</option>
              {categoryOptions.map((option) => (
                <option key={option.id} value={option.id}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>
        </>
      )}

      {block === "coordonnees" && (
        <>
          <div className="flex flex-col gap-2 sm:col-span-2">
            <label htmlFor="block-address" className={LABEL}>
              Adresse
            </label>
            <textarea id="block-address" name="address" rows={2} defaultValue={values.address ?? ""} className={FIELD} />
          </div>
          <Text name="billingEmail" label="E-mail de facturation" type="email" value={values.billingEmail} wide />
          <Text name="siret" label="SIRET" value={values.siret} />
          <Text name="vatNumber" label="N° TVA intracommunautaire" value={values.vatNumber} placeholder="FR12345678900" />
          <Text name="driveUrl" label="Lien Drive" type="url" value={values.driveUrl} placeholder="https://drive.google.com/…" wide />
        </>
      )}

      {block === "paiement" && (
        <div className="grid gap-4 sm:col-span-2">
          <label className="flex items-start gap-3 text-sm text-ink">
            <input
              type="checkbox"
              name="requirePaymentBeforeWork"
              defaultChecked={values.requirePaymentBeforeWork}
              className="mt-0.5 h-4 w-4"
            />
            <span>
              Paiement requis avant de commencer le travail
              <span className="mt-1 block text-xs text-ink-muted">
                Réglage par défaut des évènements de ce client : le statut ne peut pas quitter « Nouveau » tant que le
                paiement n&apos;est pas confirmé. Modifiable évènement par évènement depuis sa fiche.
              </span>
            </span>
          </label>
          <label className="flex items-start gap-3 text-sm text-ink">
            <input
              type="checkbox"
              name="requirePaymentForDeliverables"
              defaultChecked={values.requirePaymentForDeliverables}
              className="mt-0.5 h-4 w-4"
            />
            <span>
              Paiement requis avant l&apos;accès aux livrables finaux
              <span className="mt-1 block text-xs text-ink-muted">
                Les livrables finaux (pas les BAT) restent verrouillés tant que le paiement n&apos;est pas confirmé.
                Modifiable évènement par évènement depuis sa fiche.
              </span>
            </span>
          </label>
        </div>
      )}

      {block === "notes" && (
        <div className="flex flex-col gap-2 sm:col-span-2">
          <label htmlFor="block-notes" className={LABEL}>
            Notes internes (jamais visibles du client)
          </label>
          <textarea id="block-notes" name="notes" rows={8} defaultValue={values.notes ?? ""} className={FIELD} />
        </div>
      )}

      {state?.error && (
        <p role="alert" className="flex items-center gap-2 text-sm text-danger sm:col-span-2">
          <WarningCircle size={16} weight="fill" className="shrink-0" />
          {state.error}
        </p>
      )}
      <div className="flex items-center gap-3 sm:col-span-2">
        <button
          type="submit"
          disabled={pending}
          className="inline-flex items-center rounded-full bg-accent px-6 py-3 text-sm font-medium text-accent-ink disabled:opacity-60"
        >
          {pending ? "Enregistrement…" : "Enregistrer"}
        </button>
        <button type="button" onClick={onDone} className="rounded-full px-4 py-3 text-sm text-ink-muted hover:text-ink">
          Annuler
        </button>
      </div>
    </form>
  );
}

/** Crayon d'un bloc de la fiche client. */
export function ClientBlockEditButton(props: {
  block: ClientBlock;
  values: ClientValues;
  categoryOptions: { id: string; label: string }[];
  action: (state: ClientFormState, formData: FormData) => Promise<ClientFormState>;
}) {
  const [open, setOpen] = useState(false);
  const [session, setSession] = useState(0);
  return (
    <>
      <button
        type="button"
        onClick={() => {
          setSession((value) => value + 1);
          setOpen(true);
        }}
        aria-label={TITLES[props.block]}
        title={TITLES[props.block]}
        className={ICON_BUTTON}
      >
        <PencilSimple size={18} />
      </button>
      <Modal open={open} onClose={() => setOpen(false)} title={TITLES[props.block]}>
        {open && <BlockForm key={session} {...props} onDone={() => setOpen(false)} />}
      </Modal>
    </>
  );
}

/** Bouton qui ouvre une fenêtre avec un contenu donné (logo du client). */
export function ModalTrigger({
  title,
  label,
  className,
  children,
  content,
}: {
  title: string;
  label: string;
  className?: string;
  /** Contenu du bouton. */
  children: React.ReactNode;
  /** Contenu de la fenêtre. */
  content: React.ReactNode;
}) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <button type="button" onClick={() => setOpen(true)} aria-label={label} title={label} className={className}>
        {children}
      </button>
      <Modal open={open} onClose={() => setOpen(false)} title={title}>
        {content}
      </Modal>
    </>
  );
}
