import { Trash } from "@phosphor-icons/react/dist/ssr";
import { DeleteButton } from "@/components/admin/delete-button";
import { SocialActionCheckbox } from "@/components/admin/social-action-forms";
import { EditSocialActionButton } from "@/components/admin/social-action-buttons";
import { deleteSocialAction } from "@/lib/actions/social-actions";
import { formatSchedule, toParisDateTimeLocal } from "@/lib/social-posts";

// Liste "À faire" du module Réseaux (2026-09-25) : les actions groupées par
// échéance, de la plus urgente à la plus lointaine. Les actions faites sont
// rangées à part pour ne pas encombrer.

export interface ActionRow {
  id: string;
  title: string;
  description: string | null;
  dueAt: Date;
  doneAt: Date | null;
  client: { id: string; name: string } | null;
  routineId: string | null;
  /** Responsable (travail à deux admins, 2026-10-20). */
  assignedAdmin?: { id: string; email: string } | null;
}

const SECTION = "rounded-2xl border border-line p-4";

/** Découpe en groupes lisibles, calculée en heure de Paris. */
function groupByDay(actions: ActionRow[], now: Date) {
  const day = (date: Date) => toParisDateTimeLocal(date).slice(0, 10);
  const today = day(now);
  const tomorrow = day(new Date(now.getTime() + 24 * 60 * 60 * 1000));
  const inAWeek = day(new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000));

  const groups: { key: string; title: string; actions: ActionRow[] }[] = [
    { key: "late", title: "En retard", actions: [] },
    { key: "today", title: "Aujourd'hui", actions: [] },
    { key: "tomorrow", title: "Demain", actions: [] },
    { key: "week", title: "Cette semaine", actions: [] },
    { key: "later", title: "Plus tard", actions: [] },
  ];

  for (const action of actions) {
    const actionDay = day(action.dueAt);
    if (actionDay < today) groups[0].actions.push(action);
    else if (actionDay === today) groups[1].actions.push(action);
    else if (actionDay === tomorrow) groups[2].actions.push(action);
    else if (actionDay <= inAWeek) groups[3].actions.push(action);
    else groups[4].actions.push(action);
  }
  return groups.filter((group) => group.actions.length > 0);
}

type AdminOption = { id: string; label: string };

function ActionItem({
  action,
  clients,
  admins,
}: {
  action: ActionRow;
  clients: { id: string; name: string }[];
  admins?: AdminOption[];
}) {
  return (
    <li className="ws-row flex items-center gap-3 px-3 py-1.5">
      <div>
        <SocialActionCheckbox actionId={action.id} done={action.doneAt !== null} label={action.title} />
      </div>
      <div className={`min-w-0 flex-1 ${action.doneAt ? "opacity-60" : ""}`}>
        <p className="truncate text-sm">
          <span className={`font-medium text-ink ${action.doneAt ? "line-through" : ""}`}>{action.title}</span>
          <span className="text-xs text-ink-muted">
            {" · "}
          {formatSchedule(action.dueAt)}
          {action.client ? ` · ${action.client.name}` : " · interne"}
          {action.routineId ? " · routine" : ""}
          {action.assignedAdmin ? ` · ${action.assignedAdmin.email.split("@")[0]}` : ""}
          {action.doneAt ? ` · fait le ${formatSchedule(action.doneAt)}` : ""}
          </span>
        </p>
        {action.description && (
          <p title={action.description} className="truncate text-xs text-ink-muted">{action.description}</p>
        )}
      </div>
      <EditSocialActionButton
        actionId={action.id}
        clients={clients}
        values={{
          title: action.title,
          description: action.description ?? "",
          clientId: action.client?.id ?? "",
          dueAt: toParisDateTimeLocal(action.dueAt),
          assignedAdminId: action.assignedAdmin?.id ?? null,
        }}
        admins={admins}
      />
      <DeleteButton
        action={deleteSocialAction.bind(null, action.id)}
        confirmMessage={`Supprimer l'action "${action.title}" ?`}
        label={`Supprimer ${action.title}`}
        icon={<Trash size={14} weight="regular" />}
        className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full border border-line text-ink-muted transition-colors hover:border-danger hover:bg-danger hover:text-white"
      />
    </li>
  );
}

export function SocialActionsBoard({
  actions,
  clients,
  now,
  admins,
}: {
  actions: ActionRow[];
  clients: { id: string; name: string }[];
  now: Date;
  admins?: AdminOption[];
}) {
  const todo = actions.filter((action) => !action.doneAt);
  const done = actions.filter((action) => action.doneAt);
  const groups = groupByDay(todo, now);

  return (
    <div className="mt-6 grid gap-4">
      {groups.length === 0 ? (
        <section className={SECTION}>
          <p className="text-sm text-ink-muted">Rien à faire pour l&apos;instant.</p>
        </section>
      ) : (
        groups.map((group) => (
          <section key={group.key}>
            <h2 className="px-1 pb-1 text-xs font-medium uppercase tracking-wide text-ink-muted">
              {group.title} ({group.actions.length})
            </h2>
            <ul className="divide-y divide-line overflow-hidden rounded-2xl border border-line">
              {group.actions.map((action) => (
                <ActionItem key={action.id} action={action} clients={clients} admins={admins} />
              ))}
            </ul>
          </section>
        ))
      )}

      {done.length > 0 && (
        <section className={SECTION}>
          <details>
            <summary className="cursor-pointer text-sm font-medium text-ink">Faites ({done.length})</summary>
            <ul className="mt-3 divide-y divide-line overflow-hidden rounded-xl border border-line">
              {done.slice(0, 50).map((action) => (
                <ActionItem key={action.id} action={action} clients={clients} admins={admins} />
              ))}
            </ul>
          </details>
        </section>
      )}
    </div>
  );
}
