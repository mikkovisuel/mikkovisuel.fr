"use client";

import { Fragment, useActionState, useState } from "react";
import { PencilSimple, Phone, EnvelopeSimple, Trash, WarningCircle } from "@phosphor-icons/react/dist/ssr";
import { ContactAccessBadge } from "@/components/admin/contact-access-badge";
import { ContactEditForm } from "@/components/admin/contact-edit-form";
import type { ContactAccessState } from "@/lib/clients";
import type { ContactEditFormState } from "@/lib/validation/client";
import type { StepUpFormState } from "@/lib/step-up-auth";
import { useFormSubmit } from "@/lib/use-form-submit";

// Ligne de l'annuaire global (/admin/contacts) — colonnes alignées en grille
// (demande du 2026-07-31, "aligner les différentes propriétés
// verticalement") plutôt que le flex-wrap précédent, et un bouton icône
// "modifier" qui déplie `ContactEditForm` juste en dessous, sur le modèle
// de `ContactCard` de la fiche client (auparavant cette page était en
// lecture seule, l'édition n'existait que depuis la fiche client).
const COLUMN_WIDTHS: Record<string, string> = {
  email: "minmax(0,1.4fr)",
  telephone: "minmax(0,1fr)",
  client: "minmax(0,1fr)",
  acces: "auto",
};

/** Grille de la ligne : nom, colonnes choisies, boutons. */
function gridTemplate(columns: string[]) {
  return ["minmax(0,1.2fr)", ...columns.map((key) => COLUMN_WIDTHS[key]).filter(Boolean), "auto"].join(" ");
}

export function GlobalContactRow({
  contact,
  clientName,
  clientHref,
  accessState,
  editAction,
  deleteAction,
  linkedClientNames,
  columns = ["email", "telephone", "client", "acces"],
}: {
  contact: { id: string; name: string; email: string | null; phone: string | null; role: string | null };
  clientName: string;
  clientHref: string;
  accessState: ContactAccessState;
  editAction: (state: ContactEditFormState, formData: FormData) => Promise<ContactEditFormState>;
  /** Suppression définitive de l'identité `Contact` (2026-08-02) — déjà liée
   * au bon `Contact.id`, distinct du `contact.id` ci-dessus qui est en
   * réalité l'id du rattachement (`ClientContact`). */
  deleteAction: (state: StepUpFormState, formData: FormData) => Promise<StepUpFormState>;
  /** Tous les clients auxquels ce `Contact` est actuellement rattaché — pour
   * avertir avant suppression si ce n'est pas que celui-ci (la suppression
   * est en cascade, elle les retirerait tous d'un coup). */
  linkedClientNames: string[];
  /** Colonnes visibles, dans l'ordre (« Mon affichage », 2026-10-20). Le nom
   * et les boutons restent toujours affichés. */
  columns?: string[];
}) {
  const [editing, setEditing] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [deleteState, deleteFormAction, deletePending] = useActionState(deleteAction, undefined);
  const { onSubmit: deleteFormSubmit } = useFormSubmit(deleteFormAction, { pending: deletePending, state: deleteState });

  return (
    <div className="ws-row flex flex-col justify-center px-4 sm:px-6 lg:px-8 2xl:px-12">
      <div
        className="grid grid-cols-1 items-center gap-x-4 gap-y-1 sm:[grid-template-columns:var(--contact-cols)]"
        style={{ "--contact-cols": gridTemplate(columns) } as React.CSSProperties}
      >
        <p className="flex items-center gap-2 truncate font-medium text-ink">
          {contact.name}
          {contact.role && <span className="truncate text-sm text-ink-muted">· {contact.role}</span>}
        </p>
        {/* Colonnes dans l'ordre du profil. */}
        {columns.map((column) => (
          {
          email: (
            <Fragment key="email">
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
            </Fragment>
          ),
          telephone: (
            <Fragment key="telephone">
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
            </Fragment>
          ),
          client: (
            <Fragment key="client">
            <a
              href={clientHref}
              className="truncate text-sm text-ink-muted transition-colors hover:text-ink"
            >
              {clientName}
            </a>
            </Fragment>
          ),
          acces: (
            <Fragment key="acces">
            {/* Largeur fixe (pas seulement `truncate`) : ce badge est dans une
                colonne `auto`, dont la largeur suit sinon le texte de CE badge
                précis (3 libellés de longueurs différentes) — chaque ligne de
                la grille étant indépendante des autres (pas de grille CSS
                partagée entre lignes), un badge plus court ou plus long décalait
                toutes les colonnes précédentes d'une ligne à l'autre. */}
            <div className="w-44">
              <ContactAccessBadge state={accessState} />
            </div>
            </Fragment>
          ),
          } as Record<string, React.ReactNode>
        )[column] ?? null)}
        {/* Les deux boutons (modifier, supprimer) sont toujours rendus
            ensemble ici — jamais l'un sans l'autre selon une condition —
            pour que cette colonne garde la même largeur sur toutes les
            lignes (même raison que la largeur fixe du badge ci-dessus). */}
        <div className="flex items-center gap-1.5 justify-self-end sm:justify-self-auto">
          <button
            type="button"
            onClick={() => setEditing((value) => !value)}
            aria-expanded={editing}
            aria-label="Modifier"
            title="Modifier"
            className="flex h-8 w-8 items-center justify-center rounded-full border border-line text-ink-muted transition-colors hover:border-accent hover:bg-accent hover:text-accent-ink"
          >
            <PencilSimple size={16} weight="regular" />
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

      {deleting && (
        <form
          action={deleteFormAction}
          onSubmit={deleteFormSubmit}
          className="mt-2 flex flex-col gap-2 rounded-xl border border-danger/30 bg-danger/5 p-3"
        >
          <p className="text-xs text-ink">
            Supprimer définitivement <span className="font-medium">{contact.name}</span> — action
            irréversible.
            {linkedClientNames.length > 1 && (
              <>
                {" "}
                Ce contact est rattaché à <span className="font-medium">{linkedClientNames.length} clients</span> (
                {linkedClientNames.join(", ")}) : il disparaîtra de <span className="font-medium">tous</span>, pas
                seulement de {clientName}.
              </>
            )}
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
