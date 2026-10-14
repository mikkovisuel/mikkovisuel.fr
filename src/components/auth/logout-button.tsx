import { SignOut } from "@phosphor-icons/react/dist/ssr";
import { logout } from "@/lib/actions/logout";

/**
 * `iconOnly` sert au pied de la barre latérale de l'admin (2026-10-14), où le
 * libellé pousserait l'adresse e-mail hors du cadre. Ailleurs (espace client,
 * en-tête du téléphone), le comportement d'origine est inchangé.
 */
export function LogoutButton({ iconOnly = false }: { iconOnly?: boolean }) {
  return (
    <form action={logout}>
      <button
        type="submit"
        aria-label="Se déconnecter"
        title="Se déconnecter"
        className={`inline-flex items-center rounded-full border border-line p-2 text-ink-muted transition-colors hover:border-accent hover:bg-accent hover:text-accent-ink ${
          iconOnly ? "" : "sm:px-4 sm:py-2 sm:text-sm"
        }`}
      >
        <SignOut size={18} weight="regular" className={iconOnly ? "" : "sm:hidden"} />
        {!iconOnly && <span className="hidden sm:inline">Se déconnecter</span>}
      </button>
    </form>
  );
}
