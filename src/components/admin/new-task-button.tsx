"use client";

import { useCallback, useState } from "react";
import { Plus } from "@phosphor-icons/react/dist/ssr";
import { Modal } from "@/components/admin/modal";
import { TaskForm } from "@/components/task-form";
import type { TaskFormState } from "@/lib/validation/task";

interface DropdownOption {
  slug: string;
  label: string;
  color: string;
}

// Même parti pris que `NewContactButton` : formulaire en modale plutôt qu'en
// bas de la section Tâches de la fiche client.
export function NewTaskButton({
  action,
  typeOptions,
  formatOptions,
}: {
  action: (state: TaskFormState, formData: FormData) => Promise<TaskFormState>;
  typeOptions: DropdownOption[];
  formatOptions: DropdownOption[];
}) {
  const [open, setOpen] = useState(false);
  const close = useCallback(() => setOpen(false), []);

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="inline-flex items-center gap-2 rounded-full border border-line px-4 py-2 text-sm font-medium text-ink transition-colors hover:border-accent hover:bg-accent hover:text-accent-ink"
      >
        <Plus size={16} weight="bold" />
        Créer une tâche
      </button>

      <Modal open={open} onClose={close} title="Nouvelle tâche">
        <TaskForm
          action={action}
          typeOptions={typeOptions}
          formatOptions={formatOptions}
          onSuccess={close}
        />
      </Modal>
    </>
  );
}
