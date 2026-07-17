"use client";

import { useTransition } from "react";
import { setTaskStatus } from "@/lib/actions/tasks";
import { PALETTE_BADGE_CLASSES, type PaletteColor, type TaskStatusSlug } from "@/lib/dropdown-lists";

export function TaskStatusSelect({
  taskId,
  currentSlug,
  currentColor,
  statuses,
}: {
  taskId: string;
  currentSlug: string;
  currentColor: string;
  statuses: { slug: string; label: string }[];
}) {
  const [isPending, startTransition] = useTransition();
  const classes = PALETTE_BADGE_CLASSES[currentColor as PaletteColor] ?? PALETTE_BADGE_CLASSES.slate;

  return (
    <select
      defaultValue={currentSlug}
      disabled={isPending}
      onChange={(event) => {
        const slug = event.target.value as TaskStatusSlug;
        startTransition(() => {
          setTaskStatus(taskId, slug);
        });
      }}
      className={`rounded-full border px-3 py-1.5 text-xs font-medium focus:outline-none focus:ring-2 focus:ring-accent/30 disabled:opacity-60 ${classes}`}
    >
      {statuses.map((status) => (
        <option key={status.slug} value={status.slug} className="bg-surface-elevated text-ink">
          {status.label}
        </option>
      ))}
    </select>
  );
}
