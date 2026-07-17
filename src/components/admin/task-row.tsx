import Link from "next/link";
import { TaskStatusSelect } from "@/components/admin/task-status-select";
import { StatusBadge } from "@/components/status-badge";
import { isTaskOverdue, taskDateFormatter } from "@/lib/tasks";

interface TaskRowProps {
  task: {
    id: string;
    clientId: string;
    title: string;
    eventDate: Date | null;
    dueDate: Date | null;
    refusalReason: string | null;
    status: { slug: string; color: string };
    types: { id: string; label: string; color: string }[];
    formats: { id: string; label: string; color: string }[];
    client?: { name: string };
  };
  statusOptions: { slug: string; label: string }[];
  showClient?: boolean;
}

export function TaskRow({ task, statusOptions, showClient = false }: TaskRowProps) {
  const overdue = isTaskOverdue(task);

  return (
    <div className="flex flex-col gap-3 px-6 py-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          {showClient && task.client && (
            <Link
              href={`/admin/clients/${task.clientId}`}
              className="text-sm text-ink-muted transition-colors hover:text-ink"
            >
              {task.client.name}
            </Link>
          )}
          <p className="font-medium text-ink">{task.title}</p>
          {task.eventDate && (
            <p className="mt-1 text-sm text-ink-muted">
              Évènement le {taskDateFormatter.format(task.eventDate)}
            </p>
          )}
          {task.dueDate && (
            <p className="mt-1 text-sm text-ink-muted">
              Échéance le {taskDateFormatter.format(task.dueDate)}
            </p>
          )}
          {overdue && <p className="mt-1 text-sm font-medium text-danger">En retard</p>}
          {task.refusalReason && (
            <p className="mt-1 text-sm text-danger">Motif de refus : {task.refusalReason}</p>
          )}
        </div>
        <div className="flex items-center gap-3">
          <Link
            href={`/admin/taches/${task.id}`}
            className="text-sm text-ink-muted transition-colors hover:text-ink"
          >
            Modifier
          </Link>
          <TaskStatusSelect
            taskId={task.id}
            currentSlug={task.status.slug}
            currentColor={task.status.color}
            statuses={statusOptions}
          />
        </div>
      </div>

      {(task.types.length > 0 || task.formats.length > 0) && (
        <div className="flex flex-wrap gap-2">
          {task.types.map((type) => (
            <StatusBadge key={type.id} label={type.label} color={type.color} />
          ))}
          {task.formats.map((format) => (
            <StatusBadge key={format.id} label={format.label} color={format.color} />
          ))}
        </div>
      )}
    </div>
  );
}
