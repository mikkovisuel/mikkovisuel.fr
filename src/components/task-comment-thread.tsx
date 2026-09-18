"use client";

import { useActionState, useRef, useEffect } from "react";
import { WarningCircle } from "@phosphor-icons/react/dist/ssr";
import { LinkifiedText } from "@/components/linkified-text";
import type { CommentFormState } from "@/lib/validation/comment";
import { useFormSubmit } from "@/lib/use-form-submit";

const DATE_TIME_FORMATTER = new Intl.DateTimeFormat("fr-FR", {
  day: "numeric",
  month: "long",
  year: "numeric",
  hour: "2-digit",
  minute: "2-digit",
});

interface CommentEntry {
  id: string;
  authorName: string;
  authorType: string;
  body: string;
  createdAt: Date;
}

export function TaskCommentThread({
  comments,
  currentAuthorType,
  action,
  readOnly = false,
}: {
  comments: CommentEntry[];
  /** Le rôle courant (ADMIN ou CLIENT_USER), pour distinguer visuellement ses propres messages. */
  currentAuthorType: string;
  action: (state: CommentFormState, formData: FormData) => Promise<CommentFormState>;
  readOnly?: boolean;
}) {
  const [state, formAction, pending] = useActionState(action, undefined);
  const { onSubmit: formSubmit } = useFormSubmit(formAction, { pending, state });
  const formRef = useRef<HTMLFormElement>(null);
  const wasPending = useRef(false);

  useEffect(() => {
    if (wasPending.current && !pending && !state?.error) {
      formRef.current?.reset();
    }
    wasPending.current = pending;
  }, [pending, state]);

  return (
    <div className="flex flex-col gap-4">
      {comments.length === 0 ? (
        <p className="text-sm text-ink-muted">Aucun commentaire pour l&apos;instant.</p>
      ) : (
        <ul className="flex flex-col gap-3">
          {comments.map((comment) => {
            const isMine = comment.authorType === currentAuthorType;
            return (
              <li
                key={comment.id}
                className={`rounded-2xl border p-3 ${
                  isMine ? "border-accent/40 bg-accent/5" : "border-line bg-surface-elevated"
                }`}
              >
                <div className="flex items-baseline justify-between gap-3">
                  <span className="text-sm font-medium text-ink">{comment.authorName}</span>
                  <span className="shrink-0 text-xs text-ink-muted">
                    {DATE_TIME_FORMATTER.format(comment.createdAt)}
                  </span>
                </div>
                <p className="mt-1 whitespace-pre-wrap text-sm text-ink-muted">
                  <LinkifiedText text={comment.body} />
                </p>
              </li>
            );
          })}
        </ul>
      )}

      {readOnly ? (
        <p className="text-sm text-ink-muted">
          Les commentaires sont désactivés dans l&apos;espace de démonstration.
        </p>
      ) : (
        <form ref={formRef} action={formAction} onSubmit={formSubmit} className="flex flex-col gap-2">
          <textarea
            name="body"
            required
            rows={3}
            placeholder="Écrire un commentaire..."
            className="resize-none rounded-xl border border-line bg-surface-elevated px-3 py-2 text-sm text-ink placeholder:text-ink-muted/70 focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/30"
          />
          {state?.error && (
            <span className="flex items-center gap-1 text-sm text-danger">
              <WarningCircle size={16} weight="fill" />
              {state.error}
            </span>
          )}
          <div>
            <button
              type="submit"
              disabled={pending}
              className="rounded-full bg-accent px-4 py-2 text-sm font-medium text-accent-ink transition-transform active:scale-[0.98] disabled:opacity-60"
            >
              {pending ? "Envoi..." : "Commenter"}
            </button>
          </div>
        </form>
      )}
    </div>
  );
}
