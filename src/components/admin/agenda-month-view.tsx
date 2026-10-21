import Link from "next/link";
import { CaretLeft, CaretRight } from "@phosphor-icons/react/dist/ssr";
import { dueDateKey, isoWeekNumber } from "@/lib/tasks";
import { toParisWallClockDate } from "@/lib/social-posts";
import { CalendarDraggable, CalendarDropZone } from "@/components/admin/calendar-dnd";

// Calendrier à la manière de Google Agenda (refonte « Workspace », livraison
// 3, 2026-10-20 ; vues Jour et Semaine et numéros de semaine ajoutés le même
// jour à la demande du client) : barre « Aujourd'hui ‹ › période » et choix
// Jour / Semaine / Mois, jour courant dans un rond de la couleur d'accent,
// numéro de semaine ISO (S43) devant chaque semaine.
//  - Mois : grille de 7 colonnes, évènements sur une ligne, « N autres »
//    au-delà de trois ; le numéro de semaine ouvre la vue Semaine.
//  - Semaine : 7 colonnes hautes, titres en entier.
//  - Jour : la liste de la journée, heure par heure, avec le détail.
// Adresse : `cal` (mois | semaine | jour) et `jour` (AAAA-MM-JJ, un jour de la
// période) ; l'ancien paramètre `mois` (AAAA-MM) reste compris.
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
  /** Infobulle (et détail en vue Jour) : client, statut, catégorie… */
  tooltip?: string;
  /** Créneau prévu sans publication : encadré en pointillés, non déplaçable. */
  ghost?: boolean;
  /** Bloc plein (évènement sur la journée), comme un évènement « Toute la journée ». */
  solid?: boolean;
}

export type AgendaMode = "mois" | "semaine" | "jour";
export const AGENDA_MODES: { value: AgendaMode; label: string }[] = [
  { value: "jour", label: "Jour" },
  { value: "semaine", label: "Semaine" },
  { value: "mois", label: "Mois" },
];

const WEEKDAYS = ["LUN.", "MAR.", "MER.", "JEU.", "VEN.", "SAM.", "DIM."];
const MONTH_LABEL = new Intl.DateTimeFormat("fr-FR", { month: "long", year: "numeric" });
const DAY_LABEL = new Intl.DateTimeFormat("fr-FR", { weekday: "long", day: "numeric", month: "long", year: "numeric" });
const SHORT_DAY = new Intl.DateTimeFormat("fr-FR", { day: "numeric", month: "short" });
const VISIBLE_PER_DAY = 3;

const pad = (n: number) => String(n).padStart(2, "0");
const dayParam = (date: Date) => `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
const addDays = (date: Date, days: number) => new Date(date.getFullYear(), date.getMonth(), date.getDate() + days);
/** Lundi de la semaine d'une date. */
export const startOfWeek = (date: Date) => addDays(date, -((date.getDay() + 6) % 7));

/** Lit `cal`, `jour` et l'ancien `mois` de l'adresse. `today` : aujourd'hui
 * en heure de Paris (date murale). */
export function parseAgendaParams(
  params: { cal?: string; jour?: string; mois?: string },
  today: Date,
): { mode: AgendaMode; anchor: Date } {
  const mode: AgendaMode = params.cal === "semaine" || params.cal === "jour" ? params.cal : "mois";
  const day = params.jour ? /^(\d{4})-(\d{2})-(\d{2})$/.exec(params.jour) : null;
  if (day) return { mode, anchor: new Date(Number(day[1]), Number(day[2]) - 1, Number(day[3])) };
  const month = params.mois ? /^(\d{4})-(\d{2})$/.exec(params.mois) : null;
  if (month) return { mode, anchor: new Date(Number(month[1]), Number(month[2]) - 1, 1) };
  return { mode, anchor: new Date(today.getFullYear(), today.getMonth(), today.getDate()) };
}

/** Premier jour affiché et lendemain du dernier, selon la vue. */
export function agendaRange(mode: AgendaMode, anchor: Date): { start: Date; end: Date } {
  if (mode === "jour") return { start: addDays(anchor, 0), end: addDays(anchor, 1) };
  if (mode === "semaine") {
    const start = startOfWeek(anchor);
    return { start, end: addDays(start, 7) };
  }
  const first = new Date(anchor.getFullYear(), anchor.getMonth(), 1);
  const start = startOfWeek(first);
  const last = new Date(anchor.getFullYear(), anchor.getMonth() + 1, 0);
  return { start, end: addDays(startOfWeek(last), 7) };
}

/** Semaines complètes du mois, lundi en premier, jours voisins compris. */
function monthWeeks(year: number, month: number) {
  const { start, end } = agendaRange("mois", new Date(year, month, 1));
  const weeks: Date[][] = [];
  for (let cursor = start; cursor < end; cursor = addDays(cursor, 1)) {
    if (weeks.length === 0 || weeks[weeks.length - 1].length === 7) weeks.push([]);
    weeks[weeks.length - 1].push(cursor);
  }
  return weeks;
}

function hrefFor(basePath: string, params: Record<string, string>, mode: AgendaMode, date: Date) {
  const search = new URLSearchParams(params);
  search.delete("mois");
  search.set("cal", mode);
  search.set("jour", dayParam(date));
  return `${basePath}?${search.toString()}`;
}

function ItemChip({ item, full = false }: { item: AgendaItem; full?: boolean }) {
  if (item.solid) {
    return (
      <Link
        href={item.href}
        title={item.tooltip ?? item.title}
        className={`block rounded px-1.5 py-0.5 text-xs font-medium text-white ${full ? "[overflow-wrap:anywhere]" : "truncate"} ${item.dotClass}`}
      >
        {item.title}
      </Link>
    );
  }
  if (full) {
    // Vue Semaine : l'heure sur sa propre ligne, le titre en entier dessous.
    return (
      <Link
        href={item.href}
        title={item.tooltip ?? item.title}
        className={`flex min-w-0 flex-col gap-0.5 rounded px-1.5 py-1 text-xs text-ink hover:bg-ink/[0.06] ${
          item.ghost ? "border border-dashed border-[var(--color-outline)] text-ink-muted" : ""
        }`}
      >
        <span className="flex items-center gap-1.5 text-[11px] tabular-nums text-ink-muted">
          {!item.ghost && <span className={`h-2 w-2 shrink-0 rounded-full ${item.dotClass}`} />}
          {item.time ?? "Journée"}
        </span>
        <span className="break-words [overflow-wrap:anywhere]">{item.title}</span>
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

function groupByDay(items: AgendaItem[]) {
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
  return { byDay, undated };
}

function Draggable({ item, onMove, full }: { item: AgendaItem; onMove?: boolean; full?: boolean }) {
  return onMove && !item.ghost ? (
    <CalendarDraggable id={item.id}>
      <ItemChip item={item} full={full} />
    </CalendarDraggable>
  ) : (
    <ItemChip item={item} full={full} />
  );
}

const ICON_LINK =
  "flex h-9 w-9 items-center justify-center rounded-full text-ink-muted transition-colors hover:bg-ink/[0.08] hover:text-ink";

export function AgendaMonthView({
  items,
  mode = "mois",
  anchor,
  year,
  month,
  basePath,
  params = {},
  onMove,
  undatedLabel = "Sans date",
}: {
  items: AgendaItem[];
  mode?: AgendaMode;
  /** Un jour de la période affichée (date murale). Par défaut : le 1er du mois. */
  anchor?: Date;
  /** Mois affiché (vue Mois), `month` indexé à partir de 0. */
  year: number;
  month: number;
  basePath: string;
  /** Paramètres d'URL à garder en changeant de période (vue, filtres). */
  params?: Record<string, string>;
  /** Glisser-déposer d'un jour à l'autre (publications réseaux). */
  onMove?: (id: string, day: string) => Promise<{ error?: string }>;
  undatedLabel?: string;
}) {
  const day = anchor ?? new Date(year, month, 1);
  // « Aujourd'hui » à l'heure de Paris, comme les dates des évènements.
  const now = toParisWallClockDate(new Date());
  const today = dueDateKey(now);
  const { byDay, undated } = groupByDay(items);
  const weekStart = startOfWeek(day);

  const previous =
    mode === "jour" ? addDays(day, -1) : mode === "semaine" ? addDays(weekStart, -7) : new Date(year, month - 1, 1);
  const next =
    mode === "jour" ? addDays(day, 1) : mode === "semaine" ? addDays(weekStart, 7) : new Date(year, month + 1, 1);
  const unit = mode === "jour" ? "Jour" : mode === "semaine" ? "Semaine" : "Mois";
  const title =
    mode === "jour"
      ? DAY_LABEL.format(day)
      : mode === "semaine"
        ? `${SHORT_DAY.format(weekStart)} – ${SHORT_DAY.format(addDays(weekStart, 6))} ${addDays(weekStart, 6).getFullYear()}`
        : MONTH_LABEL.format(new Date(year, month, 1));

  return (
    <div className="mt-4">
      <div className="flex flex-wrap items-center gap-2">
        <Link
          href={hrefFor(basePath, params, mode, now)}
          className="inline-flex h-9 items-center rounded-full border border-[var(--color-outline)] px-4 text-sm font-medium text-ink transition-colors hover:bg-ink/[0.04]"
        >
          Aujourd&apos;hui
        </Link>
        <Link href={hrefFor(basePath, params, mode, previous)} aria-label={`${unit} précédent${mode === "semaine" ? "e" : ""}`} className={ICON_LINK}>
          <CaretLeft size={18} />
        </Link>
        <Link href={hrefFor(basePath, params, mode, next)} aria-label={`${unit} suivant${mode === "semaine" ? "e" : ""}`} className={ICON_LINK}>
          <CaretRight size={18} />
        </Link>
        <h2 className="ml-1 text-[22px] font-normal first-letter:uppercase text-ink">{title}</h2>
        {mode !== "mois" && (
          <span className="rounded-full bg-ink/[0.06] px-2 py-0.5 text-xs font-medium text-ink-muted">
            S{isoWeekNumber(day)}
          </span>
        )}
        <nav className="segmented ml-auto" aria-label="Vue du calendrier">
          {AGENDA_MODES.map((option) => (
            <Link
              key={option.value}
              href={hrefFor(basePath, params, option.value, day)}
              aria-current={option.value === mode ? "page" : undefined}
            >
              {option.label}
            </Link>
          ))}
        </nav>
      </div>

      {mode === "mois" && (
        <div className="mt-3 overflow-x-auto rounded-xl border border-line">
          <div className="min-w-[760px]">
            <div className="grid grid-cols-[2.5rem_repeat(7,minmax(0,1fr))] border-b border-line">
              <div className="py-1.5 text-center text-[10px] font-medium text-ink-muted" title="Numéro de semaine">
                S.
              </div>
              {WEEKDAYS.map((label) => (
                <div key={label} className="border-l border-line py-1.5 text-center text-[11px] font-medium text-ink-muted">
                  {label}
                </div>
              ))}
            </div>
            {monthWeeks(year, month).map((week, weekIndex) => (
              <div
                key={weekIndex}
                className="grid grid-cols-[2.5rem_repeat(7,minmax(0,1fr))] border-b border-line last:border-b-0"
              >
                <Link
                  href={hrefFor(basePath, params, "semaine", week[0])}
                  title={`Voir la semaine ${isoWeekNumber(week[0])}`}
                  className="flex justify-center pt-2 text-[11px] font-medium text-ink-muted transition-colors hover:bg-ink/[0.04] hover:text-ink"
                >
                  S{isoWeekNumber(week[0])}
                </Link>
                {week.map((date) => {
                  const key = dueDateKey(date);
                  const inMonth = date.getMonth() === month;
                  const dayItems = inMonth ? (byDay.get(key) ?? []) : [];
                  const visible = dayItems.slice(0, VISIBLE_PER_DAY);
                  const more = dayItems.slice(VISIBLE_PER_DAY);
                  const cellClass = "flex min-h-28 min-w-0 flex-col gap-0.5 border-l border-line p-1";
                  const content = (
                    <>
                      <span className="mb-0.5 flex justify-center">
                        <Link
                          href={hrefFor(basePath, params, "jour", date)}
                          title="Voir la journée"
                          className={`flex h-6 min-w-6 items-center justify-center rounded-full px-1 text-xs transition-colors ${
                            key === today
                              ? "bg-accent font-medium text-accent-ink"
                              : inMonth
                                ? "text-ink hover:bg-ink/[0.08]"
                                : "text-ink-muted/60 hover:bg-ink/[0.08]"
                          }`}
                        >
                          {date.getDate()}
                        </Link>
                      </span>
                      {visible.map((item) => (
                        <Draggable key={item.id} item={item} onMove={Boolean(onMove)} />
                      ))}
                      {more.length > 0 && (
                        <Link
                          href={hrefFor(basePath, params, "jour", date)}
                          className="rounded px-1.5 py-0.5 text-xs font-medium text-ink-muted hover:bg-ink/[0.06]"
                        >
                          {more.length} autre{more.length > 1 ? "s" : ""}
                        </Link>
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
      )}

      {mode === "semaine" && (
        <div className="mt-3 overflow-x-auto rounded-xl border border-line">
          <div className="grid min-w-[840px] grid-cols-7">
            {Array.from({ length: 7 }, (_, index) => addDays(weekStart, index)).map((date, index) => {
              const key = dueDateKey(date);
              const dayItems = byDay.get(key) ?? [];
              const header = (
                <Link
                  href={hrefFor(basePath, params, "jour", date)}
                  className="flex flex-col items-center gap-1 border-b border-line py-2 transition-colors hover:bg-ink/[0.03]"
                >
                  <span className="text-[11px] font-medium text-ink-muted">{WEEKDAYS[index]}</span>
                  <span
                    className={`flex h-9 w-9 items-center justify-center rounded-full text-lg ${
                      key === today ? "bg-accent font-medium text-accent-ink" : "text-ink"
                    }`}
                  >
                    {date.getDate()}
                  </span>
                </Link>
              );
              const list = (
                <div className="flex flex-col gap-1 p-1.5">
                  {dayItems.map((item) => (
                    <Draggable key={item.id} item={item} onMove={Boolean(onMove)} full />
                  ))}
                </div>
              );
              const cellClass = `flex min-h-[60vh] min-w-0 flex-col ${index > 0 ? "border-l border-line" : ""}`;
              return onMove ? (
                <CalendarDropZone key={key} day={key} onMove={onMove} className={cellClass}>
                  {header}
                  {list}
                </CalendarDropZone>
              ) : (
                <div key={key} className={cellClass}>
                  {header}
                  {list}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {mode === "jour" &&
        (() => {
          const dayItems = byDay.get(dueDateKey(day)) ?? [];
          return (
            <div className="mt-3 rounded-xl border border-line">
              {dayItems.length === 0 ? (
                <p className="px-4 py-8 text-center text-sm text-ink-muted">Rien de prévu ce jour-là.</p>
              ) : (
                <ul className="divide-y divide-line">
                  {dayItems.map((item) => (
                    <li key={item.id}>
                      <Link
                        href={item.href}
                        className={`flex items-start gap-4 px-4 py-3 transition-colors hover:bg-ink/[0.03] ${
                          item.ghost ? "text-ink-muted" : ""
                        }`}
                      >
                        <span className="w-12 shrink-0 pt-0.5 text-sm tabular-nums text-ink-muted">
                          {item.time ?? "—"}
                        </span>
                        <span
                          className={`mt-1.5 h-2.5 w-2.5 shrink-0 rounded-full ${
                            item.ghost ? "border border-dashed border-[var(--color-outline)]" : item.dotClass
                          }`}
                        />
                        <span className="min-w-0 flex-1">
                          <span className="block break-words text-sm font-medium text-ink">{item.title}</span>
                          {item.tooltip && <span className="block text-xs text-ink-muted">{item.tooltip}</span>}
                        </span>
                      </Link>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          );
        })()}

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

/** Petit calendrier du panneau latéral, comme celui d'Agenda : un clic sur
 * un jour ouvre sa journée, un clic sur un numéro de semaine la semaine. */
export function AgendaMiniMonth({
  year,
  month,
  basePath,
  params = {},
  mode = "mois",
  selected,
}: {
  year: number;
  month: number;
  basePath: string;
  params?: Record<string, string>;
  /** Vue en cours, gardée en changeant de mois. */
  mode?: AgendaMode;
  /** Jour affiché (vues Jour et Semaine), mis en évidence. */
  selected?: Date;
}) {
  const weeks = monthWeeks(year, month);
  const today = dueDateKey(toParisWallClockDate(new Date()));
  const selectedKeys = new Set(
    selected && mode !== "mois"
      ? (mode === "jour" ? [selected] : Array.from({ length: 7 }, (_, i) => addDays(startOfWeek(selected), i))).map(dueDateKey)
      : [],
  );
  return (
    <div>
      <div className="flex items-center justify-between pl-2">
        <p className="text-sm font-medium capitalize text-ink">{MONTH_LABEL.format(new Date(year, month, 1))}</p>
        <div className="flex">
          <Link
            href={hrefFor(basePath, params, mode, new Date(year, month - 1, 1))}
            aria-label="Mois précédent"
            className="flex h-7 w-7 items-center justify-center rounded-full text-ink-muted hover:bg-ink/[0.08]"
          >
            <CaretLeft size={14} />
          </Link>
          <Link
            href={hrefFor(basePath, params, mode, new Date(year, month + 1, 1))}
            aria-label="Mois suivant"
            className="flex h-7 w-7 items-center justify-center rounded-full text-ink-muted hover:bg-ink/[0.08]"
          >
            <CaretRight size={14} />
          </Link>
        </div>
      </div>
      <div className="mt-1 grid grid-cols-[1.75rem_repeat(7,minmax(0,1fr))] text-center text-[10px] text-ink-muted">
        <span className="py-1" title="Numéro de semaine">
          S.
        </span>
        {["L", "M", "M", "J", "V", "S", "D"].map((label, index) => (
          <span key={index} className="py-1">
            {label}
          </span>
        ))}
        {weeks.map((week) => [
          <Link
            key={`s-${dueDateKey(week[0])}`}
            href={hrefFor(basePath, params, "semaine", week[0])}
            className="flex items-center justify-center rounded text-[10px] text-ink-muted hover:bg-ink/[0.08] hover:text-ink"
          >
            {isoWeekNumber(week[0])}
          </Link>,
          ...week.map((date) => {
            const key = dueDateKey(date);
            return (
              <span key={key} className={`flex justify-center py-0.5 ${selectedKeys.has(key) ? "bg-select" : ""}`}>
                <Link
                  href={hrefFor(basePath, params, "jour", date)}
                  className={`flex h-6 w-6 items-center justify-center rounded-full text-[11px] transition-colors ${
                    key === today
                      ? "bg-accent font-medium text-accent-ink"
                      : date.getMonth() === month
                        ? "text-ink hover:bg-ink/[0.08]"
                        : "text-ink-muted/50 hover:bg-ink/[0.08]"
                  }`}
                >
                  {date.getDate()}
                </Link>
              </span>
            );
          }),
        ])}
      </div>
    </div>
  );
}
