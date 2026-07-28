"use client";

import { useTransition } from "react";
import Link from "next/link";
import { setProspectStatus } from "@/lib/actions/prospects";
import { ProspectStatusSelect } from "@/components/admin/prospect-status-select";
import { PALETTE_BADGE_CLASSES, type PaletteColor, type ProspectStatusSlug } from "@/lib/dropdown-lists";
import { isProspectReminderOverdue } from "@/lib/prospects";

interface KanbanProspect {
  id: string;
  name: string;
  company: string | null;
  nextReminderAt: Date | null;
  status: { slug: string; color: string };
  convertedClient: { id: string; name: string } | null;
}

interface StatusColumn {
  slug: string;
  label: string;
  color: string;
}

// Miroir de TaskKanbanBoard (src/components/admin/task-kanban-board.tsx) :
// drag-and-drop natif + repli ProspectStatusSelect pour clavier/tactile.
export function ProspectKanbanBoard({
  prospects,
  statuses,
}: {
  prospects: KanbanProspect[];
  statuses: StatusColumn[];
}) {
  const [isPending, startTransition] = useTransition();

  function handleDrop(event: React.DragEvent<HTMLDivElement>, slug: string) {
    event.preventDefault();
    const prospectId = event.dataTransfer.getData("text/plain");
    if (!prospectId) return;
    startTransition(() => {
      setProspectStatus(prospectId, slug as ProspectStatusSlug);
    });
  }

  return (
    <div className="mt-8 flex gap-4 overflow-x-auto pb-4">
      {statuses.map((status) => {
        const columnProspects = prospects.filter((prospect) => prospect.status.slug === status.slug);
        const classes =
          PALETTE_BADGE_CLASSES[status.color as PaletteColor] ?? PALETTE_BADGE_CLASSES.slate;

        return (
          <div
            key={status.slug}
            onDragOver={(event) => event.preventDefault()}
            onDrop={(event) => handleDrop(event, status.slug)}
            className="flex w-72 shrink-0 flex-col gap-3 rounded-2xl border border-line bg-surface-elevated/50 p-3"
          >
            <div className="flex items-center justify-between">
              <span
                className={`inline-flex items-center rounded-full border px-2.5 py-1 text-xs font-medium ${classes}`}
              >
                {status.label}
              </span>
              <span className="text-xs text-ink-muted">{columnProspects.length}</span>
            </div>

            <div className="flex flex-col gap-2">
              {columnProspects.length === 0 && (
                <p className="px-1 py-2 text-xs text-ink-muted">Aucun prospect.</p>
              )}
              {columnProspects.map((prospect) => {
                const reminderOverdue = isProspectReminderOverdue(prospect);
                return (
                  <div
                    key={prospect.id}
                    draggable
                    onDragStart={(event) => {
                      event.dataTransfer.setData("text/plain", prospect.id);
                      event.dataTransfer.effectAllowed = "move";
                    }}
                    className={`flex cursor-grab flex-col gap-2 rounded-xl border border-line bg-surface-elevated p-3 shadow-sm transition-opacity active:cursor-grabbing ${
                      isPending ? "opacity-70" : ""
                    }`}
                  >
                    <Link
                      href={`/admin/prospection/${prospect.id}`}
                      className="text-sm font-medium text-ink hover:underline"
                    >
                      {prospect.name}
                    </Link>
                    {prospect.company && (
                      <p className="text-xs text-ink-muted">{prospect.company}</p>
                    )}
                    {prospect.convertedClient && (
                      <Link
                        href={`/admin/clients/${prospect.convertedClient.id}`}
                        className="text-xs font-medium text-accent hover:underline"
                      >
                        Voir la fiche client →
                      </Link>
                    )}
                    {prospect.nextReminderAt && (
                      <p
                        className={`text-xs ${reminderOverdue ? "font-medium text-danger" : "text-ink-muted"}`}
                      >
                        Relance le{" "}
                        {prospect.nextReminderAt.toLocaleDateString("fr-FR")}
                        {reminderOverdue ? " — en retard" : ""}
                      </p>
                    )}
                    <ProspectStatusSelect
                      prospectId={prospect.id}
                      currentSlug={prospect.status.slug}
                      currentColor={prospect.status.color}
                      statuses={statuses}
                    />
                  </div>
                );
              })}
            </div>
          </div>
        );
      })}
    </div>
  );
}
