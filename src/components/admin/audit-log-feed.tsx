import { AUDIT_ACTION_LABELS, type AuditAction } from "@/lib/audit-log";

const DATE_FORMATTER = new Intl.DateTimeFormat("fr-FR", {
  day: "2-digit",
  month: "2-digit",
  year: "numeric",
  hour: "2-digit",
  minute: "2-digit",
});

export type AuditLogEntryRow = {
  id: string;
  actorLabel: string;
  action: string;
  targetLabel: string | null;
  ipAddress: string | null;
  createdAt: Date;
};

export function AuditLogFeed({ entries }: { entries: AuditLogEntryRow[] }) {
  if (entries.length === 0) {
    return <p className="mt-8 text-sm text-ink-muted">Aucun évènement pour le moment.</p>;
  }

  return (
    <div className="mt-6 divide-y divide-line rounded-2xl border border-line">
      {entries.map((entry) => (
        <div key={entry.id} className="flex flex-wrap items-center justify-between gap-3 px-4 py-3">
          <div className="min-w-0">
            <p className="text-sm text-ink">
              {AUDIT_ACTION_LABELS[entry.action as AuditAction] ?? entry.action}
            </p>
            <p className="text-xs text-ink-muted">
              {entry.actorLabel}
              {entry.targetLabel && <> — {entry.targetLabel}</>}
              {entry.ipAddress && <> · {entry.ipAddress}</>}
            </p>
          </div>
          <span className="whitespace-nowrap text-xs text-ink-muted">
            {DATE_FORMATTER.format(entry.createdAt)}
          </span>
        </div>
      ))}
    </div>
  );
}
