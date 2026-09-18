"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import { ArrowCounterClockwise, CaretLeft, CaretRight, Check, Gauge, WarningCircle } from "@phosphor-icons/react/dist/ssr";
import { Modal } from "@/components/admin/modal";
import { setWeekCapacity } from "@/lib/actions/capacity";
import { useFormSubmit } from "@/lib/use-form-submit";

export interface CapacityWeek {
  /** Étiquette de la semaine, ex. "Semaine du 28 juillet". */
  label: string;
  days: { date: string; dayLabel: string; hours: number | null }[];
}

function toHourStrings(week: CapacityWeek): string[] {
  return week.days.map((day) => (day.hours !== null ? String(day.hours) : ""));
}

function sumHours(values: string[]): number {
  return values.reduce((sum, value) => {
    const parsed = Number.parseFloat(value.replace(",", "."));
    return sum + (Number.isNaN(parsed) ? 0 : parsed);
  }, 0);
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
  const { onSubmit: formSubmit } = useFormSubmit(formAction, { pending, state });
  const formRef = useRef<HTMLFormElement>(null);

  const week = weeks[weekIndex];
  // Champs contrôlés (plutôt que `defaultValue` non contrôlé) : nécessaire
  // pour pouvoir les remplir en un clic depuis "Copier la semaine
  // précédente", et pour afficher un total hebdomadaire qui se met à jour en
  // direct pendant la saisie.
  const [hours, setHours] = useState<string[]>(() => (week ? toHourStrings(week) : []));
  // Réinitialise les champs au changement de semaine en ajustant l'état
  // pendant le rendu (motif documenté par React pour "reset state when a
  // prop changes") plutôt que dans un effet, qui provoquerait un rendu
  // supplémentaire après coup.
  const [renderedWeek, setRenderedWeek] = useState(week);
  if (week !== renderedWeek) {
    setRenderedWeek(week);
    setHours(week ? toHourStrings(week) : []);
  }

  // Referme la modale de succès en un seul geste (pas de "close" auto sur
  // simple succès, contrairement aux autres formulaires du projet) : l'admin
  // enchaîne probablement plusieurs semaines d'affilée, un bouton "Fermer"
  // dédié en bas du formulaire évite de la rouvrir à chaque semaine.
  useEffect(() => {
    if (state?.success) formRef.current?.reset();
  }, [state]);

  if (!week) return null;

  const previousWeek = weekIndex > 0 ? weeks[weekIndex - 1] : null;
  const total = sumHours(hours);

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
          <div className="text-center">
            <p className="text-sm font-medium text-ink">{week.label}</p>
            <p className="text-xs text-ink-muted">
              {total > 0 ? `${total.toString().replace(".", ",")} h au total` : "Aucune heure saisie"}
            </p>
          </div>
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

        {/* Recopie de la semaine précédente (demande du 2026-08-01) : évite de
            ressaisir des heures qui se répètent souvent d'une semaine à
            l'autre. Ne touche que l'état local, pas encore enregistré tant
            que "Enregistrer cette semaine" n'a pas été soumis — recopier puis
            changer d'avis (fermer sans enregistrer) ne modifie rien en base. */}
        {previousWeek && (
          <button
            type="button"
            onClick={() => setHours(toHourStrings(previousWeek))}
            className="mt-4 inline-flex items-center gap-2 rounded-full border border-dashed border-line px-3 py-1.5 text-xs font-medium text-ink-muted transition-colors hover:border-accent hover:text-ink"
          >
            <ArrowCounterClockwise size={13} weight="bold" />
            Copier la semaine précédente ({previousWeek.label.replace("Semaine du ", "")})
          </button>
        )}

        <form ref={formRef} action={formAction} onSubmit={formSubmit} className="mt-4 grid gap-1">
          {week.days.map((day, index) => {
            // Index 5 = samedi, 6 = dimanche (weekDays() part toujours du
            // lundi — voir src/lib/capacity.ts) : distinction visuelle
            // seulement, aucune règle métier ne les traite différemment.
            const isWeekend = index >= 5;
            return (
              <div
                key={day.date}
                className={`flex items-center justify-between gap-3 rounded-lg px-2 py-1.5 ${isWeekend ? "bg-surface" : ""}`}
              >
                <label htmlFor={`cap-${day.date}`} className={`text-sm ${isWeekend ? "text-ink-muted" : "text-ink"}`}>
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
                    value={hours[index] ?? ""}
                    onChange={(event) => {
                      const next = [...hours];
                      next[index] = event.target.value;
                      setHours(next);
                    }}
                    placeholder="0"
                    className="w-20 rounded-xl border border-line bg-surface-elevated px-3 py-2 text-right text-sm text-ink focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/30"
                  />
                  <span className="text-xs text-ink-muted">h</span>
                </div>
              </div>
            );
          })}

          {state?.error && (
            <div className="mt-2 flex items-center gap-2 text-sm text-danger">
              <WarningCircle size={16} weight="fill" />
              {state.error}
            </div>
          )}
          {state?.success && (
            <div className="mt-2 flex items-center gap-2 text-sm text-accent">
              <Check size={16} weight="bold" />
              Capacité enregistrée.
            </div>
          )}

          <div className="flex items-center gap-3 pt-3">
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
