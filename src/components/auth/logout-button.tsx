import { logout } from "@/lib/actions/logout";

export function LogoutButton() {
  return (
    <form action={logout}>
      <button
        type="submit"
        className="inline-flex items-center rounded-full border border-line px-4 py-2 text-sm text-ink-muted transition-colors hover:border-accent hover:bg-accent hover:text-accent-ink"
      >
        Se déconnecter
      </button>
    </form>
  );
}
