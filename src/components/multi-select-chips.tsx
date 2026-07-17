import { PALETTE_BADGE_CLASSES, type PaletteColor } from "@/lib/dropdown-lists";

export function MultiSelectChips({
  name,
  options,
  defaultValues = [],
}: {
  name: string;
  options: { slug: string; label: string; color: string }[];
  defaultValues?: string[];
}) {
  return (
    <div className="flex flex-wrap gap-2">
      {options.map((option) => {
        const classes = PALETTE_BADGE_CLASSES[option.color as PaletteColor] ?? PALETTE_BADGE_CLASSES.slate;
        return (
          <label key={option.slug} className="cursor-pointer">
            <input
              type="checkbox"
              name={name}
              value={option.slug}
              defaultChecked={defaultValues.includes(option.slug)}
              className="peer sr-only"
            />
            <span
              className={`inline-flex items-center rounded-full border px-3 py-1.5 text-xs font-medium opacity-40 transition-opacity peer-checked:opacity-100 peer-focus-visible:ring-2 peer-focus-visible:ring-accent/50 ${classes}`}
            >
              {option.label}
            </span>
          </label>
        );
      })}
    </div>
  );
}
