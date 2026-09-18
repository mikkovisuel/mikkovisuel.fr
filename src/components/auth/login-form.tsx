"use client";

import { useActionState } from "react";
import Link from "next/link";
import { WarningCircle } from "@phosphor-icons/react/dist/ssr";
import type { LoginFormState } from "@/lib/validation/auth";
import { useFormSubmit } from "@/lib/use-form-submit";

export function LoginForm({
  action,
  forgotPasswordHref,
}: {
  action: (state: LoginFormState, formData: FormData) => Promise<LoginFormState>;
  forgotPasswordHref?: string;
}) {
  const [state, formAction, pending] = useActionState(action, undefined);
  const { onSubmit: formSubmit } = useFormSubmit(formAction, { pending, state });

  return (
    <form action={formAction} onSubmit={formSubmit} className="grid gap-5">
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
          className="rounded-xl border border-line bg-surface-elevated px-4 py-3 text-sm text-ink placeholder:text-ink-muted/70 focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/30"
          placeholder="vous@exemple.com"
        />
      </div>

      <div className="flex flex-col gap-2">
        <label htmlFor="password" className="text-sm font-medium text-ink">
          Mot de passe
        </label>
        <input
          id="password"
          name="password"
          type="password"
          required
          autoComplete="current-password"
          className="rounded-xl border border-line bg-surface-elevated px-4 py-3 text-sm text-ink placeholder:text-ink-muted/70 focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/30"
          placeholder="••••••••"
        />
      </div>

      {state?.error && (
        <div className="flex items-center gap-2 text-sm text-danger">
          <WarningCircle size={18} weight="fill" />
          {state.error}
        </div>
      )}

      <button
        type="submit"
        disabled={pending}
        className="inline-flex items-center justify-center rounded-full bg-accent px-6 py-3 text-sm font-medium text-accent-ink transition-transform active:scale-[0.98] disabled:opacity-60"
      >
        {pending ? "Connexion..." : "Se connecter"}
      </button>

      {forgotPasswordHref && (
        <Link
          href={forgotPasswordHref}
          className="text-center text-sm text-ink-muted transition-colors hover:text-ink"
        >
          Mot de passe oublié ?
        </Link>
      )}
    </form>
  );
}
