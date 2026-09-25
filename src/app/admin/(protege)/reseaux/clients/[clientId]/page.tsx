import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, Trash, FilePdf, PencilSimple } from "@phosphor-icons/react/dist/ssr";
import { verifyAdminSession } from "@/lib/dal";
import { db } from "@/lib/db";
import { DeleteButton } from "@/components/admin/delete-button";
import {
  SocialProfileForm,
  SocialLibraryItemForm,
  MonthlyStatsForm,
} from "@/components/admin/social-client-settings-forms";
import { StatusBadge } from "@/components/status-badge";
import { describeCadence, nextRoutineOccurrence } from "@/lib/social-routines";
import {
  saveSocialProfile,
  addSocialLibraryItem,
  updateSocialLibraryItem,
  deleteSocialLibraryItem,
  saveMonthlyStats,
  deleteMonthlyStats,
} from "@/lib/actions/social-library";
import {
  engagementRate,
  formatCount,
  formatRate,
  formatSchedule,
  toParisWallClockDate,
} from "@/lib/social-posts";

export const metadata: Metadata = {
  title: "Réglages réseaux — Admin Mikko Visuel",
};

const SECTION = "rounded-2xl border border-line p-6";
const SECTION_TITLE = "text-xs font-medium uppercase tracking-wide text-ink-muted";
const ICON_DELETE =
  "flex h-7 w-7 items-center justify-center rounded-full border border-line text-ink-muted transition-colors hover:border-danger hover:bg-danger hover:text-white";
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
      socialRoutineSets: { include: { routines: { orderBy: { createdAt: "asc" } } }, orderBy: { createdAt: "asc" } },
      socialStats: { orderBy: [{ year: "desc" }, { month: "desc" }] },
    },
  });
  if (!client) notFound();

  const hashtagSets = client.socialLibrary.filter((item) => item.kind === "hashtags");
  const templates = client.socialLibrary.filter((item) => item.kind === "template");
  const now = new Date();
  const routineCount = client.socialRoutineSets.reduce((total, set) => total + set.routines.length, 0);
  // Mois proposé par défaut pour la saisie des chiffres : le mois écoulé
  // (on fait le bilan d'un mois une fois qu'il est terminé).
  const parisNow = toParisWallClockDate(now);
  const lastMonth = new Date(parisNow.getFullYear(), parisNow.getMonth() - 1, 1);

  return (
    <div className="mx-auto max-w-7xl 2xl:max-w-[100rem] px-4 py-10 sm:px-6 lg:px-8">
      <Link
        href={`/admin/reseaux?clientId=${client.id}`}
        className="inline-flex items-center gap-2 text-sm text-ink-muted transition-colors hover:text-ink"
      >
        <ArrowLeft size={16} weight="regular" />
        Publications de {client.name}
      </Link>
      <h1 className="mt-4 font-display text-2xl font-medium tracking-tight text-ink">Réglages réseaux</h1>
      <p className="mt-1 text-sm text-ink-muted">{client.name} — visibles de vous seul, jamais du client.</p>

      {/* Deux colonnes sur grand écran : identité éditoriale et bibliothèque à
          gauche, planification et chiffres à droite. */}
      <div className="mt-8 grid grid-cols-1 gap-6 xl:grid-cols-2 xl:items-start">
        <div className="grid min-w-0 grid-cols-1 gap-6">
          <section className={SECTION}>
            <h2 className={SECTION_TITLE}>Ligne éditoriale et ton</h2>
            <div className="mt-4">
              <SocialProfileForm
                action={saveSocialProfile.bind(null, client.id)}
                editorialLine={client.socialProfile?.editorialLine ?? ""}
                brandTone={client.socialProfile?.brandTone ?? ""}
              />
            </div>
          </section>
          <section className={SECTION}>
            <h2 className={SECTION_TITLE}>Groupes de hashtags ({hashtagSets.length})</h2>
            <p className="mt-1 text-xs text-ink-muted">Insérables en un clic dans une publication.</p>
            {hashtagSets.length > 0 && (
              <ul className="mt-4 grid gap-2">
                {hashtagSets.map((item) => (
                  <li key={item.id} className="flex items-start gap-3 rounded-xl border border-line p-3">
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium text-ink">{item.name}</p>
                      <p className="mt-1 break-words text-sm text-ink-muted">{item.content}</p>
                      <details className="mt-2">
                        <summary className="cursor-pointer text-xs text-ink-muted hover:text-ink">Modifier</summary>
                        <div className="mt-2">
                          <SocialLibraryItemForm
                            action={updateSocialLibraryItem.bind(null, item.id)}
                            kind="hashtags"
                            defaultValues={{ name: item.name, content: item.content }}
                          />
                        </div>
                      </details>
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
          <section className={SECTION}>
            <h2 className={SECTION_TITLE}>Modèles de texte ({templates.length})</h2>
            <p className="mt-1 text-xs text-ink-muted">Structures de légende réutilisables, à compléter à chaque publication.</p>
            {templates.length > 0 && (
              <ul className="mt-4 grid gap-2">
                {templates.map((item) => (
                  <li key={item.id} className="flex items-start gap-3 rounded-xl border border-line p-3">
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium text-ink">{item.name}</p>
                      <p className="mt-1 whitespace-pre-wrap text-sm text-ink-muted">{item.content}</p>
                      <details className="mt-2">
                        <summary className="cursor-pointer text-xs text-ink-muted hover:text-ink">Modifier</summary>
                        <div className="mt-2">
                          <SocialLibraryItemForm
                            action={updateSocialLibraryItem.bind(null, item.id)}
                            kind="template"
                            defaultValues={{ name: item.name, content: item.content }}
                          />
                        </div>
                      </details>
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
        </div>
        <div className="grid min-w-0 grid-cols-1 gap-6">
          <section className={SECTION}>
            <h2 className={SECTION_TITLE}>Routines ({routineCount})</h2>
            <p className="mt-1 text-xs text-ink-muted">
              Ce qui revient régulièrement pour ce client : rappel, brouillon de publication, tâche de travail. Le
              détail et la création se font sur la page Programmation, commune à tous les clients.
            </p>
            {client.socialRoutineSets.length === 0 ? (
              <p className="mt-4 text-sm text-ink-muted">Aucune routine pour ce client.</p>
            ) : (
              <ul className="mt-4 grid gap-3">
                {client.socialRoutineSets.map((set) => (
                  <li key={set.id} className="rounded-xl border border-line p-3">
                    <p className="flex flex-wrap items-center gap-2 text-sm font-medium text-ink">
                      {set.name}
                      {!set.active && <StatusBadge label="En pause" color="amber" />}
                    </p>
                    {set.routines.length === 0 ? (
                      <p className="mt-1 text-xs text-ink-muted">Calendrier vide.</p>
                    ) : (
                      <ul className="mt-2 grid gap-1">
                        {set.routines.map((routine) => {
                          const next = nextRoutineOccurrence(routine, now);
                          return (
                            <li key={routine.id} className={`text-sm ${routine.active && set.active ? "" : "opacity-60"}`}>
                              <span className="text-ink">{routine.title}</span>{" "}
                              <span className="text-ink-muted">
                                — {describeCadence(routine)}
                                {routine.active && set.active && next ? ` · prochaine : ${formatSchedule(next)}` : ""}
                                {!routine.active ? " · en pause" : ""}
                              </span>
                            </li>
                          );
                        })}
                      </ul>
                    )}
                  </li>
                ))}
              </ul>
            )}
            <Link
              href="/admin/reseaux/routines"
              className="mt-4 inline-flex rounded-full border border-line px-4 py-2 text-sm text-ink transition-colors hover:border-accent"
            >
              Ouvrir la programmation
            </Link>
          </section>
          <section className={SECTION}>
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
                              <details className="relative">
                                <summary
                                  title="Modifier ce mois"
                                  className="flex h-7 w-7 cursor-pointer list-none items-center justify-center rounded-full border border-line text-ink-muted transition-colors hover:border-accent hover:text-ink"
                                >
                                  <PencilSimple size={14} weight="regular" />
                                </summary>
                                <div className="absolute right-0 z-10 mt-2 w-80 rounded-xl border border-line bg-surface p-3 text-left shadow-lg">
                                  <MonthlyStatsForm
                                    action={saveMonthlyStats.bind(null, client.id)}
                                    defaultYear={stats.year}
                                    defaultMonth={stats.month}
                                    defaultValues={{
                                      followers: stats.followers,
                                      reach: stats.reach,
                                      interactions: stats.interactions,
                                      notes: stats.notes ?? "",
                                    }}
                                  />
                                </div>
                              </details>
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
      </div>
    </div>
  );
}
