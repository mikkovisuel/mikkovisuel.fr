import Link from "next/link";
import { CaretLeft, CaretRight } from "@phosphor-icons/react/dist/ssr";
import { dueDateKey } from "@/lib/tasks";
import { toParisWallClockDate } from "@/lib/social-posts";
import { CalendarDraggable, CalendarDropZone } from "@/components/admin/calendar-dnd";

// Calendrier du mois à la manière de Google Agenda (refonte « Workspace »,
// livraison 3, 2026-10-20) : barre « Aujourd'hui ‹ › mois », grille de 7
// colonnes séparées d'un filet, jours des mois voisins en gris, jour courant
// dans un rond de la couleur d'accent, évènements sur une ligne (point de
// couleur, heure, titre), « N autres » au-delà de trois.
//
// Réservé au back-office : l'espace client garde `TaskCalendarView`.

export interface AgendaItem {
  id: string;
  title: string;
  /** Date « murale » (heure de Paris lue avec les accesseurs locaux). */
  date: Date | null;
  /** « 18:00 », facultatif. */
  time?: string;
  /** Classe de couleur du point (`bg-…`). */
  dotClass: string;
  href: string;
  /** Infobulle : client, statut, catégorie… */
  tooltip?: string;
  /** Créneau prévu sans publication : encadré en pointillés, non déplaçable. */
  ghost?: boolean;
  /** Bloc plein (évènement sur la journée), comme un évènement « Toute la journée ». */
  solid?: boolean;
}

const WEEKDAYS = ["LUN.", "MAR.", "MER.", "JEU.", "VEN.", "SAM.", "DIM."];
const MONTH_LABEL = new Intl.DateTimeFormat("fr-FR", { month: "long", year: "numeric" });
const VISIBLE_PER_DAY = 3;

/** Semaines complètes, lundi en premier, jours voisins compris. */
function monthWeeks(year: number, month: number) {
  const first = new Date(year, month, 1);
  const start = new Date(year, month, 1 - ((first.getDay() + 6) % 7));
  const last = new Date(year, month + 1, 0);
  const weeks: Date[][] = [];
  const cursor = new Date(start);
  while (cursor <= last || weeks.length === 0 || weeks[weeks.length - 1].length < 7) {
    if (weeks.length === 0 || weeks[weeks.length - 1].length === 7) weeks.push([]);
    weeks[weeks.length - 1].push(new Date(cursor));
    cursor.setDate(cursor.getDate() + 1);
  }
  return weeks;
}

export function monthParam(year: number, month: number) {
  const date = new Date(year, month, 1);
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
}

function hrefFor(basePath: string, params: Record<string, string>, year: number, month: number) {
  const search = new URLSearchParams(params);
  search.set("mois", monthParam(year, month));
  return `${basePath}?${search.toString()}`;
}

function ItemChip({ item }: { item: AgendaItem }) {
  if (item.solid) {
    return (
      <Link
        href={item.href}
        title={item.tooltip ?? item.title}
        className={`block truncate rounded px-1.5 py-0.5 text-xs font-medium text-white ${item.dotClass}`}
      >
        {item.title}
      </Link>
    );
  }
  return (
    <Link
      href={item.href}
      title={item.tooltip ?? item.title}
      className={`flex min-w-0 items-center gap-1.5 rounded px-1.5 py-0.5 text-xs text-ink hover:bg-ink/[0.06] ${
        item.ghost ? "border border-dashed border-[var(--color-outline)] text-ink-muted" : ""
      }`}
    >
      {!item.ghost && <span className={`h-2 w-2 shrink-0 rounded-full ${item.dotClass}`} />}
      {item.time && <span className="shrink-0 tabular-nums text-ink-muted">{item.time}</span>}
      <span className="truncate">{item.title}</span>
    </Link>
  );
}

export function AgendaMonthView({
  items,
  year,
  month,
  basePath,
  params = {},
  onMove,
  undatedLabel = "Sans date",
}: {
  items: AgendaItem[];
  /** Mois affiché, `month` indexé à partir de 0. */
  year: number;
  month: number;
  basePath: string;
  /** Paramètres d'URL à garder en changeant de mois (vue, filtres). */
  params?: Record<string, string>;
  /** Glisser-déposer d'un jour à l'autre (publications réseaux). */
  onMove?: (id: string, day: string) => Promise<{ error?: string }>;
  undatedLabel?: string;
}) {
  const weeks = monthWeeks(year, month);
  // « Aujourd'hui » à l'heure de Paris, comme les dates des évènements.
  const now = toParisWallClockDate(new Date());
  const today = dueDateKey(now);
  const byDay = new Map<string, AgendaItem[]>();
  const undated: AgendaItem[] = [];
  for (const item of items) {
    if (!item.date) {
      undated.push(item);
      continue;
    }
    const key = dueDateKey(item.date);
    byDay.set(key, [...(byDay.get(key) ?? []), item]);
  }
  // Dans une journée : blocs pleins, puis par heure.
  for (const list of byDay.values()) {
    list.sort((a, b) => Number(Boolean(b.solid)) - Number(Boolean(a.solid)) || (a.time ?? "").localeCompare(b.time ?? ""));
  }

  return (
    <div className="mt-4">
      <div className="flex flex-wrap items-center gap-2">
        <Link
          href={hrefFor(basePath, params, now.getFullYear(), now.getMonth())}
          className="inline-flex h-9 items-center rounded-full border border-[var(--color-outline)] px-4 text-sm font-medium text-ink transition-colors hover:bg-ink/[0.04]"
        >
          Aujourd&apos;hui
        </Link>
        <Link
          href={hrefFor(basePath, params, year, month - 1)}
          aria-label="Mois précédent"
          className="flex h-9 w-9 items-center justify-center rounded-full text-ink-muted transition-colors hover:bg-ink/[0.08] hover:text-ink"
        >
          <CaretLeft size={18} />
        </Link>
        <Link
          href={hrefFor(basePath, params, year, month + 1)}
          aria-label="Mois suivant"
          className="flex h-9 w-9 items-center justify-center rounded-full text-ink-muted transition-colors hover:bg-ink/[0.08] hover:text-ink"
        >
          <CaretRight size={18} />
        </Link>
        <h2 className="ml-1 text-[22px] font-normal capitalize text-ink">{MONTH_LABEL.format(new Date(year, month, 1))}</h2>
      </div>

      <div className="mt-3 overflow-x-auto rounded-xl border border-line">
        <div className="min-w-[720px]">
          <div className="grid grid-cols-7 border-b border-line">
            {WEEKDAYS.map((label) => (
              <div key={label} className="py-1.5 text-center text-[11px] font-medium text-ink-muted">
                {label}
              </div>
            ))}
          </div>
          {weeks.map((week, weekIndex) => (
            <div key={weekIndex} className="grid grid-cols-7 border-b border-line last:border-b-0">
              {week.map((day, dayIndex) => {
                const key = dueDateKey(day);
                const inMonth = day.getMonth() === month;
                const dayItems = inMonth ? (byDay.get(key) ?? []) : [];
                const visible = dayItems.slice(0, VISIBLE_PER_DAY);
                const more = dayItems.slice(VISIBLE_PER_DAY);
                const cellClass = `flex min-h-28 min-w-0 flex-col gap-0.5 p-1 ${dayIndex > 0 ? "border-l border-line" : ""}`;
                const content = (
                  <>
                    <span className="mb-0.5 flex justify-center">
                      <span
                        className={`flex h-6 min-w-6 items-center justify-center rounded-full px-1 text-xs ${
                          key === today
                            ? "bg-accent font-medium text-accent-ink"
                            : inMonth
                              ? "text-ink"
                              : "text-ink-muted/60"
                        }`}
                      >
                        {day.getDate()}
                      </span>
                    </span>
                    {visible.map((item) =>
                      onMove && !item.ghost ? (
                        <CalendarDraggable key={item.id} id={item.id}>
                          <ItemChip item={item} />
                        </CalendarDraggable>
                      ) : (
                        <ItemChip key={item.id} item={item} />
                      ),
                    )}
                    {more.length > 0 && (
                      <details className="text-xs">
                        <summary className="cursor-pointer list-none rounded px-1.5 py-0.5 font-medium text-ink-muted hover:bg-ink/[0.06] [&::-webkit-details-marker]:hidden">
                          {more.length} autre{more.length > 1 ? "s" : ""}
                        </summary>
                        <div className="mt-0.5 flex flex-col gap-0.5">
                          {more.map((item) => (
                            <ItemChip key={item.id} item={item} />
                          ))}
                        </div>
                      </details>
                    )}
                  </>
                );
                return onMove && inMonth ? (
                  <CalendarDropZone key={key} day={key} onMove={onMove} className={cellClass}>
                    {content}
                  </CalendarDropZone>
                ) : (
                  <div key={key} className={cellClass}>
                    {content}
                  </div>
                );
              })}
            </div>
          ))}
        </div>
      </div>

      {undated.length > 0 && (
        <div className="mt-6">
          <h3 className="text-sm font-medium text-ink">{undatedLabel}</h3>
          <ul className="mt-2 flex flex-wrap gap-2">
            {undated.map((item) => (
              <li key={item.id}>
                <Link
                  href={item.href}
                  className="inline-flex items-center gap-1.5 rounded-lg border border-[var(--color-outline)] px-3 py-1 text-xs text-ink transition-colors hover:bg-ink/[0.04]"
                >
                  <span className={`h-2 w-2 rounded-full ${item.dotClass}`} />
                  {item.title}
                </Link>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

/** Petit calendrier du panneau latéral, comme celui d'Agenda. */
export function AgendaMiniMonth({
  year,
  month,
  basePath,
  params = {},
}: {
  year: number;
  month: number;
  basePath: string;
  params?: Record<string, string>;
}) {
  const weeks = monthWeeks(year, month);
  const today = dueDateKey(toParisWallClockDate(new Date()));
  return (
    <div>
      <div className="flex items-center justify-between pl-2">
        <p className="text-sm font-medium capitalize text-ink">{MONTH_LABEL.format(new Date(year, month, 1))}</p>
        <div className="flex">
          <Link
            href={hrefFor(basePath, params, year, month - 1)}
            aria-label="Mois précédent"
            className="flex h-7 w-7 items-center justify-center rounded-full text-ink-muted hover:bg-ink/[0.08]"
          >
            <CaretLeft size={14} />
          </Link>
          <Link
            href={hrefFor(basePath, params, year, month + 1)}
            aria-label="Mois suivant"
            className="flex h-7 w-7 items-center justify-center rounded-full text-ink-muted hover:bg-ink/[0.08]"
          >
            <CaretRight size={14} />
          </Link>
        </div>
      </div>
      <div className="mt-1 grid grid-cols-7 text-center text-[10px] text-ink-muted">
        {["L", "M", "M", "J", "V", "S", "D"].map((label, index) => (
          <span key={index} className="py-1">
            {label}
          </span>
        ))}
        {weeks.flat().map((day) => {
          const key = dueDateKey(day);
          return (
            <span key={key} className="flex justify-center py-0.5">
              <span
                className={`flex h-6 w-6 items-center justify-center rounded-full text-[11px] ${
                  key === today
                    ? "bg-accent font-medium text-accent-ink"
                    : day.getMonth() === month
                      ? "text-ink"
                      : "text-ink-muted/50"
                }`}
              >
                {day.getDate()}
              </span>
            </span>
          );
        })}
      </div>
    </div>
  );
}
