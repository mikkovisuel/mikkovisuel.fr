import { Bell, BellSlash } from "@phosphor-icons/react/dist/ssr";
import { toggleClientUserEmailNotifications } from "@/lib/actions/clients";

// Bascule un profil au clic, pas de confirmation — même pattern que
// `TaskPinButton`. Coupe les emails automatiques (nouvelle tâche à valider,
// rappel, nouveau livrable/document, relance de paiement, BAT validé) pour
// ce profil sans supprimer le compte, pour éviter de spammer un contact qui
// n'a pas besoin d'être notifié.
export function ClientUserEmailToggle({
  clientUserId,
  clientId,
  enabled,
}: {
  clientUserId: string;
  clientId: string;
  enabled: boolean;
}) {
  return (
    <form action={toggleClientUserEmailNotifications.bind(null, clientUserId, clientId)}>
      <button
        type="submit"
        aria-label={enabled ? "Désactiver les emails automatiques" : "Activer les emails automatiques"}
        title={
          enabled
            ? "Emails automatiques activés — cliquer pour désactiver"
            : "Emails automatiques désactivés — cliquer pour activer"
        }
        className={`flex shrink-0 items-center gap-1.5 rounded-full p-1 text-xs transition-colors ${
          enabled ? "text-ink-muted hover:text-ink" : "text-danger"
        }`}
      >
        {enabled ? <Bell size={16} weight="regular" /> : <BellSlash size={16} weight="fill" />}
      </button>
    </form>
  );
}
