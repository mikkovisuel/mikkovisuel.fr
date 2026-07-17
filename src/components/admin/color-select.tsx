import { PALETTE_COLORS, PALETTE_SWATCH_CLASSES } from "@/lib/dropdown-lists";

export function ColorSelect({
  name,
  defaultValue,
}: {
  name: string;
  defaultValue: string;
}) {
  return (
    <select
      name={name}
      defaultValue={defaultValue}
      className="rounded-xl border border-line bg-surface-elevated px-3 py-2.5 text-sm text-ink focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/30"
    >
      {PALETTE_COLORS.map((color) => (
        <option key={color} value={color}>
          {color}
        </option>
      ))}
    </select>
  );
}

export function ColorSwatch({ color }: { color: string }) {
  const swatchClass = PALETTE_SWATCH_CLASSES[color as keyof typeof PALETTE_SWATCH_CLASSES];
  return <span className={`inline-block h-3 w-3 rounded-full ${swatchClass ?? "bg-ink-muted"}`} />;
}
