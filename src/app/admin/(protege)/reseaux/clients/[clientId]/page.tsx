import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, Trash, FilePdf } from "@phosphor-icons/react/dist/ssr";
import { verifyAdminSession } from "@/lib/dal";
import { db } from "@/lib/db";
import { DeleteButton } from "@/components/admin/delete-button";
import {
  SocialProfileForm,
  SocialLibraryItemForm,
  RecurringSlotForm,
  MonthlyStatsForm,
} from "@/components/admin/social-client-settings-forms";
import {
  saveSocialProfile,
  addSocialLibraryItem,
  deleteSocialLibraryItem,
  addRecurringSlot,
  toggleRecurringSlot,
  deleteRecurringSlot,
  saveMonthlyStats,
  deleteMonthlyStats,
} from "@/lib/actions/social-library";
import {
  WEEKDAY_LABELS,
  engagementRate,
  formatCount,
  formatLabel,
  formatRate,
  formatSchedule,
  networkLabel,
  nextSlotOccurrence,
  toParisWallClockDate,
} from "@/lib/social-posts";

export const metadata: Metadata = {
  title: "Réglages réseaux — Admin Mikko Visuel",
};

const SECTION = "rounded-2xl border border-line p-6";
const SECTION_TITLE = "text-xs font-medium uppercase tracking-wide text-ink-muted";
const ICON_DELETE =
  "flex h-7 w-7 items-center justify-center rounded-full border border-line text-ink-muted transition-colors hover:border-danger hover:bg-danger hover:text-white";
// "18:00" → "18 h", "09:30" → "9 h 30".
function formatSlotTime(time: string) {
  const [hours, minutes] = time.split(":");
  return minutes === "00" ? `${Number(hours)} h` : `${Number(hours)} h ${minutes}`;
}

const MONTH_FORMATTER = new Intl.DateTimeFormat("fr-FR", { month: "long", year: "numeric", timeZone: "UTC" });

// Réglages "réseaux sociaux" d'un client (livraison 2 du module Community
// management) : tout ce qui se prépare une fois et resert à chaque
// publication. Admin uniquement.
export default async function SocialClientSettingsPage({ params }: { params: Promise<{ clientId: string }> }) {
  await verifyAdminSession();
  const { clientId } = await params;

  const client = await db.client.findUnique({
    where: { id: clientId },
    include: {
      socialProfile: true,
      socialLibrary: { orderBy: { createdAt: "asc" } },
      socialSlots: { orderBy: [{ weekday: "asc" }, { time: "asc" }] },
      socialStats: { orderBy: [{ year: "desc" }, { month: "desc" }] },
    },
  });
  if (!client) notFound();

  const hashtagSets = client.socialLibrary.filter((item) => item.kind === "hashtags");
  const templates = client.socialLibrary.filter((item) => item.kind === "template");
  const now = new Date();
  // Mois proposé par défaut pour la saisie des chiffres : le mois écoulé
  // (on fait le bilan d'un mois une fois qu'il est terminé).
  const parisNow = toParisWallClockDate(now);
  const lastMonth = new Date(parisNow.getFullYear(), parisNow.getMonth() - 1, 1);

  return (
    <div className="mx-auto max-w-3xl px-4 py-10 sm:px-6 lg:px-8">
      <Link
        href={`/admin/reseaux?clientId=${client.id}`}
        className="inline-flex items-center gap-2 text-sm text-ink-muted transition-colors hover:text-ink"
      >
        <ArrowLeft size={16} weight="regular" />
        Publications de {client.name}
      </Link>
      <h1 className="mt-4 font-display text-2xl font-medium tracking-tight text-ink">Réglages réseaux</h1>
      <p className="mt-1 text-sm text-ink-muted">{client.name} — visibles de vous seul, jamais du client.</p>

      <section className={`mt-8 ${SECTION}`}>
        <h2 className={SECTION_TITLE}>Ligne éditoriale et ton</h2>
        <div className="mt-4">
          <SocialProfileForm
            action={saveSocialProfile.bind(null, client.id)}
            editorialLine={client.socialProfile?.editorialLine ?? ""}
            brandTone={client.socialProfile?.brandTone ?? ""}
          />
        </div>
      </section>

      <section className={`mt-6 ${SECTION}`}>
        <h2 className={SECTION_TITLE}>Groupes de hashtags ({hashtagSets.length})</h2>
        <p className="mt-1 text-xs text-ink-muted">Insérables en un clic dans une publication.</p>
        {hashtagSets.length > 0 && (
          <ul className="mt-4 grid gap-2">
            {hashtagSets.map((item) => (
              <li key={item.id} className="flex items-start gap-3 rounded-xl border border-line p-3">
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium text-ink">{item.name}</p>
                  <p className="mt-1 break-words text-sm text-ink-muted">{item.content}</p>
                </div>
                <DeleteButton
                  action={deleteSocialLibraryItem.bind(null, item.id)}
                  confirmMessage={`Supprimer le groupe "${item.name}" ?`}
                  label={`Supprimer ${item.name}`}
                  icon={<Trash size={14} weight="regular" />}
                  className={ICON_DELETE}
                />
              </li>
            ))}
          </ul>
        )}
        <div className="mt-4">
          <SocialLibraryItemForm action={addSocialLibraryItem.bind(null, client.id, "hashtags")} kind="hashtags" />
        </div>
      </section>

      <section className={`mt-6 ${SECTION}`}>
        <h2 className={SECTION_TITLE}>Modèles de texte ({templates.length})</h2>
        <p className="mt-1 text-xs text-ink-muted">Structures de légende réutilisables, à compléter à chaque publication.</p>
        {templates.length > 0 && (
          <ul className="mt-4 grid gap-2">
            {templates.map((item) => (
              <li key={item.id} className="flex items-start gap-3 rounded-xl border border-line p-3">
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium text-ink">{item.name}</p>
                  <p className="mt-1 whitespace-pre-wrap text-sm text-ink-muted">{item.content}</p>
                </div>
                <DeleteButton
                  action={deleteSocialLibraryItem.bind(null, item.id)}
                  confirmMessage={`Supprimer le modèle "${item.name}" ?`}
                  label={`Supprimer ${item.name}`}
                  icon={<Trash size={14} weight="regular" />}
                  className={ICON_DELETE}
                />
              </li>
            ))}
          </ul>
        )}
        <div className="mt-4">
          <SocialLibraryItemForm action={addSocialLibraryItem.bind(null, client.id, "template")} kind="template" />
        </div>
      </section>

      <section className={`mt-6 ${SECTION}`}>
        <h2 className={SECTION_TITLE}>Créneaux récurrents ({client.socialSlots.length})</h2>
        <p className="mt-1 text-xs text-ink-muted">
          Rien n&apos;est créé automatiquement : vous recevez un email à 8 h le jour du rappel, avec un lien qui
          pré-remplit la publication. Pas de rappel si une publication existe déjà ce jour-là pour ce client.
        </p>
        {client.socialSlots.length > 0 && (
          <ul className="mt-4 grid gap-2">
            {client.socialSlots.map((slot) => {
              const next = nextSlotOccurrence(slot.weekday, slot.time, now);
              return (
                <li key={slot.id} className="flex items-start gap-3 rounded-xl border border-line p-3">
                  <div className={`min-w-0 flex-1 ${slot.active ? "" : "opacity-60"}`}>
                    <p className="text-sm font-medium text-ink">{slot.title}</p>
                    <p className="mt-1 text-sm text-ink-muted">
                      Chaque {WEEKDAY_LABELS[slot.weekday - 1]?.toLowerCase()} à {formatSlotTime(slot.time)} ·{" "}
                      {slot.networks.map(networkLabel).join(", ")} · {formatLabel(slot.format)} · rappel{" "}
                      {slot.remindDaysBefore === 0 ? "le jour même" : `${slot.remindDaysBefore} j avant`}
                    </p>
                    <p className="mt-1 text-xs text-ink-muted">
                      {slot.active ? `Prochain : ${formatSchedule(next)}` : "En pause"}
                    </p>
                  </div>
                  <form action={toggleRecurringSlot.bind(null, slot.id)}>
                    <button
                      type="submit"
                      className="rounded-full border border-line px-3 py-1 text-xs text-ink-muted transition-colors hover:border-accent hover:text-ink"
                    >
                      {slot.active ? "Mettre en pause" : "Réactiver"}
                    </button>
                  </form>
                  <DeleteButton
                    action={deleteRecurringSlot.bind(null, slot.id)}
                    confirmMessage={`Supprimer le créneau "${slot.title}" ?`}
                    label={`Supprimer ${slot.title}`}
                    icon={<Trash size={14} weight="regular" />}
                    className={ICON_DELETE}
                  />
                </li>
              );
            })}
          </ul>
        )}
        <div className="mt-4">
          <RecurringSlotForm action={addRecurringSlot.bind(null, client.id)} />
        </div>
      </section>

      <section className={`mt-6 ${SECTION}`}>
        <h2 className={SECTION_TITLE}>Chiffres mensuels et rapport</h2>
        <p className="mt-1 text-xs text-ink-muted">
          Chiffres globaux du client pour le mois, repris dans le rapport PDF avec les publications du mois.
        </p>
        {client.socialStats.length > 0 && (
          <div className="mt-4 overflow-x-auto">
            <table className="w-full min-w-[560px] text-sm">
              <thead>
                <tr className="text-left text-xs text-ink-muted">
                  <th className="py-2 pr-3 font-medium">Mois</th>
                  <th className="py-2 pr-3 font-medium">Abonnés</th>
                  <th className="py-2 pr-3 font-medium">Portée</th>
                  <th className="py-2 pr-3 font-medium">Interactions</th>
                  <th className="py-2 pr-3 font-medium">Engagement</th>
                  <th className="py-2" />
                </tr>
              </thead>
              <tbody className="divide-y divide-line">
                {client.socialStats.map((stats, index) => {
                  // Évolution par rapport au mois **précédent saisi**
                  // (la liste est triée du plus récent au plus ancien).
                  const previous = client.socialStats[index + 1];
                  const isConsecutive =
                    previous &&
                    (previous.year * 12 + previous.month) === (stats.year * 12 + stats.month - 1);
                  const growth =
                    isConsecutive && stats.followers !== null && previous.followers !== null
                      ? stats.followers - previous.followers
                      : null;
                  return (
                    <tr key={stats.id}>
                      <td className="py-2 pr-3 capitalize text-ink">
                        {MONTH_FORMATTER.format(new Date(Date.UTC(stats.year, stats.month - 1, 1)))}
                      </td>
                      <td className="py-2 pr-3 text-ink">
                        {formatCount(stats.followers)}
                        {growth !== null && (
                          <span className={`ml-1.5 text-xs ${growth >= 0 ? "text-accent-ink dark:text-accent" : "text-danger"}`}>
                            {growth >= 0 ? "+" : ""}
                            {formatCount(growth)}
                          </span>
                        )}
                      </td>
                      <td className="py-2 pr-3 text-ink">{formatCount(stats.reach)}</td>
                      <td className="py-2 pr-3 text-ink">{formatCount(stats.interactions)}</td>
                      <td className="py-2 pr-3 text-ink">{formatRate(engagementRate(stats.reach, stats.interactions))}</td>
                      <td className="py-2">
                        <div className="flex items-center justify-end gap-2">
                          <a
                            href={`/api/exports/reseaux?clientId=${client.id}&annee=${stats.year}&mois=${stats.month}`}
                            title="Rapport PDF du mois"
                            aria-label="Rapport PDF du mois"
                            className="flex h-7 w-7 items-center justify-center rounded-full border border-line text-ink-muted transition-colors hover:border-accent hover:bg-accent hover:text-accent-ink"
                          >
                            <FilePdf size={14} weight="regular" />
                          </a>
                          <DeleteButton
                            action={deleteMonthlyStats.bind(null, stats.id)}
                            confirmMessage="Supprimer les chiffres de ce mois ?"
                            label="Supprimer ce mois"
                            icon={<Trash size={14} weight="regular" />}
                            className={ICON_DELETE}
                          />
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
        <div className="mt-4">
          <MonthlyStatsForm
            action={saveMonthlyStats.bind(null, client.id)}
            defaultYear={lastMonth.getFullYear()}
            defaultMonth={lastMonth.getMonth() + 1}
          />
        </div>
      </section>
    </div>
  );
}
