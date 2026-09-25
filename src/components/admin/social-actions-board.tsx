import { Trash } from "@phosphor-icons/react/dist/ssr";
import { DeleteButton } from "@/components/admin/delete-button";
import { SocialActionCheckbox, SocialActionForm } from "@/components/admin/social-action-forms";
import { createSocialAction, deleteSocialAction, updateSocialAction } from "@/lib/actions/social-actions";
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
}

const SECTION = "rounded-2xl border border-line p-6";

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

function ActionItem({ action }: { action: ActionRow }) {
  return (
    <li className="flex items-start gap-3 rounded-xl border border-line p-3">
      <div className="pt-0.5">
        <SocialActionCheckbox actionId={action.id} done={action.doneAt !== null} label={action.title} />
      </div>
      <div className={`min-w-0 flex-1 ${action.doneAt ? "opacity-60" : ""}`}>
        <p className={`text-sm font-medium text-ink ${action.doneAt ? "line-through" : ""}`}>{action.title}</p>
        <p className="mt-1 text-xs text-ink-muted">
          {formatSchedule(action.dueAt)}
          {action.client ? ` · ${action.client.name}` : " · interne"}
          {action.routineId ? " · routine" : ""}
          {action.doneAt ? ` · fait le ${formatSchedule(action.doneAt)}` : ""}
        </p>
        {action.description && (
          <p className="mt-1 whitespace-pre-wrap break-words text-xs text-ink-muted">{action.description}</p>
        )}
      </div>
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
  defaultDueAt,
}: {
  actions: ActionRow[];
  clients: { id: string; name: string }[];
  now: Date;
  /** Valeur `datetime-local` proposée par défaut (aujourd'hui, 9 h). */
  defaultDueAt: string;
}) {
  const todo = actions.filter((action) => !action.doneAt);
  const done = actions.filter((action) => action.doneAt);
  const groups = groupByDay(todo, now);

  return (
    <div className="mt-8 grid gap-6">
      <section className={SECTION}>
        <h2 className="text-xs font-medium uppercase tracking-wide text-ink-muted">Nouvelle action</h2>
        <p className="mt-1 text-xs text-ink-muted">
          Une chose à faire, un jour donné, cochée quand c&apos;est fait. Rien à voir avec une tâche de production :
          pas de livrable, pas de validation client.
        </p>
        <div className="mt-4 max-w-2xl">
          <SocialActionForm action={createSocialAction} clients={clients} defaultValues={{ dueAt: defaultDueAt }} />
        </div>
      </section>

      {groups.length === 0 ? (
        <section className={SECTION}>
          <p className="text-sm text-ink-muted">Rien à faire pour l&apos;instant.</p>
        </section>
      ) : (
        groups.map((group) => (
          <section key={group.key} className={SECTION}>
            <h2 className="text-sm font-medium text-ink">
              {group.title} ({group.actions.length})
            </h2>
            <ul className="mt-3 grid gap-2">
              {group.actions.map((action) => (
                <ActionItem key={action.id} action={action} />
              ))}
            </ul>
          </section>
        ))
      )}

      {done.length > 0 && (
        <section className={SECTION}>
          <details>
            <summary className="cursor-pointer text-sm font-medium text-ink">Faites ({done.length})</summary>
            <ul className="mt-3 grid gap-2">
              {done.slice(0, 50).map((action) => (
                <ActionItem key={action.id} action={action} />
              ))}
            </ul>
          </details>
        </section>
      )}

      {todo.length > 0 && (
        <section className={SECTION}>
          <details>
            <summary className="cursor-pointer text-sm font-medium text-ink">Modifier une action</summary>
            <div className="mt-4 grid gap-4">
              {todo.slice(0, 20).map((action) => (
                <div key={action.id} className="rounded-xl border border-line p-3">
                  <p className="mb-2 text-xs text-ink-muted">{action.title}</p>
                  <SocialActionForm
                    action={updateSocialAction.bind(null, action.id)}
                    clients={clients}
                    resetOnSuccess={false}
                    submitLabel="Enregistrer"
                    defaultValues={{
                      title: action.title,
                      description: action.description ?? "",
                      clientId: action.client?.id ?? "",
                      dueAt: toParisDateTimeLocal(action.dueAt),
                    }}
                  />
                </div>
              ))}
            </div>
          </details>
        </section>
      )}
    </div>
  );
}
