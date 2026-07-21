"use client";

import { useActionState } from "react";
import { WarningCircle } from "@phosphor-icons/react/dist/ssr";
import { DeleteButton } from "@/components/admin/delete-button";
import { addManualTimeEntry, deleteTimeEntry } from "@/lib/actions/time-tracking";
import { formatDurationShort } from "@/lib/time-tracking";

const DATE_FORMATTER = new Intl.DateTimeFormat("fr-FR", {
  day: "numeric",
  month: "long",
  year: "numeric",
});

interface TimeEntry {
  id: string;
  startedAt: Date;
  endedAt: Date | null;
  manual: boolean;
}

// Journal des sessions (chronométrées et manuelles) + formulaire d'ajout
// manuel — la session en cours (`endedAt: null`) n'est pas listée ici, elle
// est déjà affichée en direct par `TaskTimerButton` juste au-dessus.
export function TaskTimeEntries({ taskId, entries }: { taskId: string; entries: TimeEntry[] }) {
  const addAction = addManualTimeEntry.bind(null, taskId);
  const [state, formAction, pending] = useActionState(addAction, undefined);
  const closedEntries = entries.filter((entry) => entry.endedAt !== null);

  return (
    <div className="flex flex-col gap-4">
      {closedEntries.length === 0 ? (
        <p className="text-sm text-ink-muted">Aucune session enregistrée pour l&apos;instant.</p>
      ) : (
        <ul className="flex flex-col gap-2">
          {closedEntries.map((entry) => (
            <li
              key={entry.id}
              className="flex items-center justify-between gap-3 rounded-xl border border-line bg-surface-elevated px-3 py-2 text-sm"
            >
              <span className="text-ink-muted">
                {DATE_FORMATTER.format(entry.startedAt)}
                {entry.manual && " · ajouté manuellement"}
              </span>
              <div className="flex items-center gap-3">
                <span className="font-medium text-ink">
                  {formatDurationShort(entry.endedAt!.getTime() - entry.startedAt.getTime())}
                </span>
                <DeleteButton
                  action={deleteTimeEntry.bind(null, entry.id)}
                  confirmMessage="Supprimer cette session ?"
                  label="×"
                  className="text-ink-muted transition-colors hover:text-danger"
                />
              </div>
            </li>
          ))}
        </ul>
      )}

      <form action={formAction} className="flex flex-wrap items-end gap-3">
        <div className="flex flex-col gap-1">
          <label htmlFor="time-entry-date" className="text-xs font-medium text-ink-muted">
            Date
          </label>
          <input
            id="time-entry-date"
            name="date"
            type="date"
            required
            defaultValue={new Date().toISOString().slice(0, 10)}
            className="rounded-lg border border-line bg-surface-elevated px-3 py-2 text-sm text-ink focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/30"
          />
        </div>
        <div className="flex flex-col gap-1">
          <label htmlFor="time-entry-minutes" className="text-xs font-medium text-ink-muted">
            Durée (minutes)
          </label>
          <input
            id="time-entry-minutes"
            name="minutes"
            type="number"
            min="1"
            step="1"
            required
            placeholder="45"
            className="w-28 rounded-lg border border-line bg-surface-elevated px-3 py-2 text-sm text-ink placeholder:text-ink-muted/70 focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/30"
          />
        </div>
        <button
          type="submit"
          disabled={pending}
          className="rounded-full border border-line px-4 py-2 text-xs font-medium text-ink transition-colors hover:border-accent hover:bg-accent hover:text-accent-ink disabled:opacity-60"
        >
          {pending ? "Ajout..." : "Ajouter du temps"}
        </button>
        {state?.error && (
          <span className="flex items-center gap-1 text-xs text-danger">
            <WarningCircle size={14} weight="fill" />
            {state.error}
          </span>
        )}
      </form>
    </div>
  );
}
