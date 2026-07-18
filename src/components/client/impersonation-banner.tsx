import { stopImpersonation } from "@/lib/actions/impersonation";

export function ImpersonationBanner({ clientName }: { clientName: string }) {
  return (
    <div className="flex flex-col items-start gap-2 bg-accent px-4 py-2 text-sm text-accent-ink sm:flex-row sm:items-center sm:justify-between sm:px-6 lg:px-8">
      <span>
        Vous visualisez l&apos;espace de <strong>{clientName}</strong> en tant qu&apos;admin.
      </span>
      <form action={stopImpersonation}>
        <button
          type="submit"
          className="rounded-full border border-accent-ink/30 px-3 py-1 text-xs font-medium transition-colors hover:bg-accent-ink hover:text-accent"
        >
          Revenir à l&apos;admin
        </button>
      </form>
    </div>
  );
}
