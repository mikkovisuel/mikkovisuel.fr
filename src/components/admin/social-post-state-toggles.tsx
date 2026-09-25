"use client";

import { useTransition } from "react";
import { Check } from "@phosphor-icons/react/dist/ssr";
import { toggleSocialPostDone, toggleSocialPostReady } from "@/lib/actions/social-posts";

// Deux repères d'un coup d'œil sur une publication (2026-09-25) :
//   - "Prête" : le contenu est finalisé côté interne (visuel + texte) ;
//   - "Faite" : elle est en ligne — adossée au statut "Publié", pour qu'il
//     n'y ait jamais deux vérités sur la mise en ligne.
function Toggle({
  checked,
  label,
  hint,
  onToggle,
}: {
  checked: boolean;
  label: string;
  hint: string;
  onToggle: () => void;
}) {
  const [pending, startTransition] = useTransition();
  return (
    <button
      type="button"
      disabled={pending}
      aria-pressed={checked}
      title={hint}
      onClick={() => startTransition(onToggle)}
      className={`inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-sm transition-colors ${
        checked ? "border-accent bg-accent text-accent-ink" : "border-line text-ink-muted hover:border-accent hover:text-ink"
      } ${pending ? "opacity-60" : ""}`}
    >
      <span
        className={`flex h-4 w-4 items-center justify-center rounded border ${
          checked ? "border-accent-ink/40 text-accent-ink" : "border-line text-transparent"
        }`}
      >
        <Check size={10} weight="bold" />
      </span>
      {label}
    </button>
  );
}

export function SocialPostStateToggles({
  postId,
  ready,
  done,
}: {
  postId: string;
  ready: boolean;
  done: boolean;
}) {
  return (
    <div className="flex flex-wrap items-center gap-2">
      <Toggle
        checked={ready}
        label="Prête"
        hint="Contenu finalisé côté interne (visuel et texte)"
        onToggle={() => toggleSocialPostReady(postId)}
      />
      <Toggle
        checked={done}
        label="Faite"
        hint="Publication mise en ligne — équivaut au statut « Publié »"
        onToggle={() => toggleSocialPostDone(postId)}
      />
    </div>
  );
}
