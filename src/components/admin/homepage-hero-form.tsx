"use client";

import { useActionState, useRef, useEffect, useState } from "react";
import { WarningCircle, CheckCircle } from "@phosphor-icons/react/dist/ssr";
import { FilePicker } from "@/components/file-picker";
import { updateHomepageHero } from "@/lib/actions/homepage";

export function HomepageHeroForm() {
  const [state, formAction, pending] = useActionState(updateHomepageHero, undefined);
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
    <form ref={formRef} action={formAction} className="grid gap-4 sm:grid-cols-2">
      <div className="flex flex-col gap-2">
        <span className="text-sm font-medium text-ink">
          Image principale (1200×900 px conseillé, ratio 4:3)
        </span>
        <FilePicker key={`main-${resetKey}`} name="main" accept="image/png,image/jpeg,image/webp" />
      </div>
      <div className="flex flex-col gap-2">
        <span className="text-sm font-medium text-ink">
          Image de détail (600×800 px conseillé, ratio 3:4)
        </span>
        <FilePicker key={`detail-${resetKey}`} name="detail" accept="image/png,image/jpeg,image/webp" />
      </div>
      {state?.error && (
        <div className="flex items-center gap-2 text-sm text-danger sm:col-span-2">
          <WarningCircle size={16} weight="fill" />
          {state.error}
        </div>
      )}
      {state?.success && (
        <div className="flex items-center gap-2 text-sm text-accent sm:col-span-2">
          <CheckCircle size={16} weight="fill" />
          Image enregistrée.
        </div>
      )}
      <div className="sm:col-span-2">
        <button
          type="submit"
          disabled={pending}
          className="inline-flex items-center rounded-full bg-accent px-6 py-3 text-sm font-medium text-accent-ink transition-transform active:scale-[0.98] disabled:opacity-60"
        >
          {pending ? "Enregistrement..." : "Enregistrer"}
        </button>
      </div>
    </form>
  );
}
