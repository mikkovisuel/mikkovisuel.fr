"use client";

import { useActionState, useEffect, useState } from "react";
import { WarningCircle } from "@phosphor-icons/react/dist/ssr";
import { MultiSelectChips } from "@/components/multi-select-chips";
import type { TaskFormState } from "@/lib/validation/task";
import { checkTaskDueDateCapacity } from "@/lib/actions/capacity";
import type { DueDateCapacityCheck } from "@/lib/capacity";
import { formatHoursFromMinutes } from "@/lib/time-tracking";

interface DropdownOption {
  slug: string;
  label: string;
  color: string;
}

export function TaskEditForm({
  action,
  taskId,
  typeOptions,
  formatOptions,
  defaultValues,
}: {
  action: (state: TaskFormState, formData: FormData) => Promise<TaskFormState>;
  taskId?: string;
  typeOptions: DropdownOption[];
  formatOptions: DropdownOption[];
  defaultValues: {
    title: string;
    description: string;
    eventDate: string;
    dueDate: string;
    estimatedMinutes: string;
    types: string[];
    formats: string[];
  };
}) {
  const [state, formAction, pending] = useActionState(action, undefined);
  const [dueDate, setDueDate] = useState(defaultValues.dueDate);
  const [capacityCheck, setCapacityCheck] = useState<DueDateCapacityCheck | null>(null);

  // Alerte de capacité à la saisie de l'échéance (demande du 2026-07-31) :
  // vérifiée côté serveur avec un léger débounce plutôt qu'à chaque frappe,
  // et seulement quand une capacité a réellement été saisie sur la période
  // (`coverageDays > 0`) — sans donnée de capacité, on ne peut rien conclure,
  // donc pas d'alerte plutôt qu'une fausse alerte silencieuse.
  useEffect(() => {
    if (!dueDate) return;
    let cancelled = false;
    const timer = setTimeout(() => {
      checkTaskDueDateCapacity(dueDate, taskId).then((result) => {
        if (!cancelled) setCapacityCheck(result);
      });
    }, 400);
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [dueDate, taskId]);

  // Pas d'alerte tant qu'il n'y a pas d'échéance saisie : dérivé au rendu
  // plutôt que remis à `null` depuis l'effet ci-dessus.
  const activeCapacityCheck = dueDate ? capacityCheck : null;

  return (
    <form action={formAction} className="grid gap-4">
      <div className="flex flex-col gap-2">
        <label htmlFor="title" className="text-sm font-medium text-ink">
          Titre
        </label>
        <input
          id="title"
          name="title"
          required
          defaultValue={defaultValues.title}
          className="rounded-xl border border-line bg-surface-elevated px-4 py-2.5 text-sm text-ink placeholder:text-ink-muted/70 focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/30"
        />
      </div>
      <div className="flex flex-col gap-2">
        <label htmlFor="description" className="text-sm font-medium text-ink">
          Description
        </label>
        <textarea
          id="description"
          name="description"
          rows={5}
          defaultValue={defaultValues.description}
          className="resize-none rounded-xl border border-line bg-surface-elevated px-4 py-2.5 text-sm text-ink placeholder:text-ink-muted/70 focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/30"
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
          defaultValue={defaultValues.eventDate}
          className="rounded-xl border border-line bg-surface-elevated px-4 py-2.5 text-sm text-ink focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/30"
        />
      </div>
      <div className="flex flex-col gap-2">
        <label htmlFor="dueDate" className="text-sm font-medium text-ink">
          Échéance (livraison)
        </label>
        <input
          id="dueDate"
          name="dueDate"
          type="date"
          defaultValue={defaultValues.dueDate}
          onChange={(event) => setDueDate(event.target.value)}
          className="rounded-xl border border-line bg-surface-elevated px-4 py-2.5 text-sm text-ink focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/30"
        />
        {activeCapacityCheck && activeCapacityCheck.coverageDays > 0 && activeCapacityCheck.level !== "ok" && (
          <p
            className={`flex items-center gap-2 text-sm ${
              activeCapacityCheck.level === "overload" ? "text-danger" : "text-amber-600 dark:text-amber-400"
            }`}
          >
            <WarningCircle size={16} weight="fill" />
            {activeCapacityCheck.level === "overload"
              ? `Surcharge : la capacité restante d'ici cette échéance est dépassée de ${formatHoursFromMinutes(-activeCapacityCheck.remainingMinutes)}.`
              : `Charge proche de la capacité disponible d'ici cette échéance (reste ${formatHoursFromMinutes(activeCapacityCheck.remainingMinutes)}).`}
          </p>
        )}
      </div>
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
          defaultValue={defaultValues.estimatedMinutes}
          className="w-32 rounded-xl border border-line bg-surface-elevated px-4 py-2.5 text-sm text-ink placeholder:text-ink-muted/70 focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/30"
        />
      </div>
      {typeOptions.length > 0 && (
        <div className="flex flex-col gap-2">
          <span className="text-sm font-medium text-ink">Type</span>
          <MultiSelectChips name="types" options={typeOptions} defaultValues={defaultValues.types} />
        </div>
      )}
      {formatOptions.length > 0 && (
        <div className="flex flex-col gap-2">
          <span className="text-sm font-medium text-ink">Formats</span>
          <MultiSelectChips
            name="formats"
            options={formatOptions}
            defaultValues={defaultValues.formats}
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
          className="inline-flex items-center rounded-full bg-accent px-6 py-3 text-sm font-medium text-accent-ink transition-transform active:scale-[0.98] disabled:opacity-60"
        >
          {pending ? "Enregistrement..." : "Enregistrer"}
        </button>
      </div>
    </form>
  );
}
