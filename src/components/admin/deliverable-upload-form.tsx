"use client";

import { useActionState, useRef, useEffect, useState } from "react";
import { WarningCircle } from "@phosphor-icons/react/dist/ssr";
import { FilePicker } from "@/components/file-picker";
import type { FileUploadState } from "@/lib/actions/files";

export function DeliverableUploadForm({
  action,
}: {
  action: (state: FileUploadState, formData: FormData) => Promise<FileUploadState>;
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
    <form ref={formRef} action={formAction} className="flex flex-col gap-3">
      <FilePicker
        key={resetKey}
        name="file"
        required
        multiple
        dropzone
        helperText="PDF, JPG, PNG, WEBP, MP4, ZIP · 500 Mo max par fichier"
      />
      <div className="flex flex-wrap items-end gap-3">
        <label className="flex flex-col gap-1 text-xs text-ink-muted">
          Type
          <select
            name="kind"
            defaultValue="final"
            className="rounded-xl border border-line bg-surface-elevated px-3 py-1.5 text-xs text-ink focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/30"
          >
            <option value="final">Livrable final</option>
            <option value="bat">BAT à valider (filigrané côté client)</option>
          </select>
        </label>
        <button
          type="submit"
          disabled={pending}
          className="rounded-full border border-line px-3 py-1.5 text-xs text-ink transition-colors hover:border-accent hover:bg-accent hover:text-accent-ink disabled:opacity-60"
        >
          {pending ? "Envoi..." : "Ajouter des livrables"}
        </button>
        {state?.error && (
          <span className="flex items-center gap-1 text-xs text-danger">
            <WarningCircle size={14} weight="fill" />
            {state.error}
          </span>
        )}
      </div>
    </form>
  );
}
