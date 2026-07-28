import { adminResetClientPassword } from "@/lib/actions/password-reset";
import { StepUpButton } from "@/components/admin/step-up-button";

export function ResetPasswordButton({ clientUserId }: { clientUserId: string }) {
  return (
    <StepUpButton
      action={adminResetClientPassword.bind(null, clientUserId)}
      label="Réinitialiser le mot de passe"
      confirmMessage="Confirmez votre mot de passe admin pour envoyer le lien de réinitialisation."
      submitLabel="Envoyer"
      successMessage="Email envoyé"
      triggerClassName="text-xs text-ink-muted transition-colors hover:text-ink"
    />
  );
}
