"use client";

import { useActionState, useRef, useEffect } from "react";
import { WarningCircle } from "@phosphor-icons/react/dist/ssr";
import { ColorSelect } from "@/components/admin/color-select";
import type { DropdownItemFormState } from "@/lib/validation/dropdown";

export function NewDropdownItemForm({
  action,
}: {
  action: (state: DropdownItemFormState, formData: FormData) => Promise<DropdownItemFormState>;
}) {
  const [state, formAction, pending] = useActionState(action, undefined);
  const formRef = useRef<HTMLFormElement>(null);
  const wasPending = useRef(false);

  useEffect(() => {
    if (wasPending.current && !pending && !state?.error) {
      formRef.current?.reset();
    }
    wasPending.current = pending;
  }, [pending, state]);

  return (
    <form ref={formRef} action={formAction} className="flex flex-wrap items-center gap-3">
      <input
        name="label"
        required
        placeholder="Nouveau libellé"
        className="min-w-0 flex-1 rounded-xl border border-line bg-surface-elevated px-3 py-2.5 text-sm text-ink placeholder:text-ink-muted/70 focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/30"
      />
      <ColorSelect name="color" defaultValue="slate" />
      <button
        type="submit"
        disabled={pending}
        className="rounded-full bg-accent px-5 py-2.5 text-sm font-medium text-accent-ink transition-transform active:scale-[0.98] disabled:opacity-60"
      >
        {pending ? "Ajout..." : "Ajouter"}
      </button>
      {state?.error && (
        <span className="flex items-center gap-1 text-sm text-danger">
          <WarningCircle size={16} weight="fill" />
          {state.error}
        </span>
      )}
    </form>
  );
}
