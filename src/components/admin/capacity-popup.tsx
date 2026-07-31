"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import { CaretLeft, CaretRight, Check, Gauge, WarningCircle } from "@phosphor-icons/react/dist/ssr";
import { Modal } from "@/components/admin/modal";
import { setWeekCapacity } from "@/lib/actions/capacity";

export interface CapacityWeek {
  /** Étiquette de la semaine, ex. "Semaine du 28 juillet". */
  label: string;
  days: { date: string; dayLabel: string; hours: number | null }[];
}

// Pop-up de saisie de la capacité de travail (demande du 2026-07-31, "je
// rentre mes plannings de charge par semaine et au jour") — une semaine à
// la fois, un champ par jour. Les semaines sont pré-chargées côté serveur
// (voir /admin/planning/page.tsx) plutôt que rechargées à chaque
// navigation : la fenêtre couverte (quelques mois) suffit largement à
// planifier à l'avance sans aller-retour serveur supplémentaire.
export function CapacityPopup({ weeks }: { weeks: CapacityWeek[] }) {
  const [open, setOpen] = useState(false);
  const [weekIndex, setWeekIndex] = useState(0);
  const [state, formAction, pending] = useActionState(setWeekCapacity, undefined);
  const formRef = useRef<HTMLFormElement>(null);

  const week = weeks[weekIndex];

  // Referme la modale de succès en un seul geste (pas de "close" auto sur
  // simple succès, contrairement aux autres formulaires du projet) : l'admin
  // enchaîne probablement plusieurs semaines d'affilée, un bouton "Fermer"
  // dédié en bas du formulaire évite de la rouvrir à chaque semaine.
  useEffect(() => {
    if (state?.success) formRef.current?.reset();
  }, [state]);

  if (!week) return null;

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="inline-flex items-center gap-2 rounded-full border border-line px-4 py-2 text-sm font-medium text-ink transition-colors hover:border-accent hover:bg-accent hover:text-accent-ink"
      >
        <Gauge size={16} weight="regular" />
        Paramétrer la capacité
      </button>

      <Modal open={open} onClose={() => setOpen(false)} title="Capacité de travail">
        <div className="flex items-center justify-between gap-3">
          <button
            type="button"
            onClick={() => setWeekIndex((i) => Math.max(0, i - 1))}
            disabled={weekIndex === 0}
            aria-label="Semaine précédente"
            className="rounded-full border border-line p-2 text-ink-muted transition-colors hover:border-accent hover:text-ink disabled:opacity-30"
          >
            <CaretLeft size={14} weight="bold" />
          </button>
          <p className="text-sm font-medium text-ink">{week.label}</p>
          <button
            type="button"
            onClick={() => setWeekIndex((i) => Math.min(weeks.length - 1, i + 1))}
            disabled={weekIndex === weeks.length - 1}
            aria-label="Semaine suivante"
            className="rounded-full border border-line p-2 text-ink-muted transition-colors hover:border-accent hover:text-ink disabled:opacity-30"
          >
            <CaretRight size={14} weight="bold" />
          </button>
        </div>

        <form ref={formRef} action={formAction} className="mt-4 grid gap-3">
          {week.days.map((day) => (
            <div key={day.date} className="flex items-center justify-between gap-3">
              <label htmlFor={`cap-${day.date}`} className="text-sm text-ink">
                {day.dayLabel}
              </label>
              <div className="flex items-center gap-2">
                <input type="hidden" name="date" value={day.date} />
                <input
                  id={`cap-${day.date}`}
                  name="hours"
                  type="number"
                  min={0}
                  max={24}
                  step={0.5}
                  defaultValue={day.hours ?? ""}
                  placeholder="0"
                  className="w-20 rounded-xl border border-line bg-surface-elevated px-3 py-2 text-right text-sm text-ink focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/30"
                />
                <span className="text-xs text-ink-muted">h</span>
              </div>
            </div>
          ))}

          {state?.error && (
            <div className="flex items-center gap-2 text-sm text-danger">
              <WarningCircle size={16} weight="fill" />
              {state.error}
            </div>
          )}
          {state?.success && (
            <div className="flex items-center gap-2 text-sm text-accent">
              <Check size={16} weight="bold" />
              Capacité enregistrée.
            </div>
          )}

          <div className="flex items-center gap-3 pt-1">
            <button
              type="submit"
              disabled={pending}
              className="rounded-full bg-accent px-5 py-2.5 text-sm font-medium text-accent-ink transition-transform active:scale-[0.98] disabled:opacity-60"
            >
              {pending ? "Enregistrement..." : "Enregistrer cette semaine"}
            </button>
          </div>
        </form>
      </Modal>
    </>
  );
}
