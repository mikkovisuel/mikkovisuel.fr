"use client";

import { useEffect, useState } from "react";
import { dismissTour } from "@/lib/actions/client-tour";

const STEPS = [
  {
    tourId: "accueil",
    title: "Accueil",
    body: "Vue d'ensemble : ce qui attend une action de votre part et les prochains évènements.",
  },
  {
    tourId: "a-valider",
    title: "À valider",
    body: "Les BAT (bons à tirer) envoyés par Mikko, à valider ou à commenter avant impression/livraison.",
  },
  {
    tourId: "suivi",
    title: "Suivi",
    body: "L'avancement de chacune de vos demandes, du démarrage à la livraison.",
  },
  {
    tourId: "calendrier",
    title: "Calendrier",
    body: "Vos demandes classées par date d'évènement.",
  },
  {
    tourId: "livrables",
    title: "Livrables",
    body: "Les fichiers finaux, prêts à télécharger.",
  },
  {
    tourId: "administratif",
    title: "Administratif",
    body: "Vos devis, contrats et factures — et le paiement en ligne quand il est disponible.",
  },
  {
    tourId: "suggestion",
    title: "Suggestion",
    body: "Une remarque sur l'interface elle-même ? C'est ici, indépendamment d'une tâche précise.",
  },
];

function getTargetRect(tourId: string) {
  const el = document.querySelector(`[data-tour="${tourId}"]`);
  return el?.getBoundingClientRect() ?? null;
}

export function FirstLoginTour() {
  const [stepIndex, setStepIndex] = useState(0);
  const [rect, setRect] = useState<DOMRect | null>(null);
  const [dismissed, setDismissed] = useState(false);

  const step = STEPS[stepIndex];

  useEffect(() => {
    // Décalé au frame suivant (pas un setState synchrone dans l'effet) :
    // laisse la nav se peindre avant de mesurer sa position.
    const frame = requestAnimationFrame(() => setRect(getTargetRect(step.tourId)));
    return () => cancelAnimationFrame(frame);
  }, [step.tourId]);

  if (dismissed) return null;

  async function finish() {
    setDismissed(true);
    await dismissTour();
  }

  function next() {
    if (stepIndex + 1 >= STEPS.length) {
      void finish();
      return;
    }
    setStepIndex(stepIndex + 1);
  }

  const top = rect ? rect.bottom + 12 : 80;
  const left = rect ? Math.min(rect.left, window.innerWidth - 320) : 16;

  return (
    <div className="fixed inset-0 z-50 bg-ink/20">
      {rect && (
        <div
          className="fixed rounded-lg ring-2 ring-accent"
          style={{
            top: rect.top - 4,
            left: rect.left - 4,
            width: rect.width + 8,
            height: rect.height + 8,
          }}
        />
      )}
      <div
        className="fixed w-72 rounded-2xl border border-line bg-surface p-4 shadow-lg"
        style={{ top, left }}
      >
        <p className="text-sm font-medium text-ink">{step.title}</p>
        <p className="mt-1.5 text-sm text-ink-muted">{step.body}</p>
        <div className="mt-3 flex items-center justify-between">
          <button
            type="button"
            onClick={() => void finish()}
            className="text-xs text-ink-muted transition-colors hover:text-ink"
          >
            Passer
          </button>
          <button
            type="button"
            onClick={next}
            className="rounded-full bg-accent px-4 py-1.5 text-xs font-medium text-accent-ink transition-transform active:scale-[0.98]"
          >
            {stepIndex + 1 >= STEPS.length ? "Terminer" : "Suivant"}
          </button>
        </div>
      </div>
    </div>
  );
}
