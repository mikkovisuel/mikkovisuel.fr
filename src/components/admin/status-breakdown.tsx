import Link from "next/link";
import { PALETTE_SWATCH_CLASSES, type PaletteColor } from "@/lib/dropdown-lists";

interface StatusCount {
  slug: string;
  label: string;
  color: string;
  count: number;
}

export function StatusBreakdown({ statuses }: { statuses: StatusCount[] }) {
  return (
    <div className="rounded-2xl border border-line p-6">
      <h2 className="font-display text-lg font-medium text-ink">Tâches par statut</h2>
      <ul className="mt-4 flex flex-col gap-2.5">
        {statuses.map((status) => {
          const dot = PALETTE_SWATCH_CLASSES[status.color as PaletteColor] ?? PALETTE_SWATCH_CLASSES.slate;
          return (
            <li key={status.slug}>
              <Link
                href={`/admin/taches?status=${status.slug}`}
                className="flex items-center justify-between gap-3 text-sm transition-colors hover:text-ink"
              >
                <span className="flex items-center gap-2 text-ink-muted">
                  <span className={`h-2 w-2 shrink-0 rounded-full ${dot}`} />
                  {status.label}
                </span>
                <span className="font-medium text-ink">{status.count}</span>
              </Link>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
