import Link from "next/link";
import { TaskPinButton } from "@/components/admin/task-pin-button";
import { taskDateFormatterShort } from "@/lib/tasks";

interface PinnedTask {
  id: string;
  title: string;
  clientName: string;
  statusLabel: string;
  eventDate: Date | null;
}

export function PinnedTasks({ tasks }: { tasks: PinnedTask[] }) {
  return (
    <div className="rounded-2xl border border-line p-6">
      <h2 className="font-display text-lg font-medium text-ink">Tâches épinglées</h2>
      {tasks.length === 0 ? (
        <p className="mt-3 text-sm text-ink-muted">
          Aucune tâche épinglée pour le moment — épinglez-en une depuis la liste des tâches.
        </p>
      ) : (
        <ul className="mt-4 flex flex-col gap-3">
          {tasks.map((task) => (
            <li key={task.id} className="flex items-center justify-between gap-3 text-sm">
              <div className="flex min-w-0 items-center gap-2">
                <TaskPinButton taskId={task.id} pinned />
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
              </div>
              {task.eventDate && (
                <span className="shrink-0 text-xs text-ink-muted">
                  {taskDateFormatterShort.format(task.eventDate)}
                </span>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
