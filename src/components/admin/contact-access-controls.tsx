"use client";

import { useState, useTransition } from "react";
import { LockKey, LockKeyOpen, PaperPlaneTilt, WarningCircle } from "@phosphor-icons/react/dist/ssr";
import { toggleContactPortalAccess, sendContactInvitation } from "@/lib/actions/clients";
import type { ContactAccessState } from "@/lib/clients";

// Deux gestes distincts, volontairement séparés (choix du 2026-07-30 :
// "les deux, au choix") : ouvrir/fermer l'accès, et envoyer l'invitation.
// Ouvrir sans inviter est un état valide — le contact peut aussi recevoir un
// mot de passe par un autre canal, ou avoir déjà le sien si l'accès avait été
// fermé puis rouvert.
export function ContactAccessControls({
  clientUserId,
  clientId,
  state,
  hasEmail,
}: {
  clientUserId: string;
  clientId: string;
  state: ContactAccessState;
  hasEmail: boolean;
}) {
  const [pending, startTransition] = useTransition();
  const [feedback, setFeedback] = useState<{ error?: string; success?: boolean } | null>(null);

  const open = state !== "none";

  function handleToggle() {
    setFeedback(null);
    startTransition(async () => {
      await toggleContactPortalAccess(clientUserId, clientId);
    });
  }

  function handleInvite() {
    setFeedback(null);
    startTransition(async () => {
      setFeedback(await sendContactInvitation(clientUserId, clientId));
    });
  }

  return (
    <div className="flex flex-wrap items-center gap-2">
      <button
        type="button"
        onClick={handleToggle}
        // Sans email, il n'y a pas d'identifiant de connexion : on désactive
        // plutôt que de laisser l'action échouer silencieusement côté serveur.
        disabled={pending || (!open && !hasEmail)}
        title={
          !open && !hasEmail
            ? "Ajoutez une adresse email à ce contact pour pouvoir lui ouvrir un espace client"
            : open
              ? "Fermer l'accès à l'espace client (le contact et son mot de passe sont conservés)"
              : "Ouvrir l'accès à l'espace client"
        }
        className="inline-flex items-center gap-1.5 rounded-full border border-line px-3 py-1.5 text-xs text-ink transition-colors hover:border-accent hover:bg-accent hover:text-accent-ink disabled:cursor-not-allowed disabled:opacity-50"
      >
        {open ? <LockKey size={14} weight="regular" /> : <LockKeyOpen size={14} weight="regular" />}
        {open ? "Fermer l'accès" : "Ouvrir l'accès"}
      </button>

      {open && (
        <button
          type="button"
          onClick={handleInvite}
          disabled={pending || !hasEmail}
          title="Envoyer un lien permettant au contact de choisir son mot de passe"
          className="inline-flex items-center gap-1.5 rounded-full border border-line px-3 py-1.5 text-xs text-ink transition-colors hover:border-accent hover:bg-accent hover:text-accent-ink disabled:cursor-not-allowed disabled:opacity-50"
        >
          <PaperPlaneTilt size={14} weight="regular" />
          {state === "pending" ? "Envoyer l'invitation" : "Renvoyer une invitation"}
        </button>
      )}

      {feedback?.success && <span className="text-xs text-ink-muted">Invitation envoyée</span>}
      {feedback?.error && (
        <span className="flex items-center gap-1 text-xs text-danger">
          <WarningCircle size={14} weight="fill" />
          {feedback.error}
        </span>
      )}
    </div>
  );
}
