"use client";

import { useActionState } from "react";
import { WarningCircle } from "@phosphor-icons/react/dist/ssr";
import { MultiSelectChips } from "@/components/multi-select-chips";
import type { TaskFormState } from "@/lib/validation/task";

interface DropdownOption {
  slug: string;
  label: string;
  color: string;
}

export function TaskEditForm({
  action,
  typeOptions,
  formatOptions,
  defaultValues,
}: {
  action: (state: TaskFormState, formData: FormData) => Promise<TaskFormState>;
  typeOptions: DropdownOption[];
  formatOptions: DropdownOption[];
  defaultValues: {
    title: string;
    description: string;
    eventDate: string;
    dueDate: string;
    types: string[];
    formats: string[];
  };
}) {
  const [state, formAction, pending] = useActionState(action, undefined);

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
          rows={3}
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
          className="rounded-xl border border-line bg-surface-elevated px-4 py-2.5 text-sm text-ink focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/30"
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
