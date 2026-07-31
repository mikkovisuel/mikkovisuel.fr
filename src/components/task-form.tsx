"use client";

import { useActionState, useRef, useEffect, useState } from "react";
import { WarningCircle } from "@phosphor-icons/react/dist/ssr";
import { FilePicker } from "@/components/file-picker";
import { MultiSelectChips } from "@/components/multi-select-chips";
import type { TaskFormState } from "@/lib/validation/task";

interface DropdownOption {
  slug: string;
  label: string;
  color: string;
}

export function TaskForm({
  action,
  typeOptions,
  formatOptions,
  clients,
  allowAttachments,
  allowEstimate,
  successMessage,
  onSuccess,
}: {
  action: (state: TaskFormState, formData: FormData) => Promise<TaskFormState>;
  typeOptions: DropdownOption[];
  formatOptions: DropdownOption[];
  /** Si fourni, ajoute un sélecteur de client en tête de formulaire (cas de
   * `/admin/taches/nouveau`, où le client n'est pas déjà connu de la page). */
  clients?: { id: string; name: string }[];
  /** Affiche un champ de pièces jointes (cas de "Nouvelle demande" côté
   * client) — références visuelles, pas des livrables. */
  allowAttachments?: boolean;
  /** Affiche le champ "Temps estimé" (cas admin uniquement). Volontairement
   * absent côté espace client : c'est un suivi interne, jamais exposé au
   * client — voir `parseEstimatedMinutes` dans src/lib/actions/tasks.ts,
   * que `createTaskByClient` n'appelle pas. */
  allowEstimate?: boolean;
  /** Si fourni, affiche ce message dans un pop-up de confirmation après un
   * envoi réussi (cas client). Absent côté admin : reset silencieux. */
  successMessage?: string;
  /** Appelé après une création réussie — sert à refermer la modale
   * (voir NewTaskButton). */
  onSuccess?: () => void;
}) {
  const [state, formAction, pending] = useActionState(action, undefined);
  const formRef = useRef<HTMLFormElement>(null);
  const wasPending = useRef(false);
  const [resetKey, setResetKey] = useState(0);

  useEffect(() => {
    if (wasPending.current && !pending && !state?.error) {
      formRef.current?.reset();
      setResetKey((key) => key + 1);
      onSuccess?.();
    }
    wasPending.current = pending;
  }, [pending, state, onSuccess]);

  // Render-phase state adjustment (React's recommended alternative to
  // setState-in-effect) so showing the pop-up doesn't need its own effect.
  const [prevPending, setPrevPending] = useState(pending);
  const [showSuccess, setShowSuccess] = useState(false);
  if (pending !== prevPending) {
    setPrevPending(pending);
    if (prevPending && !pending && !state?.error && successMessage) {
      setShowSuccess(true);
    }
  }

  return (
    <>
      <form ref={formRef} action={formAction} className="grid gap-4">
        {clients && (
          <div className="flex flex-col gap-2">
            <label htmlFor="clientId" className="text-sm font-medium text-ink">
              Client
            </label>
            <select
              id="clientId"
              name="clientId"
              required
              defaultValue=""
              className="rounded-xl border border-line bg-surface-elevated px-4 py-2.5 text-sm text-ink focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/30"
            >
              <option value="" disabled>
                Choisir un client
              </option>
              {clients.map((client) => (
                <option key={client.id} value={client.id}>
                  {client.name}
                </option>
              ))}
            </select>
          </div>
        )}
        <div className="flex flex-col gap-2">
          <label htmlFor="title" className="text-sm font-medium text-ink">
            Titre
          </label>
          <input
            id="title"
            name="title"
            required
            className="rounded-xl border border-line bg-surface-elevated px-4 py-2.5 text-sm text-ink placeholder:text-ink-muted/70 focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/30"
            placeholder="Ex : Flyer soirée du 12 septembre"
          />
        </div>
        <div className="flex flex-col gap-2">
          <label htmlFor="description" className="text-sm font-medium text-ink">
            Description
          </label>
          <textarea
            id="description"
            name="description"
            rows={3}
            className="resize-none rounded-xl border border-line bg-surface-elevated px-4 py-2.5 text-sm text-ink placeholder:text-ink-muted/70 focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/30"
            placeholder="Détails de la demande"
          />
        </div>
        <div className="flex flex-col gap-2">
          <label htmlFor="eventDate" className="text-sm font-medium text-ink">
            Date de l&rsquo;évènement
          </label>
          <input
            id="eventDate"
            name="eventDate"
            type="date"
            className="rounded-xl border border-line bg-surface-elevated px-4 py-2.5 text-sm text-ink focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/30"
          />
        </div>
        {allowEstimate && (
          <div className="flex flex-col gap-2">
            <label htmlFor="estimatedMinutes" className="text-sm font-medium text-ink">
              Temps estimé (minutes)
            </label>
            <input
              id="estimatedMinutes"
              name="estimatedMinutes"
              type="number"
              min="0"
              step="1"
              placeholder="120"
              className="w-32 rounded-xl border border-line bg-surface-elevated px-4 py-2.5 text-sm text-ink placeholder:text-ink-muted/70 focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/30"
            />
          </div>
        )}
        {typeOptions.length > 0 && (
          <div className="flex flex-col gap-2">
            <span className="text-sm font-medium text-ink">Type</span>
            <MultiSelectChips name="types" options={typeOptions} />
          </div>
        )}
        {formatOptions.length > 0 && (
          <div className="flex flex-col gap-2">
            <span className="text-sm font-medium text-ink">Formats</span>
            <MultiSelectChips name="formats" options={formatOptions} />
          </div>
        )}
        {allowAttachments && (
          <div className="flex flex-col gap-2">
            <span className="text-sm font-medium text-ink">Fichiers de référence (optionnel)</span>
            <FilePicker
              key={resetKey}
              name="attachments"
              multiple
              accept="image/png,image/jpeg,image/webp,application/pdf"
              helperText="Moodboard, logo, image d'inspiration... (20 Mo maximum par fichier)"
            />
          </div>
        )}
        {state?.error && (
          <div className="flex items-center gap-2 text-sm text-danger">
            <WarningCircle size={16} weight="fill" />
            {state.error}
          </div>
        )}
        <div>
          <button
            type="submit"
            disabled={pending}
            className="inline-flex items-center rounded-full border border-line px-5 py-2.5 text-sm font-medium text-ink transition-colors hover:border-accent hover:bg-accent hover:text-accent-ink disabled:opacity-60"
          >
            {pending ? "Création..." : "Créer la tâche"}
          </button>
        </div>
      </form>
      {showSuccess && successMessage && (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
          onClick={() => setShowSuccess(false)}
        >
          <div
            onClick={(event) => event.stopPropagation()}
            className="max-w-sm rounded-2xl border border-line bg-surface-elevated p-6 text-center shadow-xl"
          >
            <p className="text-ink">{successMessage}</p>
            <button
              type="button"
              onClick={() => setShowSuccess(false)}
              className="mt-4 rounded-full bg-accent px-5 py-2 text-sm font-medium text-accent-ink transition-transform active:scale-[0.98]"
            >
              Fermer
            </button>
          </div>
        </div>
      )}
    </>
  );
}
