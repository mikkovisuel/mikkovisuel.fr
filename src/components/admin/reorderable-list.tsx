"use client";

import { useState } from "react";
import { ArrowDown, ArrowUp, DotsSixVertical } from "@phosphor-icons/react/dist/ssr";

// Liste cochable et réordonnable de l'écran « Mon affichage » (2026-10-20) :
// cocher = visible, glisser la poignée = changer l'ordre. Les flèches font la
// même chose au clavier et sur téléphone, où le glisser-déposer natif ne
// fonctionne pas.

export interface ReorderableItem {
  key: string;
  label: string;
}

export function ReorderableList({
  items,
  order,
  hidden,
  onChange,
  lockedLabel,
}: {
  items: readonly ReorderableItem[];
  order: string[];
  hidden: string[];
  onChange: (next: { order: string[]; hidden: string[] }) => void;
  /** Élément toujours affiché en tête, non déplaçable (« Tâche », « Nom »). */
  lockedLabel?: string;
}) {
  const [dragged, setDragged] = useState<string | null>(null);
  const labels = new Map(items.map((item) => [item.key, item.label]));
  const keys = order.filter((key) => labels.has(key));

  function move(key: string, to: number) {
    const next = keys.filter((item) => item !== key);
    next.splice(Math.max(0, Math.min(to, next.length)), 0, key);
    onChange({ order: [...next, ...order.filter((item) => !labels.has(item))], hidden });
  }

  function toggle(key: string) {
    onChange({
      order,
      hidden: hidden.includes(key) ? hidden.filter((item) => item !== key) : [...hidden, key],
    });
  }

  return (
    <ul className="grid gap-0.5">
      {lockedLabel && (
        <li className="flex h-9 items-center gap-3 rounded-lg px-2 text-sm text-ink">
          <span className="w-4" />
          <input type="checkbox" checked disabled className="h-4 w-4 accent-[var(--color-ink)]" aria-label={lockedLabel} />
          {lockedLabel}
          <span className="rounded-full border border-line px-2 text-[11px] text-ink-muted">toujours</span>
        </li>
      )}
      {keys.map((key, index) => {
        const visible = !hidden.includes(key);
        return (
          <li
            key={key}
            draggable
            onDragStart={(event) => {
              setDragged(key);
              event.dataTransfer.effectAllowed = "move";
            }}
            onDragOver={(event) => {
              event.preventDefault();
              if (dragged && dragged !== key) move(dragged, index);
            }}
            onDragEnd={() => setDragged(null)}
            className={`group flex h-9 items-center gap-3 rounded-lg px-2 text-sm transition-colors hover:bg-ink/[0.04] ${
              dragged === key ? "bg-select" : ""
            } ${visible ? "text-ink" : "text-ink-muted"}`}
          >
            <DotsSixVertical size={16} className="shrink-0 cursor-grab text-ink-muted" aria-hidden />
            <input
              type="checkbox"
              checked={visible}
              onChange={() => toggle(key)}
              aria-label={`Afficher ${labels.get(key)}`}
              className="h-4 w-4 accent-[var(--color-ink)]"
            />
            <span className="flex-1 truncate">{labels.get(key)}</span>
            <span className="flex items-center transition-opacity focus-within:opacity-100 sm:opacity-0 sm:group-hover:opacity-100">
              <button
                type="button"
                onClick={() => move(key, index - 1)}
                disabled={index === 0}
                aria-label={`Monter ${labels.get(key)}`}
                className="rounded-full p-1.5 text-ink-muted hover:bg-ink/[0.08] hover:text-ink disabled:opacity-30"
              >
                <ArrowUp size={14} />
              </button>
              <button
                type="button"
                onClick={() => move(key, index + 1)}
                disabled={index === keys.length - 1}
                aria-label={`Descendre ${labels.get(key)}`}
                className="rounded-full p-1.5 text-ink-muted hover:bg-ink/[0.08] hover:text-ink disabled:opacity-30"
              >
                <ArrowDown size={14} />
              </button>
            </span>
          </li>
        );
      })}
    </ul>
  );
}
