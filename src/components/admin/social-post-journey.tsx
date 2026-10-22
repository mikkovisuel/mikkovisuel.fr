"use client";

import { useTransition } from "react";
import Link from "next/link";
import { Check } from "@phosphor-icons/react";
import {
  setSocialPostDraftStatus,
  toggleSocialPostDone,
  toggleSocialPostReady,
  validateSocialPostByAdmin,
} from "@/lib/actions/social-posts";

// Parcours d'une publication en un coup d'œil (2026-10-22) : Idée →
// Rédaction → Création → Validation client → Prête → Publiée. Remplace le
// bloc « Suivi » ; Idée / Rédaction (brouillon), Prête et Publiée se
// cliquent, les autres étapes avancent par les actions (envoi au client…).

type StepState = "done" | "current" | "todo" | "skip" | "alert";

const DAY = new Intl.DateTimeFormat("fr-FR", { day: "numeric", month: "short", timeZone: "Europe/Paris" });
const day = (iso: string | null) => (iso ? DAY.format(new Date(iso)) : undefined);

export function SocialPostJourney({
  postId,
  status,
  readyAt,
  validatedAt,
  publishedAt,
  creation,
}: {
  postId: string;
  status: string;
  readyAt: string | null;
  validatedAt: string | null;
  publishedAt: string | null;
  /** Création demandée (tâche interne), ou null si aucune. */
  creation: { label: string; done: boolean; href: string } | null;
}) {
  const [pending, startTransition] = useTransition();
  const draft = status === "idee" || status === "redaction";
  const validated = status === "valide" || status === "publie";

  const steps: { label: string; state: StepState; sub?: string; onClick?: () => void; href?: string }[] = [
    {
      label: "Idée",
      state: status === "idee" ? "current" : "done",
      onClick: draft && status !== "idee" ? () => startTransition(() => setSocialPostDraftStatus(postId, "idee")) : undefined,
    },
    {
      label: "Rédaction",
      state: status === "redaction" ? "current" : status === "idee" ? "todo" : "done",
      onClick: draft && status !== "redaction" ? () => startTransition(() => setSocialPostDraftStatus(postId, "redaction")) : undefined,
    },
    creation
      ? { label: "Création", state: creation.done ? "done" : "current", sub: creation.label, href: creation.href }
      : { label: "Création", state: "skip", sub: "non demandée" },
    {
      label: status === "a_modifier" ? "Modification" : "Validation client",
      state: status === "a_modifier" ? "alert" : validated ? "done" : status === "a_valider" ? "current" : "todo",
      sub: status === "a_modifier" ? "demandée" : status === "a_valider" ? "envoyée" : validated ? day(validatedAt) : undefined,
      onClick: validated
        ? undefined
        : () => {
            if (window.confirm("Valider cette publication au nom du client (accord obtenu hors de l'app) ?")) {
              startTransition(() => validateSocialPostByAdmin(postId));
            }
          },
    },
    {
      label: "Prête",
      state: readyAt || status === "publie" ? "done" : validated ? "current" : "todo",
      sub: day(readyAt),
      onClick: () => startTransition(() => toggleSocialPostReady(postId)),
    },
    {
      label: "Publiée",
      state: status === "publie" ? "done" : "todo",
      sub: day(publishedAt),
      onClick: validated ? () => startTransition(() => toggleSocialPostDone(postId)) : undefined,
    },
  ];

  return (
    <ol className={`flex min-w-0 items-start overflow-x-auto pb-1 ${pending ? "opacity-60" : ""}`} aria-label="Parcours de la publication">
      {steps.map((step, index) => {
        const dot = {
          done: "border-accent bg-accent text-accent-ink",
          current: "border-accent bg-surface text-ink ring-4 ring-accent/25",
          todo: "border-line bg-surface text-ink-muted",
          skip: "border-dashed border-line bg-surface text-ink-muted/60",
          alert: "border-red-600 bg-red-600 text-white",
        }[step.state];
        const content = (
          <>
            <span className={`flex h-7 w-7 items-center justify-center rounded-full border-2 text-xs font-semibold ${dot}`}>
              {step.state === "done" ? <Check size={14} weight="bold" /> : step.state === "alert" ? "!" : index + 1}
            </span>
            <span className={`mt-1 whitespace-nowrap text-xs ${step.state === "todo" || step.state === "skip" ? "text-ink-muted" : "font-medium text-ink"} ${step.state === "alert" ? "text-danger" : ""}`}>
              {step.label}
            </span>
            {step.sub && <span className="whitespace-nowrap text-[11px] text-ink-muted">{step.sub}</span>}
          </>
        );
        const box = "flex w-24 shrink-0 flex-col items-center text-center";
        return (
          <li key={step.label} className="flex min-w-0 flex-1 items-start">
            {index > 0 && (
              <span
                aria-hidden
                className={`mt-3.5 h-0.5 min-w-3 flex-1 ${steps[index - 1].state === "done" ? "bg-accent" : "bg-line"}`}
              />
            )}
            {step.href ? (
              <Link href={step.href} className={`${box} rounded-lg hover:bg-ink/[0.04]`} title="Ouvrir la tâche de création">
                {content}
              </Link>
            ) : step.onClick ? (
              <button type="button" disabled={pending} onClick={step.onClick} className={`${box} rounded-lg hover:bg-ink/[0.04]`} title={`Cliquer : ${step.label}`}>
                {content}
              </button>
            ) : (
              <span className={box}>{content}</span>
            )}
          </li>
        );
      })}
    </ol>
  );
}
