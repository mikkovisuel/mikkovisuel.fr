"use client";

import { useActionState } from "react";
import { WarningCircle, CheckCircle } from "@phosphor-icons/react/dist/ssr";
import { FilePicker } from "@/components/file-picker";
import type { PillarFormState } from "@/lib/validation/portfolio";

export function PillarForm({
  action,
  defaultValues,
  submitLabel,
  coverRequired,
}: {
  action: (state: PillarFormState, formData: FormData) => Promise<PillarFormState>;
  defaultValues?: { title: string; description: string };
  submitLabel: string;
  coverRequired: boolean;
}) {
  const [state, formAction, pending] = useActionState(action, undefined);

  return (
    <form action={formAction} className="grid max-w-lg gap-5">
      <div className="flex flex-col gap-2">
        <label htmlFor="title" className="text-sm font-medium text-ink">
          Titre du pilier
        </label>
        <input
          id="title"
          name="title"
          type="text"
          required
          defaultValue={defaultValues?.title}
          className="rounded-xl border border-line bg-surface-elevated px-4 py-3 text-sm text-ink placeholder:text-ink-muted/70 focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/30"
          placeholder="Ex : Shootings Studio"
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
          required
          defaultValue={defaultValues?.description}
          className="resize-none rounded-xl border border-line bg-surface-elevated px-4 py-3 text-sm text-ink placeholder:text-ink-muted/70 focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/30"
          placeholder="Une phrase qui présente ce pilier"
        />
      </div>

      <div className="flex flex-col gap-2">
        <span className="text-sm font-medium text-ink">
          Image de couverture {!coverRequired && "(laisser vide pour conserver l'actuelle)"}
        </span>
        <FilePicker
          name="cover"
          accept="image/png,image/jpeg,image/webp"
          required={coverRequired}
        />
      </div>

      {state?.error && (
        <div className="flex items-center gap-2 text-sm text-danger">
          <WarningCircle size={18} weight="fill" />
          {state.error}
        </div>
      )}
      {/* Ce composant sert aussi la création (redirige aussitôt, ce
          `success` ne s'y affiche donc jamais) et l'édition (reste en
          place, où l'absence de retour visuel après un enregistrement
          était le vrai défaut signalé le 2026-07-31). */}
      {state?.success && (
        <div className="flex items-center gap-2 text-sm text-accent">
          <CheckCircle size={16} weight="fill" />
          Pilier enregistré.
        </div>
      )}

      <div>
        <button
          type="submit"
          disabled={pending}
          className="inline-flex items-center rounded-full bg-accent px-6 py-3 text-sm font-medium text-accent-ink transition-transform active:scale-[0.98] disabled:opacity-60"
        >
          {pending ? "Enregistrement..." : submitLabel}
        </button>
      </div>
    </form>
  );
}
