import { impersonateClient } from "@/lib/actions/impersonation";

export function ImpersonateButton({ clientUserId }: { clientUserId: string }) {
  return (
    <form action={impersonateClient.bind(null, clientUserId)}>
      <button type="submit" className="text-xs text-ink-muted transition-colors hover:text-ink">
        Voir l&apos;espace client
      </button>
    </form>
  );
}
