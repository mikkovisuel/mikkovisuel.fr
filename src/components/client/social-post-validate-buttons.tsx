"use client";

import { useActionState, useState, useTransition } from "react";
import { WarningCircle } from "@phosphor-icons/react/dist/ssr";
import { validateSocialPost, refuseSocialPost } from "@/lib/actions/social-posts";
import { useFormSubmit } from "@/lib/use-form-submit";

// Même interaction que ValidateRefuseButtons (BAT des tâches), branchée sur
// les publications réseaux sociaux : valider en un clic, ou refuser avec un
// motif obligatoire — le client dit ce qui ne va pas, Mikko sait quoi
// corriger.
export function SocialPostValidateButtons({
  postId,
  readOnly = false,
}: {
  postId: string;
  readOnly?: boolean;
}) {
  const [showRefuseForm, setShowRefuseForm] = useState(false);
  const [isValidating, startValidateTransition] = useTransition();
  const [state, formAction, refusePending] = useActionState(refuseSocialPost.bind(null, postId), undefined);
  const { onSubmit: formSubmit } = useFormSubmit(formAction, { pending: refusePending, state });

  if (readOnly) {
    return <p className="text-sm text-ink-muted">Validation désactivée dans l&apos;espace de démonstration.</p>;
  }

  if (showRefuseForm) {
    return (
      <form action={formAction} onSubmit={formSubmit} className="flex flex-col gap-2">
        <textarea
          name="reason"
          required
          rows={3}
          placeholder="Ce qu'il faut modifier (obligatoire)"
          className="resize-none rounded-xl border border-line bg-surface px-3 py-2 text-sm text-ink placeholder:text-ink-muted/70 focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/30"
        />
        {state?.error && (
          <span className="flex items-center gap-1 text-sm text-danger">
            <WarningCircle size={16} weight="fill" />
            {state.error}
          </span>
        )}
        <div className="flex gap-2">
          <button
            type="submit"
            disabled={refusePending}
            className="rounded-full bg-accent px-4 py-2 text-sm font-medium text-accent-ink transition-transform active:scale-[0.98] disabled:opacity-60"
          >
            {refusePending ? "Envoi..." : "Demander la modification"}
          </button>
          <button
            type="button"
            onClick={() => setShowRefuseForm(false)}
            className="rounded-full border border-line px-4 py-2 text-sm text-ink-muted transition-colors hover:text-ink"
          >
            Annuler
          </button>
        </div>
      </form>
    );
  }

  return (
    <div className="flex flex-wrap gap-2">
      <button
        type="button"
        disabled={isValidating}
        onClick={() => startValidateTransition(() => validateSocialPost(postId))}
        className="rounded-full bg-accent px-4 py-2 text-sm font-medium text-accent-ink transition-transform active:scale-[0.98] disabled:opacity-60"
      >
        {isValidating ? "..." : "Valider la publication"}
      </button>
      <button
        type="button"
        onClick={() => setShowRefuseForm(true)}
        className="rounded-full border border-line px-4 py-2 text-sm text-ink-muted transition-colors hover:border-accent hover:bg-accent hover:text-accent-ink"
      >
        Demander une modification
      </button>
    </div>
  );
}
