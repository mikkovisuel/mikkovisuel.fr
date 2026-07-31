import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "@phosphor-icons/react/dist/ssr";
import { verifyClientSession } from "@/lib/dal";
import { db } from "@/lib/db";
import { TASK_STATUS } from "@/lib/dropdown-lists";
import { TaskStatusTimeline } from "@/components/client/task-status-timeline";
import { ValidateRefuseButtons } from "@/components/client/validate-refuse-buttons";
import { FileGrid } from "@/components/file-grid";
import { LinkifiedText } from "@/components/linkified-text";
import { TaskCommentThread } from "@/components/task-comment-thread";
import { postClientComment } from "@/lib/actions/comments";

export const metadata: Metadata = {
  title: "Tâche — Espace client Mikko Visuel",
};

export default async function ClientTaskDetailPage({
  params,
}: {
  params: Promise<{ taskId: string }>;
}) {
  const clientUser = await verifyClientSession();
  const { taskId } = await params;

  const task = await db.task.findUnique({
    where: { id: taskId },
    include: {
      status: true,
      deliverables: true,
      comments: { orderBy: { createdAt: "asc" } },
    },
  });

  if (!task || task.clientId !== clientUser.clientId || task.archivedAt) notFound();

  return (
    <div className="mx-auto max-w-3xl px-4 py-10 sm:px-6 lg:px-8">
      <Link
        href="/espace-client/suivi"
        className="inline-flex items-center gap-2 text-sm text-ink-muted transition-colors hover:text-ink"
      >
        <ArrowLeft size={16} weight="regular" />
        Retour au suivi
      </Link>

      <h1 className="mt-4 font-display text-2xl font-medium tracking-tight text-ink">
        {task.title}
      </h1>
      {task.description && (
        <p className="mt-2 whitespace-pre-wrap text-sm text-ink-muted">
          <LinkifiedText text={task.description} />
        </p>
      )}

      <div className="mt-6">
        <TaskStatusTimeline statusSlug={task.status.slug} refusalReason={task.refusalReason} />
      </div>

      {task.status.slug === TASK_STATUS.A_VALIDER && (
        <>
          {task.deliverables.length > 0 && (
            <div className="mt-6">
              <FileGrid files={task.deliverables} downloadBasePath="/api/fichiers/livrables" />
            </div>
          )}
          <div className="mt-4">
            <ValidateRefuseButtons taskId={task.id} readOnly={clientUser.client.isDemo} />
          </div>
        </>
      )}

      <section className="mt-10">
        <h2 className="text-sm font-medium text-ink-muted">
          Commentaires ({task.comments.length})
        </h2>
        <div className="mt-4">
          <TaskCommentThread
            comments={task.comments}
            currentAuthorType="CLIENT_USER"
            action={postClientComment.bind(null, task.id)}
            readOnly={clientUser.client.isDemo}
          />
        </div>
      </section>
    </div>
  );
}
