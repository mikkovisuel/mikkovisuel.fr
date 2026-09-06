import type { Metadata } from "next";
import { FileText } from "@phosphor-icons/react/dist/ssr";
import { verifyAdminSession } from "@/lib/dal";
import { db } from "@/lib/db";
import { EXCLUDE_DEMO_CLIENT } from "@/lib/clients";

export const metadata: Metadata = {
  title: "Facturation — Admin Mikko Visuel",
};

const MONTH_NAMES = [
  "Janvier", "Février", "Mars", "Avril", "Mai", "Juin",
  "Juillet", "Août", "Septembre", "Octobre", "Novembre", "Décembre",
];

export default async function AdminFacturationPage() {
  await verifyAdminSession();

  // Comme Finances (même raisonnement, voir sa note) : le client de démo
  // exclu, mais pas les clients archivés — un ancien client peut encore
  // avoir besoin d'un récapitulatif pour une facture en cours.
  const clients = await db.client.findMany({
    where: EXCLUDE_DEMO_CLIENT,
    orderBy: { name: "asc" },
    select: { id: true, name: true },
  });

  const now = new Date();
  const currentYear = now.getFullYear();
  const yearOptions = Array.from({ length: 6 }, (_, i) => currentYear - i);

  const selectClass =
    "rounded-xl border border-line bg-surface-elevated px-3 py-2.5 text-sm text-ink focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/30";

  return (
    <div className="mx-auto max-w-3xl px-4 py-10 sm:px-6 lg:px-8">
      <h1 className="font-display text-2xl font-medium tracking-tight text-ink">Facturation</h1>
      <p className="mt-2 text-sm text-ink-muted">
        Génère un récapitulatif PDF des tâches terminées d&apos;un client sur un mois donné, à
        joindre à la facture.
      </p>

      <form
        action="/api/exports/facturation"
        target="_blank"
        className="mt-8 grid gap-4 rounded-2xl border border-line p-6 sm:grid-cols-3"
      >
        <div className="flex flex-col gap-2 sm:col-span-3">
          <label htmlFor="clientId" className="text-sm font-medium text-ink">
            Client
          </label>
          <select id="clientId" name="clientId" required className={selectClass}>
            <option value="">Choisir un client</option>
            {clients.map((client) => (
              <option key={client.id} value={client.id}>
                {client.name}
              </option>
            ))}
          </select>
        </div>

        <div className="flex flex-col gap-2">
          <label htmlFor="annee" className="text-sm font-medium text-ink">
            Année
          </label>
          <select id="annee" name="annee" required defaultValue={currentYear} className={selectClass}>
            {yearOptions.map((year) => (
              <option key={year} value={year}>
                {year}
              </option>
            ))}
          </select>
        </div>

        <div className="flex flex-col gap-2 sm:col-span-2">
          <label htmlFor="mois" className="text-sm font-medium text-ink">
            Mois
          </label>
          <select id="mois" name="mois" required defaultValue={now.getMonth() + 1} className={selectClass}>
            {MONTH_NAMES.map((label, index) => (
              <option key={label} value={index + 1}>
                {label}
              </option>
            ))}
          </select>
        </div>

        <div className="sm:col-span-3">
          <button
            type="submit"
            className="inline-flex items-center gap-2 rounded-full bg-accent px-5 py-2.5 text-sm font-medium text-accent-ink transition-transform active:scale-[0.98]"
          >
            <FileText size={16} weight="bold" />
            Générer le PDF
          </button>
        </div>
      </form>

      {/* Seules les tâches au statut "Terminé" sont reprises, groupées par
          date d'évènement — voir src/app/api/exports/facturation/route.ts
          pour la sélection exacte. */}
      <p className="mt-4 text-xs text-ink-muted">
        Seules les tâches au statut « Terminé » apparaissent, comptées sur leur date d&apos;évènement.
      </p>
    </div>
  );
}
