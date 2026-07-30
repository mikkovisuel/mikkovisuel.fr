"use client";

import { useActionState, useRef, useEffect, useState } from "react";
import { WarningCircle } from "@phosphor-icons/react/dist/ssr";
import type { ContactFormState, ContactAccessMode } from "@/lib/validation/client";

const ACCESS_OPTIONS: { value: ContactAccessMode; label: string; hint: string }[] = [
  {
    value: "none",
    label: "Aucun accès",
    hint: "Simple entrée du carnet d'adresses. Le contact ne peut pas se connecter.",
  },
  {
    value: "invite",
    label: "Ouvrir et inviter",
    hint: "Le contact reçoit un email avec un lien pour choisir lui-même son mot de passe.",
  },
  {
    value: "password",
    label: "Ouvrir avec un mot de passe",
    hint: "Vous définissez le mot de passe et le transmettez vous-même au contact.",
  },
];

export function ContactForm({
  action,
  onSuccess,
}: {
  action: (state: ContactFormState, formData: FormData) => Promise<ContactFormState>;
  /** Appelé après une création réussie — sert à refermer la modale
   * (voir NewContactButton). Absent = formulaire en flux, simple reset. */
  onSuccess?: () => void;
}) {
  const [state, formAction, pending] = useActionState(action, undefined);
  const [access, setAccess] = useState<ContactAccessMode>("none");
  const formRef = useRef<HTMLFormElement>(null);
  const wasPending = useRef(false);

  useEffect(() => {
    if (wasPending.current && !pending && !state?.error) {
      formRef.current?.reset();
      setAccess("none");
      onSuccess?.();
    }
    wasPending.current = pending;
  }, [pending, state, onSuccess]);

  const fieldClass =
    "rounded-xl border border-line bg-surface-elevated px-4 py-2.5 text-sm text-ink placeholder:text-ink-muted/70 focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/30";

  const needsEmail = access !== "none";

  return (
    <form ref={formRef} action={formAction} className="grid gap-4 sm:grid-cols-3">
      <div className="flex flex-col gap-2">
        <label htmlFor="ct-name" className="text-sm font-medium text-ink">
          Nom
        </label>
        <input
          id="ct-name"
          name="name"
          type="text"
          required
          className={fieldClass}
          placeholder="Nom du contact"
        />
      </div>

      <div className="flex flex-col gap-2">
        <label htmlFor="ct-email" className="text-sm font-medium text-ink">
          Email {!needsEmail && <span className="text-ink-muted">(facultatif)</span>}
        </label>
        <input
          id="ct-email"
          name="email"
          type="email"
          required={needsEmail}
          className={fieldClass}
          placeholder="contact@client.com"
        />
      </div>

      <div className="flex flex-col gap-2">
        <label htmlFor="ct-phone" className="text-sm font-medium text-ink">
          Téléphone <span className="text-ink-muted">(facultatif)</span>
        </label>
        <input
          id="ct-phone"
          name="phone"
          type="tel"
          className={fieldClass}
          placeholder="06 12 34 56 78"
        />
      </div>

      <div className="flex flex-col gap-2 sm:col-span-3">
        <label htmlFor="ct-role" className="text-sm font-medium text-ink">
          Fonction <span className="text-ink-muted">(facultatif)</span>
        </label>
        <input
          id="ct-role"
          name="role"
          type="text"
          className={fieldClass}
          placeholder="Directeur, DJ, photographe..."
        />
      </div>

      <fieldset className="flex flex-col gap-2 sm:col-span-3">
        <legend className="mb-2 text-sm font-medium text-ink">Espace client</legend>
        <div className="grid gap-2 sm:grid-cols-3">
          {ACCESS_OPTIONS.map((option) => (
            <label
              key={option.value}
              className={`flex cursor-pointer flex-col gap-1 rounded-xl border p-3 transition-colors ${
                access === option.value
                  ? "border-accent bg-accent/10"
                  : "border-line hover:border-accent/50"
              }`}
            >
              <span className="flex items-center gap-2 text-sm font-medium text-ink">
                <input
                  type="radio"
                  name="access"
                  value={option.value}
                  checked={access === option.value}
                  onChange={() => setAccess(option.value)}
                  className="accent-[var(--color-accent)]"
                />
                {option.label}
              </span>
              <span className="text-xs text-ink-muted">{option.hint}</span>
            </label>
          ))}
        </div>
      </fieldset>

      {access === "password" && (
        <div className="flex flex-col gap-2 sm:col-span-3">
          <label htmlFor="ct-password" className="text-sm font-medium text-ink">
            Mot de passe
          </label>
          <input
            id="ct-password"
            name="password"
            type="text"
            required
            minLength={8}
            className={fieldClass}
            placeholder="8 caractères minimum"
          />
        </div>
      )}

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
          {pending ? "Ajout..." : "Ajouter ce contact"}
        </button>
      </div>
    </form>
  );
}
