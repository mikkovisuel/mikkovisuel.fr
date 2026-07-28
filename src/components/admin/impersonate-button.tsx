import { impersonateClient } from "@/lib/actions/impersonation";
import { StepUpButton } from "@/components/admin/step-up-button";

export function ImpersonateButton({ clientUserId }: { clientUserId: string }) {
  return (
    <StepUpButton
      action={impersonateClient.bind(null, clientUserId)}
      label="Voir l'espace client"
      confirmMessage="Confirmez votre mot de passe admin pour ouvrir cet espace client."
      submitLabel="Ouvrir"
      triggerClassName="text-xs text-ink-muted transition-colors hover:text-ink"
    />
  );
}
