"use client";

import { useActionState } from "react";
import { CheckCircle } from "@phosphor-icons/react/dist/ssr";
import type { RequestResetState } from "@/lib/actions/password-reset";

export function RequestResetForm({
  action,
}: {
  action: (state: RequestResetState, formData: FormData) => Promise<RequestResetState>;
}) {
  const [state, formAction, pending] = useActionState(action, undefined);

  if (state?.message) {
    return (
      <div className="flex items-start gap-3 rounded-2xl border border-line bg-surface p-4">
        <CheckCircle size={20} weight="fill" className="mt-0.5 shrink-0 text-accent" />
        <p className="text-sm text-ink">{state.message}</p>
      </div>
    );
  }

  return (
    <form action={formAction} className="grid gap-5">
      <div className="flex flex-col gap-2">
        <label htmlFor="email" className="text-sm font-medium text-ink">
          Email
        </label>
        <input
          id="email"
          name="email"
          type="email"
          required
          autoComplete="email"
          className="rounded-xl border border-line bg-surface px-4 py-3 text-sm text-ink placeholder:text-ink-muted/70 focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/30"
          placeholder="vous@exemple.com"
        />
      </div>

      <button
        type="submit"
        disabled={pending}
        className="inline-flex items-center justify-center rounded-full bg-accent px-6 py-3 text-sm font-medium text-accent-ink transition-transform active:scale-[0.98] disabled:opacity-60"
      >
        {pending ? "Envoi..." : "Envoyer le lien"}
      </button>
    </form>
  );
}
