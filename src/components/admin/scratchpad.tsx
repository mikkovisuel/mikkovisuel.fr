"use client";

import { useState } from "react";
import { ListChecks } from "@phosphor-icons/react";
import { addScratchpadItem, removeScratchpadItem } from "@/lib/actions/scratchpad";

interface ScratchpadItemData {
  id: string;
  label: string;
}

// Pense-bête affiché en haut de l'onglet Tâches, sur les 4 vues — voir
// `ScratchpadItem` dans schema.prisma pour le contexte. Cocher un item le
// retire de la liste tout de suite (pas de "Terminé" à dérouler).
export function Scratchpad({ initialItems }: { initialItems: ScratchpadItemData[] }) {
  const [items, setItems] = useState(initialItems);
  const [newLabel, setNewLabel] = useState("");

  async function handleAdd() {
    const label = newLabel.trim();
    if (!label) return;
    setNewLabel("");
    const item = await addScratchpadItem(label);
    setItems((prev) => [item, ...prev]);
  }

  function handleCheck(id: string) {
    setItems((prev) => prev.filter((item) => item.id !== id));
    removeScratchpadItem(id);
  }

  return (
    <div className="mt-6 rounded-2xl border border-line bg-surface-elevated p-4">
      <div className="flex items-center gap-2 text-sm font-medium text-ink">
        <ListChecks size={16} />
        Pense-bête
      </div>
      <div className="mt-3 flex flex-col gap-1">
        {items.map((item) => (
          <label
            key={item.id}
            className="flex cursor-pointer items-center gap-3 rounded-xl px-2 py-1.5 text-sm text-ink transition-colors hover:bg-surface"
          >
            <input
              type="checkbox"
              onChange={() => handleCheck(item.id)}
              className="h-4 w-4 accent-accent"
            />
            {item.label}
          </label>
        ))}
        <div className="flex items-center gap-2 pt-1">
          <input
            value={newLabel}
            onChange={(e) => setNewLabel(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                handleAdd();
              }
            }}
            placeholder="Ajouter un pense-bête"
            className="flex-1 rounded-xl border border-line bg-surface px-3 py-2 text-sm text-ink placeholder:text-ink-muted/70 focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/30"
          />
          <button
            type="button"
            onClick={handleAdd}
            className="rounded-full border border-line px-4 py-2 text-sm text-ink transition-colors hover:border-accent hover:bg-accent hover:text-accent-ink"
          >
            Ajouter
          </button>
        </div>
      </div>
    </div>
  );
}
