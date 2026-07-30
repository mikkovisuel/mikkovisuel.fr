"use client";

import { useState } from "react";
import { CaretRight, Phone, EnvelopeSimple } from "@phosphor-icons/react/dist/ssr";
import { ContactAccessBadge } from "@/components/admin/contact-access-badge";
import { ContactEditForm } from "@/components/admin/contact-edit-form";
import { ContactAccessControls } from "@/components/admin/contact-access-controls";
import { ClientUserEmailToggle } from "@/components/admin/client-user-email-toggle";
import type { ContactAccessState } from "@/lib/clients";
import type { ContactEditFormState } from "@/lib/validation/client";

// Ligne repliée par défaut : nom, fonction, état d'accès et coordonnées sur
// une seule ligne. Le formulaire d'édition et les boutons d'accès ne sont
// montés qu'une fois la ligne dépliée (demande du client le 2026-07-30 —
// avec plusieurs contacts, un formulaire complet par contact rendait la
// section illisible).
//
// Client component uniquement pour le dépli ; l'édition, l'accès et les
// notifications restent des Server Actions, passées en props.
export function ContactCard({
  contact,
  clientId,
  accessState,
  editAction,
  deleteButton,
  resetPasswordButton,
  impersonateButton,
}: {
  contact: {
    id: string;
    name: string;
    email: string | null;
    phone: string | null;
    role: string | null;
    emailNotificationsEnabled: boolean;
  };
  clientId: string;
  accessState: ContactAccessState;
  editAction: (state: ContactEditFormState, formData: FormData) => Promise<ContactEditFormState>;
  deleteButton: React.ReactNode;
  resetPasswordButton: React.ReactNode;
  impersonateButton: React.ReactNode;
}) {
  const [open, setOpen] = useState(false);

  return (
    <div className="px-5 py-3">
      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        aria-expanded={open}
        className="flex w-full items-center gap-3 text-left"
      >
        <CaretRight
          size={14}
          weight="bold"
          className={`shrink-0 text-ink-muted transition-transform ${open ? "rotate-90" : ""}`}
        />
        <span className="flex min-w-0 flex-1 flex-wrap items-center gap-x-3 gap-y-1">
          <span className="font-medium text-ink">{contact.name}</span>
          {contact.role && <span className="text-sm text-ink-muted">{contact.role}</span>}
          <ContactAccessBadge state={accessState} />
        </span>
        <span className="hidden shrink-0 items-center gap-4 text-sm text-ink-muted sm:flex">
          {contact.email && (
            <span className="inline-flex items-center gap-1.5">
              <EnvelopeSimple size={14} weight="regular" />
              {contact.email}
            </span>
          )}
          {contact.phone && (
            <span className="inline-flex items-center gap-1.5">
              <Phone size={14} weight="regular" />
              {contact.phone}
            </span>
          )}
        </span>
      </button>

      {open && (
        <div className="mt-2 border-t border-line pt-3 pl-7">
          <ContactEditForm
            action={editAction}
            defaultValues={{
              name: contact.name,
              email: contact.email,
              phone: contact.phone,
              role: contact.role,
            }}
          />
          <div className="mt-3 flex flex-wrap items-center gap-3">
            <ContactAccessControls
              clientUserId={contact.id}
              clientId={clientId}
              state={accessState}
              hasEmail={Boolean(contact.email)}
            />
            {/* Notifications, usurpation et réinitialisation n'ont de sens que
                pour un contact ayant réellement un espace. */}
            {accessState !== "none" && (
              <>
                <ClientUserEmailToggle
                  clientUserId={contact.id}
                  clientId={clientId}
                  enabled={contact.emailNotificationsEnabled}
                />
                {accessState === "active" && impersonateButton}
                {resetPasswordButton}
              </>
            )}
            {deleteButton}
          </div>
        </div>
      )}
    </div>
  );
}
