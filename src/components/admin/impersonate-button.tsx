import { impersonateClient } from "@/lib/actions/impersonation";
import { StepUpButton } from "@/components/admin/step-up-button";

/** `pill` : bouton en pilule de l'en-tête de la fiche client (2026-10-20) ;
 * sinon le petit lien d'origine (ligne de contact). */
export function ImpersonateButton({ clientUserId, pill = false }: { clientUserId: string; pill?: boolean }) {
  return (
    <StepUpButton
      action={impersonateClient.bind(null, clientUserId)}
      label="Voir l'espace client"
      confirmMessage="Confirmez votre mot de passe admin pour ouvrir cet espace client."
      submitLabel="Ouvrir"
      triggerClassName={
        pill
          ? "inline-flex h-9 items-center gap-2 rounded-full border border-[var(--color-outline)] px-4 text-sm font-medium text-ink transition-colors hover:bg-ink/[0.04]"
          : "text-xs text-ink-muted transition-colors hover:text-ink"
      }
    />
  );
}
