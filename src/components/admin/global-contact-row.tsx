"use client";

import { useState } from "react";
import { PencilSimple, Phone, EnvelopeSimple } from "@phosphor-icons/react/dist/ssr";
import { ContactAccessBadge } from "@/components/admin/contact-access-badge";
import { ContactEditForm } from "@/components/admin/contact-edit-form";
import type { ContactAccessState } from "@/lib/clients";
import type { ContactEditFormState } from "@/lib/validation/client";

// Ligne de l'annuaire global (/admin/contacts) — colonnes alignées en grille
// (demande du 2026-07-31, "aligner les différentes propriétés
// verticalement") plutôt que le flex-wrap précédent, et un bouton icône
// "modifier" qui déplie `ContactEditForm` juste en dessous, sur le modèle
// de `ContactCard` de la fiche client (auparavant cette page était en
// lecture seule, l'édition n'existait que depuis la fiche client).
export function GlobalContactRow({
  contact,
  clientName,
  clientHref,
  accessState,
  editAction,
}: {
  contact: { id: string; name: string; email: string | null; phone: string | null; role: string | null };
  clientName: string;
  clientHref: string;
  accessState: ContactAccessState;
  editAction: (state: ContactEditFormState, formData: FormData) => Promise<ContactEditFormState>;
}) {
  const [editing, setEditing] = useState(false);

  return (
    <div className="px-6 py-3">
      <div className="grid grid-cols-1 items-center gap-x-4 gap-y-1 sm:grid-cols-[1.2fr_1.4fr_1fr_1fr_auto_auto]">
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
            className="flex items-center gap-1.5 text-sm text-ink-muted transition-colors hover:text-ink"
          >
            <Phone size={14} weight="regular" className="shrink-0" />
            {contact.phone}
          </a>
        ) : (
          <span className="text-sm text-ink-muted">—</span>
        )}
        <a
          href={clientHref}
          className="truncate text-sm text-ink-muted transition-colors hover:text-ink"
        >
          {clientName}
        </a>
        <ContactAccessBadge state={accessState} />
        <button
          type="button"
          onClick={() => setEditing((value) => !value)}
          aria-expanded={editing}
          aria-label="Modifier"
          title="Modifier"
          className="flex h-8 w-8 items-center justify-center justify-self-end rounded-full border border-line text-ink-muted transition-colors hover:border-accent hover:bg-accent hover:text-accent-ink sm:justify-self-auto"
        >
          <PencilSimple size={16} weight="regular" />
        </button>
      </div>

      {editing && (
        <div className="mt-2 border-t border-line pt-3">
          <ContactEditForm
            action={editAction}
            defaultValues={{
              name: contact.name,
              email: contact.email,
              phone: contact.phone,
              role: contact.role,
            }}
          />
        </div>
      )}
    </div>
  );
}
