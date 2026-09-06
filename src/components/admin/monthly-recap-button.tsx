import { FileText, CaretDown } from "@phosphor-icons/react/dist/ssr";

const MONTH_NAMES = [
  "Janvier", "Février", "Mars", "Avril", "Mai", "Juin",
  "Juillet", "Août", "Septembre", "Octobre", "Novembre", "Décembre",
];

// Raccourci depuis la fiche client (2026-09-06, "ajoute cette fonctionnalité
// dans la page client") vers le récapitulatif PDF mensuel de l'onglet
// Facturation (voir /admin/facturation) : le client est déjà connu ici,
// inutile de le ressaisir — seuls année/mois restent à choisir. Même
// `<details>` sans JavaScript que `ClientSpaceSwitcher`/`FilterMenu`.
export function MonthlyRecapButton({ clientId }: { clientId: string }) {
  const now = new Date();
  const currentYear = now.getFullYear();
  const yearOptions = Array.from({ length: 6 }, (_, i) => currentYear - i);

  const selectClass =
    "rounded-xl border border-line bg-surface-elevated px-3 py-2 text-sm text-ink focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/30";

  return (
    <details className="group relative inline-block">
      <summary className="flex cursor-pointer list-none items-center gap-1.5 text-xs text-ink-muted [&::-webkit-details-marker]:hidden hover:text-ink">
        <FileText size={14} weight="regular" />
        Récapitulatif mensuel (PDF)
        <CaretDown size={10} weight="bold" className="transition-transform group-open:rotate-180" />
      </summary>
      <form
        action="/api/exports/facturation"
        target="_blank"
        className="absolute right-0 z-20 mt-2 flex w-64 flex-col gap-3 rounded-2xl border border-line bg-surface-elevated p-4 shadow-lg"
      >
        <input type="hidden" name="clientId" value={clientId} />
        <div className="flex flex-col gap-1">
          <label htmlFor="mr-annee" className="text-xs font-medium text-ink">
            Année
          </label>
          <select id="mr-annee" name="annee" required defaultValue={currentYear} className={selectClass}>
            {yearOptions.map((year) => (
              <option key={year} value={year}>
                {year}
              </option>
            ))}
          </select>
        </div>
        <div className="flex flex-col gap-1">
          <label htmlFor="mr-mois" className="text-xs font-medium text-ink">
            Mois
          </label>
          <select id="mr-mois" name="mois" required defaultValue={now.getMonth() + 1} className={selectClass}>
            {MONTH_NAMES.map((label, index) => (
              <option key={label} value={index + 1}>
                {label}
              </option>
            ))}
          </select>
        </div>
        <button
          type="submit"
          className="rounded-full bg-accent px-4 py-2 text-sm font-medium text-accent-ink transition-transform active:scale-[0.98]"
        >
          Générer le PDF
        </button>
      </form>
    </details>
  );
}
