import { PALETTE_BADGE_CLASSES, type PaletteColor } from "@/lib/dropdown-lists";

export function StatusBadge({ label, color }: { label: string; color: string }) {
  const classes = PALETTE_BADGE_CLASSES[color as PaletteColor] ?? PALETTE_BADGE_CLASSES.slate;
  return (
    <span
      className={`inline-flex items-center rounded-full border px-2.5 py-1 text-xs font-medium ${classes}`}
    >
      {label}
    </span>
  );
}
