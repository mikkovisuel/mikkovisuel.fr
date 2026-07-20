"use client";

import { useActionState } from "react";
import { PaperPlaneTilt, WarningCircle } from "@phosphor-icons/react/dist/ssr";
import { sendDeliverablesByEmail } from "@/lib/actions/files";

const SENT_AT_FORMATTER = new Intl.DateTimeFormat("fr-FR", {
  day: "2-digit",
  month: "2-digit",
  year: "numeric",
});

export function SendDeliverablesButton({
  taskId,
  sentAt,
  canSend,
  disabledReason,
}: {
  taskId: string;
  sentAt: Date | null;
  canSend: boolean;
  disabledReason: string;
}) {
  const [state, formAction, pending] = useActionState(
    sendDeliverablesByEmail.bind(null, taskId),
    undefined,
  );

  return (
    <div className="flex flex-wrap items-center gap-3">
      <p className="flex items-center gap-1.5 text-sm text-ink-muted">
        <PaperPlaneTilt
          size={14}
          weight={sentAt ? "fill" : "regular"}
          className={sentAt ? "text-accent" : "text-ink-muted"}
        />
        {sentAt ? `Livrables envoyés le ${SENT_AT_FORMATTER.format(sentAt)}` : "Livrables non envoyés"}
      </p>
      {canSend ? (
        <form action={formAction}>
          <button
            type="submit"
            disabled={pending}
            className="rounded-full border border-line px-3 py-1.5 text-xs text-ink transition-colors hover:border-accent hover:bg-accent hover:text-accent-ink disabled:opacity-60"
          >
            {pending ? "Envoi..." : "Envoyer les livrables finaux"}
          </button>
        </form>
      ) : (
        <span className="text-xs text-ink-muted">{disabledReason}</span>
      )}
      {state?.error && (
        <span className="flex items-center gap-1 text-xs text-danger">
          <WarningCircle size={14} weight="fill" />
          {state.error}
        </span>
      )}
    </div>
  );
}
