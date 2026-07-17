import Link from "next/link";
import { taskDateFormatterShort } from "@/lib/tasks";

interface UpcomingTask {
  id: string;
  title: string;
  eventDate: Date;
  clientName: string;
  statusLabel: string;
}

export function UpcomingEvents({ tasks }: { tasks: UpcomingTask[] }) {
  return (
    <div className="rounded-2xl border border-line p-6">
      <h2 className="font-display text-lg font-medium text-ink">Prochains événements</h2>
      {tasks.length === 0 ? (
        <p className="mt-3 text-sm text-ink-muted">Aucun événement à venir.</p>
      ) : (
        <ul className="mt-4 flex flex-col gap-3">
          {tasks.map((task) => (
            <li key={task.id} className="flex items-center justify-between gap-3 text-sm">
              <div className="min-w-0">
                <Link
                  href={`/admin/taches/${task.id}`}
                  className="font-medium text-ink transition-colors hover:underline"
                >
                  {task.title}
                </Link>
                <p className="truncate text-xs text-ink-muted">
                  {task.clientName} · {task.statusLabel}
                </p>
              </div>
              <span className="shrink-0 text-xs text-ink-muted">
                {taskDateFormatterShort.format(task.eventDate)}
              </span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
