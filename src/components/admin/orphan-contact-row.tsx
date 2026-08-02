"use client";

import { useActionState, useState } from "react";
import { EnvelopeSimple, LinkSimple, Phone, Trash, WarningCircle } from "@phosphor-icons/react/dist/ssr";
import type { ContactFormState } from "@/lib/validation/client";
import type { StepUpFormState } from "@/lib/step-up-auth";

// Ligne d'un contact "orphelin" (rattaché à zéro client) — filtre "Sans
// client" de /admin/contacts (2026-08-02, "possible de supprimer
// définitivement un contact ?"). Un contact non rattaché ne s'affichait
// nulle part jusqu'ici, ce qui rendait impossible de le retrouver pour le
// réaffecter à un client ou le supprimer pour de bon.
export function OrphanContactRow({
  contact,
  clients,
  assignAction,
  deleteAction,
}: {
  contact: { id: string; name: string; email: string | null; phone: string | null; role: string | null };
  clients: { id: string; name: string }[];
  assignAction: (state: ContactFormState, formData: FormData) => Promise<ContactFormState>;
  deleteAction: (state: StepUpFormState, formData: FormData) => Promise<StepUpFormState>;
}) {
  const [assigning, setAssigning] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [assignState, assignFormAction, assignPending] = useActionState(assignAction, undefined);
  const [deleteState, deleteFormAction, deletePending] = useActionState(deleteAction, undefined);

  return (
    <div className="px-6 py-3">
      <div className="grid grid-cols-1 items-center gap-x-4 gap-y-1 sm:grid-cols-[minmax(0,1.4fr)_minmax(0,1.6fr)_minmax(0,1fr)_auto]">
        <p className="flex items-center gap-2 truncate font-medium text-ink">
          {contact.name}
          {contact.role && <span className="truncate text-sm text-ink-muted">· {contact.role}</span>}
        </p>
        {contact.email ? (
          <a
            href={`mailto:${contact.email}`}
            className="flex items-center gap-1.5 truncate text-sm text-ink-muted transition-colors hover:text-ink"
          >
            <EnvelopeSimple size={14} weight="regular" className="shrink-0" />
            <span className="truncate">{contact.email}</span>
          </a>
        ) : (
          <span className="text-sm text-ink-muted">—</span>
        )}
        {contact.phone ? (
          <a
            href={`tel:${contact.phone.replace(/\s/g, "")}`}
            className="flex items-center gap-1.5 truncate text-sm text-ink-muted transition-colors hover:text-ink"
          >
            <Phone size={14} weight="regular" className="shrink-0" />
            <span className="truncate">{contact.phone}</span>
          </a>
        ) : (
          <span className="text-sm text-ink-muted">—</span>
        )}
        <div className="flex items-center gap-1.5 justify-self-end sm:justify-self-auto">
          <button
            type="button"
            onClick={() => setAssigning((value) => !value)}
            aria-expanded={assigning}
            aria-label="Affecter à un client"
            title="Affecter à un client"
            className="flex h-8 w-8 items-center justify-center rounded-full border border-line text-ink-muted transition-colors hover:border-accent hover:bg-accent hover:text-accent-ink"
          >
            <LinkSimple size={16} weight="regular" />
          </button>
          <button
            type="button"
            onClick={() => setDeleting((value) => !value)}
            aria-expanded={deleting}
            aria-label="Supprimer définitivement"
            title="Supprimer définitivement"
            className="flex h-8 w-8 items-center justify-center rounded-full border border-line text-ink-muted transition-colors hover:border-danger/40 hover:bg-danger/10 hover:text-danger"
          >
            <Trash size={16} weight="regular" />
          </button>
        </div>
      </div>

      {assigning && (
        <form
          action={assignFormAction}
          className="mt-2 flex flex-wrap items-center gap-2 rounded-xl border border-line bg-surface-elevated p-3"
        >
          <input type="hidden" name="mode" value="affecter" />
          <input type="hidden" name="existingContactId" value={contact.id} />
          <select
            name="clientId"
            required
            defaultValue=""
            className="rounded-lg border border-line bg-surface px-3 py-2 text-sm text-ink focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/30"
          >
            <option value="" disabled>
              Choisir un client...
            </option>
            {clients.map((client) => (
              <option key={client.id} value={client.id}>
                {client.name}
              </option>
            ))}
          </select>
          <button
            type="submit"
            disabled={assignPending}
            className="rounded-full bg-accent px-4 py-2 text-sm font-medium text-accent-ink transition-transform active:scale-[0.98] disabled:opacity-60"
          >
            {assignPending ? "Affectation..." : "Affecter"}
          </button>
          {assignState?.error && (
            <span className="flex items-center gap-1.5 text-xs text-danger">
              <WarningCircle size={14} weight="fill" />
              {assignState.error}
            </span>
          )}
        </form>
      )}

      {deleting && (
        <form
          action={deleteFormAction}
          className="mt-2 flex flex-col gap-2 rounded-xl border border-danger/30 bg-danger/5 p-3"
        >
          <p className="text-xs text-ink">
            Supprimer définitivement <span className="font-medium">{contact.name}</span> — action
            irréversible.
          </p>
          <input
            type="password"
            name="stepUpPassword"
            required
            autoFocus
            placeholder="Votre mot de passe admin"
            className="rounded-lg border border-line bg-surface-elevated px-3 py-2 text-sm text-ink placeholder:text-ink-muted/70 focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/30"
          />
          {deleteState?.error && (
            <div className="flex items-center gap-1.5 text-xs text-danger">
              <WarningCircle size={14} weight="fill" />
              {deleteState.error}
            </div>
          )}
          <div className="flex gap-2">
            <button
              type="submit"
              disabled={deletePending}
              className="rounded-full border border-danger/40 bg-danger/10 px-4 py-1.5 text-xs font-medium text-danger transition-transform hover:bg-danger/20 active:scale-[0.98] disabled:opacity-60"
            >
              {deletePending ? "Suppression..." : "Supprimer définitivement"}
            </button>
            <button
              type="button"
              onClick={() => setDeleting(false)}
              className="rounded-full border border-line px-4 py-1.5 text-xs text-ink-muted transition-colors hover:text-ink"
            >
              Annuler
            </button>
          </div>
        </form>
      )}
    </div>
  );
}
