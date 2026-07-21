import Link from "next/link";
import { dueDateKey, groupTasksByEventDate, isoWeekNumber } from "@/lib/tasks";
import { PALETTE_SWATCH_CLASSES, type PaletteColor } from "@/lib/dropdown-lists";

const WEEKDAY_LABELS = ["Lun", "Mar", "Mer", "Jeu", "Ven", "Sam", "Dim"];
const MONTH_FORMATTER = new Intl.DateTimeFormat("fr-FR", { month: "long", year: "numeric" });

interface CalendarTask {
  id: string;
  title: string;
  eventDate: Date | null;
  status: { color: string; label: string };
}

// Grille de semaines (lundi en premier), avec des cases vides en bordure de
// mois pour aligner les colonnes de jours.
function buildMonthGrid(year: number, month: number) {
  const firstOfMonth = new Date(year, month, 1);
  const startWeekday = (firstOfMonth.getDay() + 6) % 7;
  const daysInMonth = new Date(year, month + 1, 0).getDate();

  const cells: (Date | null)[] = [];
  for (let i = 0; i < startWeekday; i++) cells.push(null);
  for (let day = 1; day <= daysInMonth; day++) cells.push(new Date(year, month, day));
  while (cells.length % 7 !== 0) cells.push(null);

  const weeks: (Date | null)[][] = [];
  for (let i = 0; i < cells.length; i += 7) weeks.push(cells.slice(i, i + 7));
  return weeks;
}

function monthHref(
  basePath: string,
  year: number,
  month: number,
  clientId?: string,
  status?: string,
) {
  const params = new URLSearchParams();
  if (basePath === "/admin/taches") params.set("vue", "calendrier");
  if (clientId) params.set("clientId", clientId);
  if (status) params.set("status", status);
  params.set("mois", `${year}-${String(month + 1).padStart(2, "0")}`);
  return `${basePath}?${params.toString()}`;
}

export function TaskCalendarView({
  tasks,
  year,
  month,
  clientId,
  status,
  basePath = "/admin/taches",
  taskBasePath = "/admin/taches",
}: {
  tasks: CalendarTask[];
  /** Mois affiché, `month` indexé à partir de 0 (comme Date). */
  year: number;
  month: number;
  clientId?: string;
  status?: string;
  /** URL de la vue elle-même (pour les liens ← Précédent / Suivant →). */
  basePath?: string;
  /** URL de base des liens vers une tâche (admin ou espace client). */
  taskBasePath?: string;
}) {
  const weeks = buildMonthGrid(year, month);
  const { byDay, undated } = groupTasksByEventDate(tasks);
  const today = dueDateKey(new Date());
  const prevMonth = month === 0 ? { year: year - 1, month: 11 } : { year, month: month - 1 };
  const nextMonth = month === 11 ? { year: year + 1, month: 0 } : { year, month: month + 1 };

  return (
    <div className="mt-8">
      <div className="flex items-center justify-between">
        <h2 className="font-display text-lg font-medium capitalize text-ink">
          {MONTH_FORMATTER.format(new Date(year, month, 1))}
        </h2>
        <div className="flex gap-2">
          <Link
            href={monthHref(basePath, prevMonth.year, prevMonth.month, clientId, status)}
            className="rounded-full border border-line px-3 py-1.5 text-sm text-ink-muted transition-colors hover:text-ink"
          >
            ← Précédent
          </Link>
          <Link
            href={monthHref(basePath, nextMonth.year, nextMonth.month, clientId, status)}
            className="rounded-full border border-line px-3 py-1.5 text-sm text-ink-muted transition-colors hover:text-ink"
          >
            Suivant →
          </Link>
        </div>
      </div>

      <div className="mt-4 grid grid-cols-[3rem_repeat(7,1fr)] gap-2 text-center text-xs font-medium text-ink-muted">
        <div />
        {WEEKDAY_LABELS.map((label) => (
          <div key={label}>{label}</div>
        ))}
      </div>

      <div className="mt-2 grid grid-cols-[3rem_repeat(7,1fr)] gap-2">
        {weeks.flatMap((week, weekIndex) => {
          const firstDay = week.find((day): day is Date => day !== null);
          return [
            <div
              key={`week-${weekIndex}`}
              className="flex min-h-28 items-start justify-center pt-2 text-xs text-ink-muted"
            >
              {firstDay && `S${isoWeekNumber(firstDay)}`}
            </div>,
            ...week.map((day, dayIndex) => {
              if (!day) {
                return (
                  <div
                    key={`${weekIndex}-${dayIndex}`}
                    className="min-h-28 rounded-xl border border-transparent"
                  />
                );
              }
              const key = dueDateKey(day);
              const dayTasks = byDay.get(key) ?? [];
              const isToday = key === today;

              return (
                <div
                  key={key}
                  className={`flex min-h-28 flex-col gap-1.5 rounded-xl border p-2 ${
                    isToday ? "border-accent" : "border-line"
                  }`}
                >
                  <span className="text-xs font-medium text-ink-muted">{day.getDate()}</span>
                  <div className="flex flex-col gap-1">
                    {dayTasks.map((task) => {
                      const dot =
                        PALETTE_SWATCH_CLASSES[task.status.color as PaletteColor] ??
                        PALETTE_SWATCH_CLASSES.slate;
                      return (
                        <Link
                          key={task.id}
                          href={`${taskBasePath}/${task.id}`}
                          className="flex flex-col gap-0.5 truncate rounded-lg bg-surface-elevated px-2 py-1 text-xs text-ink hover:underline"
                        >
                          <span className="flex items-center gap-1.5 truncate">
                            <span className={`h-1.5 w-1.5 shrink-0 rounded-full ${dot}`} />
                            <span className="truncate">{task.title}</span>
                          </span>
                          <span className="truncate pl-3 text-[11px] text-ink-muted">
                            {task.status.label}
                          </span>
                        </Link>
                      );
                    })}
                  </div>
                </div>
              );
            }),
          ];
        })}
      </div>

      {undated.length > 0 && (
        <div className="mt-6">
          <h3 className="text-sm font-medium text-ink">Sans date d&apos;événement</h3>
          <ul className="mt-2 flex flex-wrap gap-2">
            {undated.map((task) => (
              <li key={task.id}>
                <Link
                  href={`${taskBasePath}/${task.id}`}
                  className="rounded-full border border-line px-3 py-1.5 text-xs text-ink-muted transition-colors hover:text-ink"
                >
                  {task.title}
                </Link>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
