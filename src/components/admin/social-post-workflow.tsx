"use client";

import { useActionState, useTransition } from "react";
import { WarningCircle, PaperPlaneTilt, CheckCircle, ArrowSquareOut } from "@phosphor-icons/react/dist/ssr";
import {
  setSocialPostDraftStatus,
  submitSocialPostForValidation,
  validateSocialPostByAdmin,
  markSocialPostPublished,
  setSocialPostPublishedUrl,
} from "@/lib/actions/social-posts";
import { SOCIAL_POST_STATUS_META, type SocialPostStatus } from "@/lib/social-posts";
import { useFormSubmit } from "@/lib/use-form-submit";

const PRIMARY =
  "inline-flex items-center gap-2 rounded-full bg-accent px-4 py-2 text-sm font-medium text-accent-ink transition-transform active:scale-[0.98] disabled:opacity-60";
const SECONDARY =
  "inline-flex items-center gap-2 rounded-full border border-line px-4 py-2 text-sm text-ink transition-colors hover:border-accent hover:bg-accent hover:text-accent-ink disabled:opacity-60";
const INPUT =
  "min-w-0 flex-1 rounded-xl border border-line bg-surface-elevated px-3 py-2 text-sm text-ink placeholder:text-ink-muted/70 focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/30";

// Pilotage du cycle d'une publication depuis sa fiche admin. Chaque étape
// n'affiche que les actions qui ont un sens à ce moment-là : proposer
// "Marquer comme publiée" sur un brouillon jamais validé par le client
// ouvrirait la porte à une publication sans accord.
export function SocialPostWorkflow({
  postId,
  status,
  hasContactsToNotify,
  publishedUrl,
}: {
  postId: string;
  status: SocialPostStatus;
  hasContactsToNotify: boolean;
  publishedUrl: string | null;
}) {
  const [isPending, startTransition] = useTransition();
  const [publishState, publishAction, publishPending] = useActionState(
    markSocialPostPublished.bind(null, postId),
    undefined,
  );
  const { onSubmit: publishSubmit } = useFormSubmit(publishAction, {
    pending: publishPending,
    state: publishState,
  });

  const [linkState, linkAction, linkPending] = useActionState(
    setSocialPostPublishedUrl.bind(null, postId),
    undefined,
  );
  const { onSubmit: linkSubmit } = useFormSubmit(linkAction, { pending: linkPending, state: linkState });

  const isDraft = status === "idee" || status === "redaction";

  return (
    <div className="grid gap-4">
      {isDraft && (
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-sm text-ink-muted">Étape :</span>
          {(["idee", "redaction"] as const).map((draft) => (
            <button
              key={draft}
              type="button"
              disabled={isPending || status === draft}
              onClick={() => startTransition(() => setSocialPostDraftStatus(postId, draft))}
              className={`rounded-full border px-3 py-1.5 text-xs font-medium transition-colors ${
                status === draft
                  ? "border-accent bg-accent text-accent-ink"
                  : "border-line text-ink-muted hover:text-ink"
              }`}
            >
              {SOCIAL_POST_STATUS_META[draft].label}
            </button>
          ))}
        </div>
      )}

      {(isDraft || status === "a_modifier") && (
        <div className="flex flex-wrap items-center gap-3">
          <button
            type="button"
            disabled={isPending}
            onClick={() => {
              if (
                window.confirm(
                  hasContactsToNotify
                    ? "Envoyer cette publication au client pour validation ? Ses contacts seront prévenus par email."
                    : "Envoyer cette publication au client pour validation ? Aucun contact de ce client n'a les notifications email activées : il la verra dans son espace, sans être prévenu.",
                )
              ) {
                startTransition(() => submitSocialPostForValidation(postId));
              }
            }}
            className={PRIMARY}
          >
            <PaperPlaneTilt size={16} weight="bold" />
            {status === "a_modifier" ? "Renvoyer en validation" : "Envoyer au client pour validation"}
          </button>
          {!hasContactsToNotify && (
            <span className="text-xs text-ink-muted">Aucun contact notifiable pour ce client.</span>
          )}
        </div>
      )}

      {status === "a_valider" && (
        <div className="flex flex-wrap items-center gap-3">
          <p className="text-sm text-ink-muted">En attente de la validation du client.</p>
          <button
            type="button"
            disabled={isPending}
            onClick={() => {
              if (window.confirm("Valider cette publication au nom du client (accord obtenu hors de l'app) ?")) {
                startTransition(() => validateSocialPostByAdmin(postId));
              }
            }}
            className={SECONDARY}
          >
            <CheckCircle size={16} weight="regular" />
            Valider au nom du client
          </button>
        </div>
      )}

      {status === "valide" && (
        <form action={publishAction} onSubmit={publishSubmit} className="grid gap-2">
          <label htmlFor="publishedUrl" className="text-sm font-medium text-ink">
            Une fois publiée, collez le lien du post
          </label>
          <div className="flex flex-wrap gap-2">
            <input
              id="publishedUrl"
              name="publishedUrl"
              type="url"
              placeholder="https://www.instagram.com/p/..."
              className={INPUT}
            />
            <button type="submit" disabled={publishPending} className={PRIMARY}>
              {publishPending ? "..." : "Marquer comme publiée"}
            </button>
          </div>
          <p className="text-xs text-ink-muted">Le lien est facultatif, mais il permet au client de retrouver le post.</p>
          {publishState?.error && (
            <span className="flex items-center gap-1 text-sm text-danger">
              <WarningCircle size={16} weight="fill" />
              {publishState.error}
            </span>
          )}
        </form>
      )}

      {status === "publie" && (
        <div className="flex flex-wrap items-center gap-3">
          {publishedUrl ? (
            <a
              href={publishedUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 text-sm font-medium text-ink underline underline-offset-2 hover:text-accent"
            >
              Voir le post publié
              <ArrowSquareOut size={14} weight="regular" />
            </a>
          ) : (
            // Rappel du lien manquant (2026-09-18) : sans lien, le client ne
            // retrouve pas le post et le rapport mensuel est incomplet.
            <form
              action={linkAction}
              onSubmit={linkSubmit}
              className="grid w-full gap-2 rounded-xl border border-amber-500/40 bg-amber-500/5 p-3"
            >
              <p className="text-sm font-medium text-ink">Lien du post manquant</p>
              <p className="text-xs text-ink-muted">
                Sans lien, le client ne retrouve pas le post et le rapport mensuel est incomplet.
              </p>
              <div className="flex flex-wrap gap-2">
                <input
                  name="publishedUrl"
                  type="url"
                  required
                  placeholder="https://www.instagram.com/p/..."
                  className={INPUT}
                  aria-label="Lien du post publié"
                />
                <button type="submit" disabled={linkPending} className={PRIMARY}>
                  {linkPending ? "..." : "Ajouter le lien"}
                </button>
              </div>
              {linkState?.error && (
                <span className="flex items-center gap-1 text-sm text-danger">
                  <WarningCircle size={16} weight="fill" />
                  {linkState.error}
                </span>
              )}
            </form>
          )}
          <button
            type="button"
            disabled={isPending}
            onClick={() => {
              if (window.confirm("Remettre cette publication en rédaction ? Sa validation et son lien seront effacés.")) {
                startTransition(() => setSocialPostDraftStatus(postId, "redaction"));
              }
            }}
            className="text-xs text-ink-muted underline underline-offset-2 hover:text-ink"
          >
            Marquée publiée par erreur ? Revenir en rédaction
          </button>
        </div>
      )}
    </div>
  );
}
