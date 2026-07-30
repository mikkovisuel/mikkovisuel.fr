import { CaretRight } from "@phosphor-icons/react/dist/ssr";

// Dépliant bâti sur `<details>/<summary>` natifs plutôt qu'un `useState` :
// pas de JavaScript nécessaire, l'accessibilité clavier et le rôle ARIA sont
// fournis par le navigateur, et la section reste dépliable même si le bundle
// client n'est pas encore chargé. Le triangle pivote via `group-open`.
export function CollapsibleSection({
  title,
  count,
  defaultOpen = false,
  children,
}: {
  title: string;
  count?: number;
  defaultOpen?: boolean;
  children: React.ReactNode;
}) {
  return (
    <details open={defaultOpen} className="group">
      <summary className="flex cursor-pointer list-none items-center gap-2 text-sm font-medium text-ink-muted transition-colors hover:text-ink [&::-webkit-details-marker]:hidden">
        <CaretRight
          size={14}
          weight="bold"
          className="shrink-0 transition-transform group-open:rotate-90"
        />
        {title}
        {count !== undefined && (
          <span className="rounded-full border border-line px-2 py-0.5 text-xs font-normal">
            {count}
          </span>
        )}
      </summary>
      <div className="mt-4">{children}</div>
    </details>
  );
}
