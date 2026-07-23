"use client";

import { useState } from "react";
import { Trash } from "@phosphor-icons/react";
import { addChecklistItem, toggleChecklistItem, deleteChecklistItem } from "@/lib/actions/tasks";

interface ChecklistItem {
  id: string;
  label: string;
  done: boolean;
}

export function TaskChecklist({
  taskId,
  initialItems,
}: {
  taskId: string;
  initialItems: ChecklistItem[];
}) {
  const [items, setItems] = useState(initialItems);
  const [newLabel, setNewLabel] = useState("");

  async function handleAdd() {
    const label = newLabel.trim();
    if (!label) return;
    setNewLabel("");
    const item = await addChecklistItem(taskId, label);
    setItems((prev) => [...prev, { id: item.id, label: item.label, done: item.done }]);
  }

  function handleToggle(id: string) {
    setItems((prev) => prev.map((item) => (item.id === id ? { ...item, done: !item.done } : item)));
    toggleChecklistItem(id);
  }

  function handleDelete(id: string) {
    setItems((prev) => prev.filter((item) => item.id !== id));
    deleteChecklistItem(id);
  }

  return (
    <div className="flex flex-col gap-2">
      {items.length === 0 && (
        <p className="text-sm text-ink-muted">Aucune sous-étape pour le moment.</p>
      )}
      {items.map((item) => (
        <div
          key={item.id}
          className="group flex items-center gap-3 rounded-xl border border-line bg-surface-elevated px-3 py-2"
        >
          <input
            type="checkbox"
            checked={item.done}
            onChange={() => handleToggle(item.id)}
            className="h-4 w-4 accent-accent"
          />
          <span className={`flex-1 text-sm ${item.done ? "text-ink-muted line-through" : "text-ink"}`}>
            {item.label}
          </span>
          <button
            type="button"
            onClick={() => handleDelete(item.id)}
            aria-label="Supprimer la sous-étape"
            className="opacity-0 transition-opacity hover:text-danger group-hover:opacity-100"
          >
            <Trash size={14} />
          </button>
        </div>
      ))}
      <div className="flex items-center gap-2">
        <input
          value={newLabel}
          onChange={(e) => setNewLabel(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              handleAdd();
            }
          }}
          placeholder="Ajouter une sous-étape"
          className="flex-1 rounded-xl border border-line bg-surface px-3 py-2 text-sm text-ink focus:outline-none focus:ring-1 focus:ring-accent"
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
  );
}
