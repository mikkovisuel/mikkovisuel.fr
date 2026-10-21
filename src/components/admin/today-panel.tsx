import Link from "next/link";
import { db } from "@/lib/db";
import { EXCLUDE_DEMO_CLIENT } from "@/lib/clients";
import { TASK_STATUS } from "@/lib/dropdown-lists";
import { formatAmount } from "@/lib/documents";
import { startOfToday, taskDateFormatterShort } from "@/lib/tasks";
import { SOCIAL_POST_STATUS, formatSchedule } from "@/lib/social-posts";
import { SocialActionCheckbox } from "@/components/admin/social-action-forms";

// Bloc « Aujourd'hui » du tableau de bord (feuille de route, point 2,
// 2026-10-20) : une seule liste cliquable de ce qui attend une action
// aujourd'hui — tâches à livrer (en retard ou pour aujourd'hui), actions
// réseaux à cocher, publications validées dont l'heure est passée, factures
// en retard de paiement. « À moi » (par défaut) ne garde que ce qui est
// attribué à l'admin connecté ; les factures, sans responsable, restent dans
// les deux vues.

type Scope = "moi" | "tout";

export async function TodayPanel({ adminId, scope }: { adminId: string; scope: Scope }) {
  const today = startOfToday();
  const tomorrow = new Date(today.getTime() + 24 * 60 * 60 * 1000);
  const now = new Date();
  const mine = scope === "moi" ? { assignedAdminId: adminId } : {};

  const [tasks, actions, posts, invoices] = await Promise.all([
    db.task.findMany({
      where: {
        ...mine,
        archivedAt: null,
        client: EXCLUDE_DEMO_CLIENT,
        status: { slug: { not: TASK_STATUS.TERMINE } },
        dueDate: { lt: tomorrow },
      },
      select: { id: true, title: true, dueDate: true, client: { select: { name: true } } },
      orderBy: { dueDate: "asc" },
      take: 30,
    }),
    db.socialAction.findMany({
      where: { ...mine, doneAt: null, dueAt: { lt: tomorrow } },
      select: { id: true, title: true, dueAt: true, client: { select: { name: true } } },
      orderBy: { dueAt: "asc" },
      take: 30,
    }),
    db.socialPost.findMany({
      where: {
        ...mine,
        client: EXCLUDE_DEMO_CLIENT,
        status: SOCIAL_POST_STATUS.VALIDE,
        scheduledAt: { lte: now },
      },
      select: { id: true, title: true, scheduledAt: true, client: { select: { name: true } } },
      orderBy: { scheduledAt: "asc" },
      take: 30,
    }),
    db.document.findMany({
      where: { client: EXCLUDE_DEMO_CLIENT, paymentStatus: "unpaid", dueDate: { lt: now } },
      select: {
        id: true,
        fileName: true,
        amountCents: true,
        currency: true,
        dueDate: true,
        clientId: true,
        client: { select: { name: true } },
      },
      orderBy: { dueDate: "asc" },
      take: 30,
    }),
  ]);

  const total = tasks.length + actions.length + posts.length + invoices.length;
  const late = (date: Date | null) => date !== null && date < today;

  const tab = (value: Scope, label: string) => (
    <Link
      href={value === "moi" ? "/admin" : "/admin?aujourdhui=tout"}
      aria-current={scope === value ? "page" : undefined}
      scroll={false}
    >
      {label}
    </Link>
  );

  return (
    <section className="rounded-2xl border border-line">
      <div className="flex flex-wrap items-center gap-3 border-b border-line px-5 py-3">
        <h2 className="flex-1 text-lg font-medium text-ink">
          Aujourd&apos;hui <span className="font-normal text-ink-muted">({total})</span>
        </h2>
        <nav className="segmented" aria-label="Portée">
          {tab("moi", "À moi")}
          {tab("tout", "Tout")}
        </nav>
      </div>

      {total === 0 ? (
        <p className="px-5 py-6 text-sm text-ink-muted">
          Rien d&apos;urgent{scope === "moi" ? " pour vous" : ""} aujourd&apos;hui.
        </p>
      ) : (
        <ul className="divide-y divide-line">
          {tasks.map((task) => (
            <Row
              key={`t-${task.id}`}
              kind="Tâche"
              href={`/admin/taches/${task.id}`}
              title={task.title}
              meta={task.client.name}
              when={task.dueDate ? `à livrer ${late(task.dueDate) ? "le " + taskDateFormatterShort.format(task.dueDate) : "aujourd'hui"}` : ""}
              late={late(task.dueDate)}
            />
          ))}
          {actions.map((action) => (
            <li key={`a-${action.id}`} className="ws-row flex items-center gap-3 px-5">
              <span className="flex w-5 shrink-0 justify-center">
                <SocialActionCheckbox actionId={action.id} done={false} label={action.title} />
              </span>
              <span className="w-[4.5rem] shrink-0 text-xs text-ink-muted">Action</span>
              <Link href="/admin/reseaux?vue=afaire" className="min-w-0 flex-1 truncate text-sm text-ink hover:underline">
                {action.title}
                <span className="text-ink-muted"> · {action.client?.name ?? "interne"}</span>
              </Link>
              <span className={`shrink-0 text-xs ${late(action.dueAt) ? "font-medium text-danger" : "text-ink-muted"}`}>
                {formatSchedule(action.dueAt)}
              </span>
            </li>
          ))}
          {posts.map((post) => (
            <Row
              key={`p-${post.id}`}
              kind="À publier"
              href={`/admin/reseaux/${post.id}`}
              title={post.title}
              meta={post.client.name}
              when={post.scheduledAt ? `prévue ${formatSchedule(post.scheduledAt)}` : ""}
              late
            />
          ))}
          {invoices.map((invoice) => (
            <Row
              key={`f-${invoice.id}`}
              kind="Facture"
              href={`/admin/administratif?clientId=${invoice.clientId}&status=unpaid&vue=detaille`}
              title={invoice.fileName}
              meta={`${invoice.client.name}${invoice.amountCents !== null ? ` · ${formatAmount(invoice.amountCents, invoice.currency)}` : ""}`}
              when={invoice.dueDate ? `échue le ${taskDateFormatterShort.format(invoice.dueDate)}` : ""}
              late
            />
          ))}
        </ul>
      )}
    </section>
  );
}

function Row({
  kind,
  href,
  title,
  meta,
  when,
  late,
}: {
  kind: string;
  href: string;
  title: string;
  meta: string;
  when: string;
  late: boolean;
}) {
  return (
    <li>
      <Link href={href} className="ws-row flex items-center gap-3 px-5 hover:bg-ink/[0.03]">
        <span className="flex w-5 shrink-0 justify-center" aria-hidden>
          <span className={`h-2 w-2 rounded-full ${late ? "bg-red-600" : "bg-accent"}`} />
        </span>
        <span className="w-[4.5rem] shrink-0 text-xs text-ink-muted">{kind}</span>
        <span className="min-w-0 flex-1 truncate text-sm text-ink">
          {title}
          <span className="text-ink-muted"> · {meta}</span>
        </span>
        <span className={`shrink-0 text-xs ${late ? "font-medium text-danger" : "text-ink-muted"}`}>{when}</span>
      </Link>
    </li>
  );
}
