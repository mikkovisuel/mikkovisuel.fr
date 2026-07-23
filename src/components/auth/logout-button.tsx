import { SignOut } from "@phosphor-icons/react/dist/ssr";
import { logout } from "@/lib/actions/logout";

export function LogoutButton() {
  return (
    <form action={logout}>
      <button
        type="submit"
        aria-label="Se déconnecter"
        className="inline-flex items-center rounded-full border border-line p-2 text-ink-muted transition-colors hover:border-accent hover:bg-accent hover:text-accent-ink sm:px-4 sm:py-2 sm:text-sm"
      >
        <SignOut size={18} weight="regular" className="sm:hidden" />
        <span className="hidden sm:inline">Se déconnecter</span>
      </button>
    </form>
  );
}
