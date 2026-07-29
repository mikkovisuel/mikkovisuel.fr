import type { Metadata } from "next";
import { verifyAdminSession } from "@/lib/dal";
import { db } from "@/lib/db";
import { AUDIT_ACTION_LABELS, type AuditAction } from "@/lib/audit-log";
import { AuditLogFeed } from "@/components/admin/audit-log-feed";

export const metadata: Metadata = {
  title: "Audit — Admin Mikko Visuel",
};

const PAGE_SIZE = 50;

export default async function AuditLogPage({
  searchParams,
}: {
  searchParams: Promise<{ action?: string }>;
}) {
  await verifyAdminSession();
  const { action } = await searchParams;

  const entries = await db.auditLogEntry.findMany({
    where: action ? { action } : undefined,
    orderBy: { createdAt: "desc" },
    take: PAGE_SIZE,
  });

  const actions = Object.keys(AUDIT_ACTION_LABELS) as AuditAction[];

  return (
    <div className="mx-auto max-w-4xl px-4 py-10 sm:px-6 lg:px-8">
      <h1 className="font-display text-2xl font-medium tracking-tight text-ink">Audit</h1>
      <p className="mt-2 text-sm text-ink-muted">
        Journal des actions sensibles : connexions, suppressions définitives, réinitialisations de
        mot de passe, exports de données, usurpation d&apos;espace client. Les {PAGE_SIZE}{" "}
        évènements les plus récents.
      </p>

      <form className="mt-6 flex flex-wrap items-end gap-3">
        <div className="flex flex-col gap-2">
          <label htmlFor="action" className="text-sm font-medium text-ink">
            Type d&apos;action
          </label>
          <select
            id="action"
            name="action"
            defaultValue={action ?? ""}
            className="rounded-xl border border-line bg-surface-elevated px-3 py-2.5 text-sm text-ink focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/30"
          >
            <option value="">Toutes les actions</option>
            {actions.map((value) => (
              <option key={value} value={value}>
                {AUDIT_ACTION_LABELS[value]}
              </option>
            ))}
          </select>
        </div>
        <button
          type="submit"
          className="rounded-full bg-accent px-5 py-2.5 text-sm font-medium text-accent-ink transition-transform active:scale-[0.98]"
        >
          Filtrer
        </button>
      </form>

      <AuditLogFeed entries={entries} />
    </div>
  );
}
