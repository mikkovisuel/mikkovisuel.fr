import Link from "next/link";

const DATE_TIME_FORMATTER = new Intl.DateTimeFormat("fr-FR", {
  day: "numeric",
  month: "long",
  hour: "2-digit",
  minute: "2-digit",
});

interface LoginEvent {
  id: string;
  clientId: string;
  clientName: string;
  userName: string;
  loggedInAt: Date;
}

export function ClientLoginJournal({ events }: { events: LoginEvent[] }) {
  return (
    <div className="rounded-2xl border border-line p-6">
      <h2 className="font-display text-lg font-medium text-ink">Journal de connexion</h2>
      {events.length === 0 ? (
        <p className="mt-3 text-sm text-ink-muted">Aucune connexion enregistrée pour l&apos;instant.</p>
      ) : (
        <ul className="mt-4 flex flex-col gap-2.5">
          {events.map((event) => (
            <li key={event.id} className="flex items-center justify-between gap-3 text-sm">
              <Link
                href={`/admin/clients/${event.clientId}`}
                className="min-w-0 truncate text-ink transition-colors hover:underline"
              >
                {event.userName} <span className="text-ink-muted">— {event.clientName}</span>
              </Link>
              <span className="shrink-0 text-xs text-ink-muted">
                {DATE_TIME_FORMATTER.format(event.loggedInAt)}
              </span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
