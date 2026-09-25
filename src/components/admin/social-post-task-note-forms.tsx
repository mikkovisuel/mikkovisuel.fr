"use client";

import { useActionState } from "react";
import { WarningCircle } from "@phosphor-icons/react/dist/ssr";
import { useFormSubmit } from "@/lib/use-form-submit";
import type { SocialPostFormState } from "@/lib/validation/social-post";

// Formulaires de la fiche publication ajoutés le 2026-09-18 : demande d'une
// création (tâche interne) et notes internes. Via useFormSubmit : une
// erreur ne vide jamais la saisie.

type Action = (state: SocialPostFormState, formData: FormData) => Promise<SocialPostFormState>;

const INPUT =
  "rounded-xl border border-line bg-surface-elevated px-3 py-2 text-sm text-ink placeholder:text-ink-muted/70 focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/30";
const SUBMIT =
  "rounded-full border border-line px-4 py-2 text-sm text-ink transition-colors hover:border-accent hover:bg-accent hover:text-accent-ink disabled:opacity-60";

function ErrorMessage({ state }: { state: SocialPostFormState }) {
  if (!state?.error) return null;
  return (
    <span className="flex items-center gap-1 text-sm text-danger">
      <WarningCircle size={16} weight="fill" />
      {state.error}
    </span>
  );
}

export function SocialTaskRequestForm({
  action,
  taskTypes,
  defaultTitle,
  defaultDueDate,
}: {
  action: Action;
  taskTypes: { slug: string; label: string }[];
  defaultTitle: string;
  /** "AAAA-MM-JJ" ou "". */
  defaultDueDate: string;
}) {
  const [state, formAction, pending] = useActionState(action, undefined);
  const { onSubmit } = useFormSubmit(formAction, { pending, state });
  return (
    <form action={formAction} onSubmit={onSubmit} className="grid gap-3">
      <input name="title" required maxLength={160} defaultValue={defaultTitle} className={INPUT} aria-label="Titre de la tâche" />
      <div className="flex flex-wrap gap-3">
        <label className="grid gap-1 text-xs text-ink-muted">
          Type de création
          <select name="taskType" required defaultValue="" className={INPUT}>
            <option value="" disabled>
              Choisir
            </option>
            {taskTypes.map((type) => (
              <option key={type.slug} value={type.slug}>
                {type.label}
              </option>
            ))}
          </select>
        </label>
        <label className="grid gap-1 text-xs text-ink-muted">
          Échéance
          <input name="dueDate" type="date" defaultValue={defaultDueDate} className={INPUT} />
        </label>
        <label className="grid gap-1 text-xs text-ink-muted">
          Date de l&apos;évènement (facultatif)
          <input name="eventDate" type="date" className={INPUT} />
        </label>
      </div>
      <textarea
        name="description"
        rows={3}
        placeholder="Brief : ce qu'il faut produire, format, textes à intégrer..."
        className={`${INPUT} resize-y`}
      />
      <div className="flex flex-wrap items-center gap-3">
        <button type="submit" disabled={pending} className={SUBMIT}>
          {pending ? "Création..." : "Demander la création"}
        </button>
        <ErrorMessage state={state} />
      </div>
    </form>
  );
}

export function SocialPostNoteForm({
  action,
  placeholder = "Ajouter une note (visible de vous seul)",
  submitLabel = "Ajouter la note",
  defaultValue = "",
}: {
  action: Action;
  placeholder?: string;
  submitLabel?: string;
  /** Renseigné pour une modification : le champ n'est alors pas vidé. */
  defaultValue?: string;
}) {
  const [state, formAction, pending] = useActionState(action, undefined);
  const { formRef, onSubmit } = useFormSubmit(formAction, {
    pending,
    state,
    resetOnSuccess: defaultValue === "",
  });
  return (
    <form ref={formRef} action={formAction} onSubmit={onSubmit} className="grid gap-2">
      <textarea
        name="body"
        required
        rows={2}
        defaultValue={defaultValue}
        placeholder={placeholder}
        className={`${INPUT} resize-y`}
      />
      <div className="flex flex-wrap items-center gap-3">
        <button type="submit" disabled={pending} className={SUBMIT}>
          {pending ? "Envoi..." : submitLabel}
        </button>
        <ErrorMessage state={state} />
      </div>
    </form>
  );
}

// Dupliquer une publication (2026-09-18) : vers une autre date et/ou un
// autre client ; redirige vers la copie.
export function SocialPostDuplicateForm({
  action,
  clients,
  defaultClientId,
  defaultScheduledAt,
}: {
  action: Action;
  clients: { id: string; name: string }[];
  defaultClientId: string;
  /** Valeur `datetime-local`, heure de Paris, ou "". */
  defaultScheduledAt: string;
}) {
  const [state, formAction, pending] = useActionState(action, undefined);
  const { onSubmit } = useFormSubmit(formAction, { pending, state });
  return (
    <form action={formAction} onSubmit={onSubmit} className="grid gap-3">
      <div className="flex flex-wrap gap-3">
        <label className="grid gap-1 text-xs text-ink-muted">
          Client
          <select name="clientId" defaultValue={defaultClientId} className={INPUT}>
            {clients.map((client) => (
              <option key={client.id} value={client.id}>
                {client.name}
              </option>
            ))}
          </select>
        </label>
        <label className="grid gap-1 text-xs text-ink-muted">
          Nouvelle date (Paris)
          <input name="scheduledAt" type="datetime-local" defaultValue={defaultScheduledAt} className={INPUT} />
        </label>
      </div>
      <p className="text-xs text-ink-muted">
        Copie en « Idée » : textes, variantes, catégorie et visuels repris ; ni notes, ni échange, ni validation.
      </p>
      <div className="flex flex-wrap items-center gap-3">
        <button type="submit" disabled={pending} className={SUBMIT}>
          {pending ? "Duplication..." : "Dupliquer"}
        </button>
        <ErrorMessage state={state} />
      </div>
    </form>
  );
}
