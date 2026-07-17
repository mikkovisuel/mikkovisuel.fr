"use client";

import { useActionState, useRef, useEffect, useState } from "react";
import { WarningCircle } from "@phosphor-icons/react/dist/ssr";
import { FilePicker } from "@/components/file-picker";
import type { MediaItemFormState } from "@/lib/validation/portfolio";

export function MediaItemUploadForm({
  action,
}: {
  action: (state: MediaItemFormState, formData: FormData) => Promise<MediaItemFormState>;
}) {
  const [state, formAction, pending] = useActionState(action, undefined);
  const formRef = useRef<HTMLFormElement>(null);
  const wasPending = useRef(false);
  const [resetKey, setResetKey] = useState(0);

  useEffect(() => {
    if (wasPending.current && !pending && !state?.error) {
      formRef.current?.reset();
      setResetKey((key) => key + 1);
    }
    wasPending.current = pending;
  }, [pending, state]);

  return (
    <form ref={formRef} action={formAction} className="flex flex-wrap items-center gap-3">
      <input
        name="title"
        required
        placeholder="Titre de la photo/vidéo"
        className="min-w-0 flex-1 rounded-xl border border-line bg-surface-elevated px-3 py-2.5 text-sm text-ink placeholder:text-ink-muted/70 focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/30"
      />
      <select
        name="aspectRatio"
        defaultValue="3:4"
        className="rounded-xl border border-line bg-surface-elevated px-3 py-2.5 text-sm text-ink focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/30"
      >
        <option value="3:4">Photo 3:4</option>
        <option value="9:16">Photo 9:16</option>
      </select>
      <FilePicker
        key={resetKey}
        name="file"
        required
        accept="image/png,image/jpeg,image/webp,video/mp4,video/webm"
      />
      <button
        type="submit"
        disabled={pending}
        className="rounded-full bg-accent px-5 py-2.5 text-sm font-medium text-accent-ink transition-transform active:scale-[0.98] disabled:opacity-60"
      >
        {pending ? "Envoi..." : "Ajouter"}
      </button>
      {state?.error && (
        <span className="flex items-center gap-1 text-sm text-danger">
          <WarningCircle size={16} weight="fill" />
          {state.error}
        </span>
      )}
      <p className="w-full text-xs text-ink-muted">
        Format à choisir pour une photo (3:4 ou 9:16). Les vidéos sont
        automatiquement au format 9:16.
      </p>
    </form>
  );
}
