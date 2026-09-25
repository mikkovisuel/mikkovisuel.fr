"use client";

import { useActionState } from "react";
import { WarningCircle } from "@phosphor-icons/react/dist/ssr";
import { useFormSubmit } from "@/lib/use-form-submit";
import type { SocialPlanFormState } from "@/lib/validation/social-plans";

// Aperçu cochable d'un plan avant application (2026-09-25). Les étapes déjà
// passées arrivent décochées et signalées, mais rien n'empêche de les
// cocher pour rattraper un plan appliqué tard.
export function PlanApplyPreview({
  action,
  steps,
  hidden,
}: {
  action: (state: SocialPlanFormState, formData: FormData) => Promise<SocialPlanFormState>;
  steps: { id: string; label: string; offset: string; dueLabel: string; past: boolean; title: string; production: string }[];
  hidden: Record<string, string>;
}) {
  const [state, formAction, pending] = useActionState(action, undefined);
  const { onSubmit } = useFormSubmit(formAction, { pending, state });

  return (
    <form action={formAction} onSubmit={onSubmit} className="grid gap-3">
      {Object.entries(hidden).map(([name, value]) => (
        <input key={name} type="hidden" name={name} value={value} />
      ))}

      <ul className="grid gap-2">
        {steps.map((step) => (
          <li key={step.id}>
            <label
              className={`flex cursor-pointer items-start gap-3 rounded-xl border p-3 transition-colors has-[:checked]:border-accent ${
                step.past ? "border-dashed border-line" : "border-line"
              }`}
            >
              <input
                type="checkbox"
                name="stepIds"
                value={step.id}
                defaultChecked={!step.past}
                className="mt-0.5 h-4 w-4 accent-[var(--color-accent)]"
              />
              <span className="min-w-0">
                <span className="flex flex-wrap items-center gap-2">
                  <span className="rounded-full border border-line px-2 py-0.5 text-xs text-ink-muted">
                    {step.offset}
                  </span>
                  <span className="font-medium text-ink">{step.title}</span>
                  {step.past && <span className="text-xs text-amber-600 dark:text-amber-400">déjà passée</span>}
                </span>
                <span className="mt-1 block text-sm text-ink-muted">
                  {step.dueLabel} · {step.production}
                </span>
              </span>
            </label>
          </li>
        ))}
      </ul>

      <div className="flex flex-wrap items-center gap-3">
        <button
          type="submit"
          disabled={pending}
          className="rounded-full bg-accent px-5 py-2.5 text-sm font-medium text-accent-ink transition-transform active:scale-[0.98] disabled:opacity-60"
        >
          {pending ? "Application..." : "Appliquer le plan"}
        </button>
        {state?.error && (
          <span className="flex items-center gap-1 text-sm text-danger">
            <WarningCircle size={16} weight="fill" />
            {state.error}
          </span>
        )}
      </div>
    </form>
  );
}
