"use client";

import { useActionState } from "react";
import { ArrowUp, ArrowDown, WarningCircle, Check } from "@phosphor-icons/react/dist/ssr";
import { ColorSelect } from "@/components/admin/color-select";
import { DeleteButton } from "@/components/admin/delete-button";
import { updateDropdownItem, deleteDropdownItem, moveDropdownItem } from "@/lib/actions/dropdown-lists";
import type { PaletteColor } from "@/lib/dropdown-lists";

interface DropdownItemRowProps {
  item: { id: string; label: string; color: string; locked: boolean };
  listId: string;
  listKey: string;
  isFirst: boolean;
  isLast: boolean;
}

export function DropdownItemRow({ item, listId, listKey, isFirst, isLast }: DropdownItemRowProps) {
  const boundUpdate = updateDropdownItem.bind(null, item.id, listKey);
  const [state, formAction, pending] = useActionState(boundUpdate, undefined);

  return (
    <div className="flex flex-col gap-3 px-6 py-4 sm:flex-row sm:items-center sm:justify-between">
      <form action={formAction} className="flex flex-1 flex-wrap items-center gap-3">
        <input
          name="label"
          defaultValue={item.label}
          className="min-w-0 flex-1 rounded-xl border border-line bg-surface-elevated px-3 py-2.5 text-sm text-ink focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/30"
        />
        <ColorSelect name="color" defaultValue={item.color as PaletteColor} />
        <button
          type="submit"
          disabled={pending}
          className="rounded-full border border-line px-4 py-2 text-sm text-ink transition-colors hover:border-accent hover:bg-accent hover:text-accent-ink disabled:opacity-60"
        >
          {pending ? "..." : "Enregistrer"}
        </button>
        {/* Absente avant le 2026-07-31 : un enregistrement réussi ne
            donnait alors aucun signe visible, contrairement à
            ContactEditForm dont ce composant reprend maintenant le motif
            exact (icône + libellé). */}
        {state?.success && (
          <span className="flex items-center gap-1 text-sm text-ink-muted">
            <Check size={14} weight="bold" />
            Enregistré
          </span>
        )}
        {state?.error && (
          <span className="flex items-center gap-1 text-sm text-danger">
            <WarningCircle size={16} weight="fill" />
            {state.error}
          </span>
        )}
      </form>

      <div className="flex items-center gap-2">
        <form action={moveDropdownItem.bind(null, listId, item.id, listKey, "up")}>
          <button
            type="submit"
            disabled={isFirst}
            aria-label="Monter"
            className="flex h-8 w-8 items-center justify-center rounded-full border border-line text-ink-muted transition-colors hover:border-accent hover:bg-accent hover:text-accent-ink disabled:opacity-30"
          >
            <ArrowUp size={14} weight="bold" />
          </button>
        </form>
        <form action={moveDropdownItem.bind(null, listId, item.id, listKey, "down")}>
          <button
            type="submit"
            disabled={isLast}
            aria-label="Descendre"
            className="flex h-8 w-8 items-center justify-center rounded-full border border-line text-ink-muted transition-colors hover:border-accent hover:bg-accent hover:text-accent-ink disabled:opacity-30"
          >
            <ArrowDown size={14} weight="bold" />
          </button>
        </form>
        {!item.locked && (
          <DeleteButton
            action={deleteDropdownItem.bind(null, item.id, listKey)}
            confirmMessage={`Supprimer "${item.label}" ?`}
          />
        )}
      </div>
    </div>
  );
}
