import { CaretDown, Buildings } from "@phosphor-icons/react/dist/ssr";
import { switchClientSpace } from "@/lib/actions/client-auth";

// Sélecteur de club (2026-08-25) : n'apparaît que pour un contact rattaché à
// plusieurs clients avec un accès utilisable sur au moins un autre — la
// grande majorité des contacts n'en ont qu'un et ne doivent voir aucun
// changement. Bâti sur `<details>/<summary>` comme `FilterMenu`, pas de
// JavaScript nécessaire : chaque option est son propre petit formulaire vers
// `switchClientSpace`, qui revérifie tout côté serveur avant de basculer.
export function ClientSpaceSwitcher({
  currentClientName,
  otherClients,
}: {
  currentClientName: string;
  otherClients: { clientContactId: string; clientName: string }[];
}) {
  if (otherClients.length === 0) {
    return <span className="hidden text-sm text-ink-muted sm:inline">{currentClientName}</span>;
  }

  return (
    <details className="group relative inline-block">
      <summary className="flex cursor-pointer list-none items-center gap-1.5 text-sm text-ink-muted [&::-webkit-details-marker]:hidden hover:text-ink">
        {currentClientName}
        <CaretDown size={12} weight="bold" className="transition-transform group-open:rotate-180" />
      </summary>
      <div className="absolute right-0 z-20 mt-2 w-56 rounded-2xl border border-line bg-surface-elevated p-2 shadow-lg">
        <p className="px-2 py-1 text-xs text-ink-muted">Basculer vers un autre club</p>
        {otherClients.map((option) => (
          <form key={option.clientContactId} action={switchClientSpace.bind(null, option.clientContactId)}>
            <button
              type="submit"
              className="flex w-full items-center gap-2 rounded-xl px-2 py-2 text-left text-sm text-ink transition-colors hover:bg-accent hover:text-accent-ink"
            >
              <Buildings size={16} weight="regular" />
              {option.clientName}
            </button>
          </form>
        ))}
      </div>
    </details>
  );
}
