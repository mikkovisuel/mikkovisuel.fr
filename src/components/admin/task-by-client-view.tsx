import { TaskRow } from "@/components/admin/task-row";
import { groupTasksByClient } from "@/lib/tasks";

interface ByClientTask {
  id: string;
  clientId: string;
  title: string;
  eventDate: Date | null;
  dueDate: Date | null;
  refusalReason: string | null;
  status: { slug: string; color: string };
  types: { id: string; label: string; color: string }[];
  formats: { id: string; label: string; color: string }[];
  client: { name: string };
  _count?: { deliverables: number; attachments: number };
}

export function TaskByClientView({
  tasks,
  statusOptions,
}: {
  tasks: ByClientTask[];
  statusOptions: { slug: string; label: string }[];
}) {
  const groups = groupTasksByClient(tasks);

  if (groups.length === 0) {
    return <p className="mt-8 text-sm text-ink-muted">Aucune tâche pour le moment.</p>;
  }

  return (
    <div className="mt-8 flex flex-col gap-4">
      {groups.map(([clientName, clientTasks]) => (
        <details
          key={clientName}
          open
          className="overflow-hidden rounded-2xl border border-line [&_summary::-webkit-details-marker]:hidden"
        >
          <summary className="flex cursor-pointer items-center justify-between gap-3 bg-accent px-6 py-4 font-medium text-accent-ink">
            <span>{clientName}</span>
            <span className="text-sm font-normal text-accent-ink/70">{clientTasks.length} tâche(s)</span>
          </summary>
          <div className="divide-y divide-line border-t border-line">
            {clientTasks.map((task) => (
              <TaskRow key={task.id} task={task} statusOptions={statusOptions} showClient={false} />
            ))}
          </div>
        </details>
      ))}
    </div>
  );
}
