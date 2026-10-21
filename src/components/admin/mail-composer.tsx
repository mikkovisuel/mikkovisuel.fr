"use client";

import { useActionState, useEffect } from "react";
import { Paperclip } from "@phosphor-icons/react";
import { submitMail, type MailFormState } from "@/lib/actions/mail";
import { useFormSubmit } from "@/lib/use-form-submit";

// Écriture d'un e-mail (onglet Mail, 2026-10-21) : nouveau message, réponse,
// réponse à tous, transfert. Citation, objet « Re: / Fwd: » et en-têtes de
// fil sont ajoutés par le serveur à partir du vrai message Gmail.
const FIELD =
  "w-full rounded-lg border border-line bg-surface px-3 py-2 text-sm text-ink placeholder:text-ink-muted/70 focus:border-accent focus:outline-none focus:ring-1 focus:ring-accent";

export function MailComposer({
  mode,
  threadId,
  defaultTo = "",
  defaultCc = "",
  onDone,
}: {
  mode: "new" | "reply" | "replyAll" | "forward";
  threadId?: string;
  defaultTo?: string;
  defaultCc?: string;
  onDone?: () => void;
}) {
  const [state, formAction, pending] = useActionState<MailFormState, FormData>(submitMail, undefined);
  const { formRef, onSubmit } = useFormSubmit(formAction, { pending, state, resetOnSuccess: true });

  useEffect(() => {
    if (!pending && state?.success && onDone) {
      const timer = setTimeout(onDone, 1200);
      return () => clearTimeout(timer);
    }
  }, [pending, state, onDone]);

  return (
    <form ref={formRef} action={formAction} onSubmit={onSubmit} className="flex flex-col gap-2">
      <input type="hidden" name="mode" value={mode} />
      {threadId && <input type="hidden" name="threadId" value={threadId} />}
      <input name="to" defaultValue={defaultTo} placeholder="À (séparez les adresses par une virgule)" aria-label="Destinataires" className={FIELD} />
      <input name="cc" defaultValue={defaultCc} placeholder="Cc" aria-label="Copie" className={FIELD} />
      {mode === "new" && <input name="subject" placeholder="Objet" aria-label="Objet" className={FIELD} />}
      <textarea name="body" rows={mode === "new" ? 10 : 6} placeholder="Votre message" aria-label="Message" className={`${FIELD} resize-y`} />
      <label className="flex w-fit cursor-pointer items-center gap-2 text-sm text-ink-muted hover:text-ink">
        <Paperclip size={16} />
        <span>Joindre des fichiers (20 Mo au total)</span>
        <input type="file" name="attachments" multiple className="text-xs" />
      </label>
      {mode === "forward" && <p className="text-xs text-ink-muted">Les pièces jointes du message d&apos;origine sont transférées aussi.</p>}
      <div className="flex flex-wrap items-center gap-2">
        <button
          type="submit"
          name="intent"
          value="send"
          disabled={pending}
          className="h-9 rounded-full bg-accent px-5 text-sm font-medium text-accent-ink disabled:opacity-60"
        >
          {pending ? "Envoi…" : "Envoyer"}
        </button>
        <button
          type="submit"
          name="intent"
          value="draft"
          disabled={pending}
          formNoValidate
          className="h-9 rounded-full border border-[var(--color-outline)] px-4 text-sm text-ink disabled:opacity-60"
        >
          Enregistrer le brouillon
        </button>
        {state?.error && <span className="text-sm text-danger">{state.error}</span>}
        {state?.success && <span className="text-sm text-ink">{state.success}</span>}
      </div>
    </form>
  );
}
