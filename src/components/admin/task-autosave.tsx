"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { Check, WarningCircle } from "@phosphor-icons/react/dist/ssr";
import { updateTaskField, type TaskField } from "@/lib/actions/tasks";
import { checkTaskDueDateCapacity } from "@/lib/actions/capacity";
import type { DueDateCapacityCheck } from "@/lib/capacity";
import { formatHoursFromMinutes } from "@/lib/time-tracking";
import { PALETTE_BADGE_CLASSES, type PaletteColor } from "@/lib/dropdown-lists";

// Champs de l'écran d'une tâche qui s'enregistrent tout seuls (refonte
// « panneau Détails », 2026-10-20 — choix du client : enregistrement
// automatique, comme Google). Chaque champ appelle `updateTaskField` quand
// on le quitte (texte) ou dès qu'il change (date, puce), et affiche
// « Enregistré » ou l'erreur juste à côté. Remplace l'ancien formulaire et
// son bouton « Enregistrer » (`TaskEditForm`).

type SaveState = { status: "idle" | "saving" | "saved" | "error"; message?: string };

function useFieldSave(taskId: string, field: TaskField) {
  const [state, setState] = useState<SaveState>({ status: "idle" });
  const [, startTransition] = useTransition();
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  function save(value: string | string[]) {
    setState({ status: "saving" });
    startTransition(async () => {
      const result = await updateTaskField(taskId, field, value);
      if (result.error) {
        setState({ status: "error", message: result.error });
        return;
      }
      setState({ status: "saved" });
      if (timer.current) clearTimeout(timer.current);
      timer.current = setTimeout(() => setState({ status: "idle" }), 2000);
    });
  }

  return { state, save };
}

export function SaveIndicator({ state }: { state: SaveState }) {
  if (state.status === "idle") return null;
  if (state.status === "error") {
    return (
      <span role="alert" className="flex items-center gap-1 text-xs text-danger">
        <WarningCircle size={14} weight="fill" className="shrink-0" />
        {state.message}
      </span>
    );
  }
  return (
    <span role="status" className="flex items-center gap-1 text-xs text-ink-muted">
      {state.status === "saved" && <Check size={12} weight="bold" />}
      {state.status === "saving" ? "Enregistrement…" : "Enregistré"}
    </span>
  );
}

/** Titre de la tâche, en grand, modifiable sur place. */
export function AutosaveTitle({ taskId, value }: { taskId: string; value: string }) {
  const { state, save } = useFieldSave(taskId, "title");
  const [text, setText] = useState(value);
  const saved = useRef(value);

  function commit() {
    const next = text.trim();
    if (!next) {
      setText(saved.current);
      return;
    }
    if (next === saved.current) return;
    saved.current = next;
    save(next);
  }

  return (
    <div className="min-w-0 flex-1">
      <input
        value={text}
        onChange={(event) => setText(event.target.value)}
        onBlur={commit}
        onKeyDown={(event) => {
          if (event.key === "Enter") event.currentTarget.blur();
          if (event.key === "Escape") {
            setText(saved.current);
            event.currentTarget.blur();
          }
        }}
        aria-label="Titre de la tâche"
        maxLength={300}
        className="w-full truncate rounded-lg bg-transparent px-1 py-0.5 text-[22px] leading-tight text-ink hover:bg-ink/[0.04] focus:bg-surface-elevated focus:outline-none"
      />
      <div className="px-1">
        <SaveIndicator state={state} />
      </div>
    </div>
  );
}

/** Description, sans cadre : une zone de texte qui grandit avec son contenu. */
export function AutosaveDescription({ taskId, value }: { taskId: string; value: string }) {
  const { state, save } = useFieldSave(taskId, "description");
  const [text, setText] = useState(value);
  const saved = useRef(value);
  const ref = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    const element = ref.current;
    if (!element) return;
    element.style.height = "auto";
    element.style.height = `${Math.max(element.scrollHeight, 48)}px`;
  }, [text]);

  return (
    <div>
      <textarea
        ref={ref}
        value={text}
        onChange={(event) => setText(event.target.value)}
        onBlur={() => {
          if (text.trim() === saved.current.trim()) return;
          saved.current = text;
          save(text);
        }}
        rows={2}
        placeholder="Ajouter une description…"
        aria-label="Description"
        className="w-full resize-none rounded-lg bg-transparent px-2 py-1.5 text-sm leading-relaxed text-ink placeholder:text-ink-muted hover:bg-ink/[0.04] focus:bg-surface-elevated focus:outline-none"
      />
      <SaveIndicator state={state} />
    </div>
  );
}

const DETAIL_INPUT =
  "h-8 w-full rounded-lg bg-transparent px-2 text-sm text-ink hover:bg-ink/[0.04] focus:bg-surface-elevated focus:outline-none focus:ring-1 focus:ring-line";

/** Date (évènement ou échéance), enregistrée dès qu'elle change. L'échéance
 * garde l'alerte de capacité de l'ancien formulaire. */
export function AutosaveDate({
  taskId,
  field,
  value,
  label,
}: {
  taskId: string;
  field: "eventDate" | "dueDate";
  value: string;
  label: string;
}) {
  const { state, save } = useFieldSave(taskId, field);
  const [date, setDate] = useState(value);
  const [capacity, setCapacity] = useState<DueDateCapacityCheck | null>(null);

  useEffect(() => {
    if (field !== "dueDate" || !date) return;
    let cancelled = false;
    const timer = setTimeout(() => {
      checkTaskDueDateCapacity(date, taskId).then((result) => {
        if (!cancelled) setCapacity(result);
      });
    }, 400);
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [date, field, taskId]);

  const alert = field === "dueDate" && date && capacity && capacity.coverageDays > 0 && capacity.level !== "ok" ? capacity : null;

  return (
    <div className="min-w-0">
      <input
        type="date"
        value={date}
        aria-label={label}
        onChange={(event) => {
          setDate(event.target.value);
          save(event.target.value);
        }}
        className={DETAIL_INPUT}
      />
      <SaveIndicator state={state} />
      {alert && (
        <p className={`mt-1 text-xs ${alert.level === "overload" ? "text-danger" : "text-amber-600 dark:text-amber-400"}`}>
          {alert.level === "overload"
            ? `Surcharge : capacité restante dépassée de ${formatHoursFromMinutes(-alert.remainingMinutes)} d'ici cette échéance.`
            : `Charge proche de la capacité (reste ${formatHoursFromMinutes(alert.remainingMinutes)}).`}
        </p>
      )}
    </div>
  );
}

/** Temps estimé en minutes, enregistré en quittant le champ. */
export function AutosaveMinutes({ taskId, value }: { taskId: string; value: number | null }) {
  const { state, save } = useFieldSave(taskId, "estimatedMinutes");
  const [text, setText] = useState(value?.toString() ?? "");
  const saved = useRef(text);
  const minutes = Number.parseInt(text, 10);

  return (
    <div className="min-w-0">
      <div className="flex items-center gap-2">
        <input
          type="number"
          min={0}
          step={5}
          inputMode="numeric"
          value={text}
          placeholder="—"
          aria-label="Temps estimé en minutes"
          onChange={(event) => setText(event.target.value)}
          onBlur={() => {
            if (text.trim() === saved.current.trim()) return;
            saved.current = text;
            save(text.trim());
          }}
          className={`${DETAIL_INPUT} w-20`}
        />
        <span className="shrink-0 text-xs text-ink-muted">
          min{Number.isFinite(minutes) && minutes >= 60 ? ` · ${formatHoursFromMinutes(minutes)}` : ""}
        </span>
      </div>
      <SaveIndicator state={state} />
    </div>
  );
}

/** Types ou formats : puces cochables, enregistrées à chaque clic. */
export function AutosaveChips({
  taskId,
  field,
  options,
  value,
  label,
}: {
  taskId: string;
  field: "types" | "formats";
  options: { slug: string; label: string; color: string }[];
  value: string[];
  label: string;
}) {
  const { state, save } = useFieldSave(taskId, field);
  const [selected, setSelected] = useState(value);

  return (
    <div className="min-w-0">
      <div role="group" aria-label={label} className="flex flex-wrap gap-1.5">
        {options.map((option) => {
          const on = selected.includes(option.slug);
          const classes = PALETTE_BADGE_CLASSES[option.color as PaletteColor] ?? PALETTE_BADGE_CLASSES.slate;
          return (
            <button
              key={option.slug}
              type="button"
              aria-pressed={on}
              onClick={() => {
                const next = on ? selected.filter((slug) => slug !== option.slug) : [...selected, option.slug];
                setSelected(next);
                save(next);
              }}
              className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-medium transition-opacity ${classes} ${
                on ? "" : "opacity-35 hover:opacity-70"
              }`}
            >
              {option.label}
            </button>
          );
        })}
      </div>
      <SaveIndicator state={state} />
    </div>
  );
}

/** Responsable de la tâche (travail à deux admins, 2026-10-20). L'admin
 * choisi reçoit un e-mail, sauf s'il se l'attribue lui-même. */
export function AutosaveAssignee({
  taskId,
  value,
  admins,
}: {
  taskId: string;
  value: string | null;
  admins: { id: string; label: string }[];
}) {
  const { state, save } = useFieldSave(taskId, "assignedAdminId");
  const [selected, setSelected] = useState(value ?? "");
  return (
    <div className="min-w-0">
      <select
        value={selected}
        aria-label="Attribuée à"
        onChange={(event) => {
          setSelected(event.target.value);
          save(event.target.value);
        }}
        className={DETAIL_INPUT}
      >
        <option value="">Non attribuée</option>
        {admins.map((admin) => (
          <option key={admin.id} value={admin.id}>
            {admin.label}
          </option>
        ))}
      </select>
      <SaveIndicator state={state} />
    </div>
  );
}
