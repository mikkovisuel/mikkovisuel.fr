import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "@phosphor-icons/react/dist/ssr";
import { verifyAdminSession } from "@/lib/dal";
import { db } from "@/lib/db";
import { TaskEditForm } from "@/components/admin/task-edit-form";
import { TaskPinButton } from "@/components/admin/task-pin-button";
import { DeleteButton } from "@/components/admin/delete-button";
import { DeliverableUploadForm } from "@/components/admin/deliverable-upload-form";
import { AttachmentUploadForm } from "@/components/admin/attachment-upload-form";
import { FileGrid } from "@/components/file-grid";
import { TaskCommentThread } from "@/components/task-comment-thread";
import { updateTask, archiveTask, unarchiveTask, deleteTask } from "@/lib/actions/tasks";
import {
  uploadDeliverable,
  deleteDeliverable,
  uploadAttachment,
  deleteAttachment,
} from "@/lib/actions/files";
import { postAdminComment } from "@/lib/actions/comments";
import { TASK_TYPE_LIST_KEY, TASK_FORMAT_LIST_KEY } from "@/lib/dropdown-lists";
import { taskDateFormatter } from "@/lib/tasks";

export const metadata: Metadata = {
  title: "Tâche — Admin Mikko Visuel",
};

function toDateInputValue(date: Date | null) {
  if (!date) return "";
  return date.toISOString().slice(0, 10);
}

export default async function TaskDetailPage({
  params,
}: {
  params: Promise<{ taskId: string }>;
}) {
  await verifyAdminSession();
  const { taskId } = await params;

  const [task, typeList, formatList] = await Promise.all([
    db.task.findUnique({
      where: { id: taskId },
      include: {
        client: true,
        types: true,
        formats: true,
        deliverables: true,
        attachments: true,
        comments: { orderBy: { createdAt: "asc" } },
      },
    }),
    db.dropdownList.findUnique({
      where: { key: TASK_TYPE_LIST_KEY },
      include: { items: { orderBy: { sortOrder: "asc" } } },
    }),
    db.dropdownList.findUnique({
      where: { key: TASK_FORMAT_LIST_KEY },
      include: { items: { orderBy: { sortOrder: "asc" } } },
    }),
  ]);

  if (!task) notFound();

  const updateThisTask = updateTask.bind(null, task.id);

  return (
    <div className="mx-auto max-w-2xl px-4 py-10 sm:px-6 lg:px-8">
      <Link
        href={`/admin/clients/${task.clientId}`}
        className="inline-flex items-center gap-2 text-sm text-ink-muted transition-colors hover:text-ink"
      >
        <ArrowLeft size={16} weight="regular" />
        Retour à {task.client.name}
      </Link>

      <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <TaskPinButton taskId={task.id} pinned={task.pinnedAt !== null} />
          <h1 className="font-display text-2xl font-medium tracking-tight text-ink">
            {task.title}
          </h1>
        </div>

        <div className="flex items-center gap-4">
          {task.archivedAt ? (
            <>
              <span className="text-sm text-ink-muted">
                Archivée le {taskDateFormatter.format(task.archivedAt)}
              </span>
              <form action={unarchiveTask.bind(null, task.id)}>
                <button
                  type="submit"
                  className="text-sm text-ink-muted transition-colors hover:text-ink"
                >
                  Désarchiver
                </button>
              </form>
            </>
          ) : (
            <form action={archiveTask.bind(null, task.id)}>
              <button
                type="submit"
                className="text-sm text-ink-muted transition-colors hover:text-ink"
              >
                Archiver
              </button>
            </form>
          )}
          <DeleteButton
            action={deleteTask.bind(null, task.id)}
            confirmMessage={`Supprimer définitivement "${task.title}" ? Cette action efface aussi tous ses livrables du stockage et ne peut pas être annulée.`}
          />
        </div>
      </div>

      <div className="mt-8">
        <TaskEditForm
          action={updateThisTask}
          typeOptions={typeList?.items ?? []}
          formatOptions={formatList?.items ?? []}
          defaultValues={{
            title: task.title,
            description: task.description ?? "",
            eventDate: toDateInputValue(task.eventDate),
            dueDate: toDateInputValue(task.dueDate),
            types: task.types.map((type) => type.slug),
            formats: task.formats.map((format) => format.slug),
          }}
        />
      </div>

      <section className="mt-12">
        <h2 className="text-sm font-medium text-ink-muted">
          Livrables ({task.deliverables.length})
        </h2>

        {task.deliverables.length > 0 && (
          <div className="mt-4">
            <FileGrid
              files={task.deliverables}
              downloadBasePath="/api/fichiers/livrables"
              deleteAction={deleteDeliverable}
            />
          </div>
        )}

        <div className="mt-4">
          <DeliverableUploadForm action={uploadDeliverable.bind(null, task.id)} />
        </div>
      </section>

      <section className="mt-12">
        <h2 className="text-sm font-medium text-ink-muted">
          Pièces jointes ({task.attachments.length})
        </h2>

        {task.attachments.length > 0 && (
          <div className="mt-4">
            <FileGrid
              files={task.attachments}
              downloadBasePath="/api/fichiers/pieces-jointes"
              deleteAction={deleteAttachment}
            />
          </div>
        )}

        <div className="mt-4">
          <AttachmentUploadForm action={uploadAttachment.bind(null, task.id)} />
        </div>
      </section>

      <section className="mt-12">
        <h2 className="text-sm font-medium text-ink-muted">
          Commentaires ({task.comments.length})
        </h2>
        <div className="mt-4">
          <TaskCommentThread
            comments={task.comments}
            currentAuthorType="ADMIN"
            action={postAdminComment.bind(null, task.id)}
          />
        </div>
      </section>
    </div>
  );
}
