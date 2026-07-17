import Link from "next/link";
import { taskDateFormatter } from "@/lib/tasks";

interface InactiveClient {
  id: string;
  name: string;
  lastTaskAt: Date | null;
}

export function InactiveClients({ clients }: { clients: InactiveClient[] }) {
  return (
    <div className="rounded-2xl border border-line p-6">
      <h2 className="font-display text-lg font-medium text-ink">Clients sans activité récente</h2>
      <p className="mt-1 text-xs text-ink-muted">Aucune nouvelle tâche depuis 30 jours ou plus.</p>
      {clients.length === 0 ? (
        <p className="mt-3 text-sm text-ink-muted">Tous vos clients ont une activité récente.</p>
      ) : (
        <ul className="mt-4 flex flex-col gap-2.5">
          {clients.map((client) => (
            <li key={client.id}>
              <Link
                href={`/admin/clients/${client.id}`}
                className="flex items-center justify-between gap-3 text-sm transition-colors hover:text-ink"
              >
                <span className="font-medium text-ink">{client.name}</span>
                <span className="text-xs text-ink-muted">
                  {client.lastTaskAt
                    ? `Dernière tâche le ${taskDateFormatter.format(client.lastTaskAt)}`
                    : "Aucune tâche"}
                </span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
