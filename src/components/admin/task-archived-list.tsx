import Link from "next/link";
import { taskDateFormatter } from "@/lib/tasks";
import { AttachmentBadge } from "@/components/attachment-badge";

interface ArchivedTask {
  id: string;
  title: string;
  archivedAt: Date | null;
  client: { name: string };
  _count?: { deliverables: number; attachments: number };
}

// Vue en lecture seule : désarchiver/supprimer se fait depuis la page de
// détail de la tâche (geste délibéré, pas dans une liste dense).
export function ArchivedTaskList({ tasks }: { tasks: ArchivedTask[] }) {
  if (tasks.length === 0) {
    return <p className="mt-8 text-sm text-ink-muted">Aucune tâche archivée.</p>;
  }

  return (
    <div className="mt-8 divide-y divide-line rounded-2xl border border-line">
      {tasks.map((task) => (
        <Link
          key={task.id}
          href={`/admin/taches/${task.id}`}
          className="flex items-center justify-between gap-3 px-6 py-4 transition-colors hover:bg-surface-elevated"
        >
          <div>
            <p className="text-sm text-ink-muted">{task.client.name}</p>
            <div className="flex items-center gap-2">
              <p className="font-medium text-ink">{task.title}</p>
              <AttachmentBadge
                attachmentCount={task._count?.attachments}
                deliverableCount={task._count?.deliverables}
              />
            </div>
          </div>
          {task.archivedAt && (
            <p className="text-sm text-ink-muted">
              Archivée le {taskDateFormatter.format(task.archivedAt)}
            </p>
          )}
        </Link>
      ))}
    </div>
  );
}
