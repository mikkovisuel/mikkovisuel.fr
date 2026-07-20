import { Bell, BellSlash } from "@phosphor-icons/react/dist/ssr";
import { toggleOwnEmailNotifications } from "@/lib/actions/clients";

// Variante "Mon compte" de `ClientUserEmailToggle` (espace admin) : même
// champ `ClientUser.emailNotificationsEnabled`, mais ici le client bascule
// sa propre préférence — bouton pleine largeur avec libellé explicite,
// plutôt que la pastille compacte utilisée dans les listes admin.
export function EmailNotificationsToggle({ enabled }: { enabled: boolean }) {
  return (
    <form action={toggleOwnEmailNotifications}>
      <button
        type="submit"
        className="inline-flex items-center gap-2 rounded-full border border-line px-4 py-2.5 text-sm text-ink transition-colors hover:border-accent hover:bg-accent hover:text-accent-ink"
      >
        {enabled ? <Bell size={16} weight="regular" /> : <BellSlash size={16} weight="fill" />}
        {enabled ? "Notifications par email activées" : "Notifications par email désactivées"}
      </button>
    </form>
  );
}
