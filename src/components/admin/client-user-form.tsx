"use client";

import { useActionState, useRef, useEffect } from "react";
import { WarningCircle } from "@phosphor-icons/react/dist/ssr";
import type { ClientUserFormState } from "@/lib/validation/client";

export function ClientUserForm({
  action,
}: {
  action: (state: ClientUserFormState, formData: FormData) => Promise<ClientUserFormState>;
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
    <form ref={formRef} action={formAction} className="grid gap-4 sm:grid-cols-3">
      <div className="flex flex-col gap-2">
        <label htmlFor="cu-name" className="text-sm font-medium text-ink">
          Nom
        </label>
        <input
          id="cu-name"
          name="name"
          type="text"
          required
          className="rounded-xl border border-line bg-surface-elevated px-4 py-2.5 text-sm text-ink placeholder:text-ink-muted/70 focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/30"
          placeholder="Nom du contact"
        />
      </div>

      <div className="flex flex-col gap-2">
        <label htmlFor="cu-email" className="text-sm font-medium text-ink">
          Email
        </label>
        <input
          id="cu-email"
          name="email"
          type="email"
          required
          className="rounded-xl border border-line bg-surface-elevated px-4 py-2.5 text-sm text-ink placeholder:text-ink-muted/70 focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/30"
          placeholder="contact@client.com"
        />
      </div>

      <div className="flex flex-col gap-2">
        <label htmlFor="cu-password" className="text-sm font-medium text-ink">
          Mot de passe
        </label>
        <input
          id="cu-password"
          name="password"
          type="text"
          required
          minLength={8}
          className="rounded-xl border border-line bg-surface-elevated px-4 py-2.5 text-sm text-ink placeholder:text-ink-muted/70 focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/30"
          placeholder="8 caractères minimum"
        />
      </div>

      {state?.error && (
        <div className="flex items-center gap-2 text-sm text-danger sm:col-span-3">
          <WarningCircle size={18} weight="fill" />
          {state.error}
        </div>
      )}

      <div className="sm:col-span-3">
        <button
          type="submit"
          disabled={pending}
          className="inline-flex items-center rounded-full border border-line px-5 py-2.5 text-sm font-medium text-ink transition-colors hover:border-accent hover:bg-accent hover:text-accent-ink disabled:opacity-60"
        >
          {pending ? "Ajout..." : "Ajouter ce compte"}
        </button>
      </div>
    </form>
  );
}
