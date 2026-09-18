"use client";

import { useActionState, useRef, useEffect, useState } from "react";
import { WarningCircle } from "@phosphor-icons/react/dist/ssr";
import { FilePicker } from "@/components/file-picker";
import { uploadCompanyDocument } from "@/lib/actions/company-documents";
import { COMPANY_DOCUMENT_CATEGORY, COMPANY_DOCUMENT_CATEGORY_LABELS } from "@/lib/dropdown-lists";
import { useFormSubmit } from "@/lib/use-form-submit";

export function CompanyDocumentUploadForm() {
  const [state, formAction, pending] = useActionState(uploadCompanyDocument, undefined);
  const { onSubmit: formSubmit } = useFormSubmit(formAction, { pending, state });
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
    <form ref={formRef} action={formAction} onSubmit={formSubmit} className="flex flex-wrap items-end gap-3">
      <div className="flex flex-col gap-2">
        <label htmlFor="category" className="text-sm font-medium text-ink">
          Catégorie
        </label>
        <select
          id="category"
          name="category"
          defaultValue={COMPANY_DOCUMENT_CATEGORY.COMMERCIAL}
          className="rounded-xl border border-line bg-surface-elevated px-3 py-2.5 text-sm text-ink focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/30"
        >
          {Object.values(COMPANY_DOCUMENT_CATEGORY).map((category) => (
            <option key={category} value={category}>
              {COMPANY_DOCUMENT_CATEGORY_LABELS[category]}
            </option>
          ))}
        </select>
      </div>
      <div className="flex flex-col gap-2">
        <span className="text-sm font-medium text-ink">Fichier</span>
        <FilePicker
          key={resetKey}
          name="file"
          accept="application/pdf,image/png,image/jpeg"
          required
          helperText="PDF, JPG ou PNG · 20 Mo max"
        />
      </div>
      <button
        type="submit"
        disabled={pending}
        className="rounded-full border border-line px-4 py-2 text-sm text-ink transition-colors hover:border-accent hover:bg-accent hover:text-accent-ink disabled:opacity-60"
      >
        {pending ? "Envoi..." : "Ajouter"}
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
