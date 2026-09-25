import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft, Trash } from "@phosphor-icons/react/dist/ssr";
import { verifyAdminSession } from "@/lib/dal";
import { db } from "@/lib/db";
import { ACTIVE_CLIENTS } from "@/lib/clients";
import { DeleteButton } from "@/components/admin/delete-button";
import { StatusBadge } from "@/components/status-badge";
import {
  RoutineForm,
  RoutineSetForm,
  ApplyRoutineTemplateForm,
} from "@/components/admin/social-routine-forms";
import {
  createRoutine,
  createRoutineSet,
  deleteRoutine,
  deleteRoutineSet,
  renameRoutineSet,
  applyRoutineTemplate,
  saveRoutineSetAsTemplate,
  toggleRoutine,
  toggleRoutineSet,
  updateRoutine,
} from "@/lib/actions/social-routines";
import { loadSocialFormLists } from "@/lib/social-library";
import { formatSchedule, toParisDateTimeLocal, WEEKDAY_LABELS } from "@/lib/social-posts";
import { describeCadence, nextRoutineOccurrence } from "@/lib/social-routines";
import { describeRoutineProduction } from "@/lib/social-routine-runner";

export const metadata: Metadata = {
  title: "Programmation — Admin Mikko Visuel",
};

const SECTION = "rounded-2xl border border-line p-6";
const SECTION_TITLE = "text-xs font-medium uppercase tracking-wide text-ink-muted";
const ICON_BUTTON =
  "flex h-7 w-7 shrink-0 items-center justify-center rounded-full border border-line text-ink-muted transition-colors hover:border-danger hover:bg-danger hover:text-white";
const SMALL_BUTTON =
  "rounded-full border border-line px-3 py-1 text-xs text-ink-muted transition-colors hover:border-accent hover:text-ink";

// Programmation récurrente du module Réseaux (2026-09-25) : les routines,
// regroupées en calendriers (par client, ou modèles réutilisables).
// Remplace les anciens "créneaux récurrents" de la fiche client.
export default async function SocialRoutinesPage() {
  await verifyAdminSession();

  const [sets, clients, lists] = await Promise.all([
    db.socialRoutineSet.findMany({
      include: {
        client: { select: { id: true, name: true } },
        routines: { orderBy: { createdAt: "asc" } },
      },
      orderBy: [{ isTemplate: "asc" }, { createdAt: "asc" }],
    }),
    db.client.findMany({ where: ACTIVE_CLIENTS, select: { id: true, name: true }, orderBy: { name: "asc" } }),
    loadSocialFormLists(),
  ]);

  const now = new Date();
  const liveSets = sets.filter((set) => !set.isTemplate);
  const templates = sets.filter((set) => set.isTemplate);

  // Semaine type : ce qui revient chaque semaine, placé sous son jour.
  // Les cadences mensuelles sont listées à part (elles n'ont pas leur place
  // dans une semaine).
  const weekly = liveSets.flatMap((set) =>
    set.routines
      .filter((routine) => routine.active && set.active && (routine.cadence === "weekly" || routine.cadence === "biweekly"))
      .flatMap((routine) =>
        routine.weekdays.map((weekday) => ({
          weekday,
          time: routine.time,
          title: routine.title,
          clientName: set.client?.name ?? "Interne",
          biweekly: routine.cadence === "biweekly",
        })),
      ),
  );
  const monthly = liveSets.flatMap((set) =>
    set.routines
      .filter((routine) => routine.active && set.active && routine.cadence.startsWith("monthly"))
      .map((routine) => ({
        title: routine.title,
        clientName: set.client?.name ?? "Interne",
        cadence: describeCadence(routine),
        next: nextRoutineOccurrence(routine, now),
      })),
  );

  return (
    <div className="mx-auto max-w-7xl 2xl:max-w-[100rem] px-4 py-10 sm:px-6 lg:px-8">
      <Link
        href="/admin/reseaux"
        className="inline-flex items-center gap-2 text-sm text-ink-muted transition-colors hover:text-ink"
      >
        <ArrowLeft size={16} weight="regular" />
        Retour aux réseaux sociaux
      </Link>
      <h1 className="mt-4 font-display text-2xl font-medium tracking-tight text-ink">Programmation</h1>
      <p className="mt-1 text-sm text-ink-muted">
        Les routines produisent toutes seules ce que vous décidez : un rappel, un brouillon de publication, une tâche
        de travail. Elles tournent avec la tâche planifiée horaire — rien à lancer à la main.
      </p>

      {/* --- Semaine type ------------------------------------------------ */}
      <section className={`mt-8 ${SECTION}`}>
        <h2 className={SECTION_TITLE}>Semaine type</h2>
        {weekly.length === 0 && monthly.length === 0 ? (
          <p className="mt-2 text-sm text-ink-muted">
            Aucune routine active pour l&apos;instant : créez un calendrier plus bas, ou appliquez un modèle.
          </p>
        ) : (
          <>
            <div className="mt-4 grid gap-2 sm:grid-cols-2 xl:grid-cols-7">
              {WEEKDAY_LABELS.map((label, index) => {
                const dayRoutines = weekly
                  .filter((item) => item.weekday === index + 1)
                  .sort((a, b) => a.time.localeCompare(b.time));
                return (
                  <div key={label} className="min-w-0 rounded-xl border border-line p-3">
                    <p className="text-xs font-medium text-ink-muted">{label}</p>
                    {dayRoutines.length === 0 ? (
                      <p className="mt-2 text-xs text-ink-muted/60">—</p>
                    ) : (
                      <ul className="mt-2 grid gap-2">
                        {dayRoutines.map((item, position) => (
                          <li key={`${item.title}-${position}`} className="min-w-0 text-xs">
                            <p className="break-words font-medium text-ink">{item.title}</p>
                            <p className="break-words text-ink-muted">
                              {item.clientName} · {item.time}
                              {item.biweekly ? " · 1 sem./2" : ""}
                            </p>
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>
                );
              })}
            </div>
            {monthly.length > 0 && (
              <div className="mt-4">
                <p className="text-xs font-medium text-ink-muted">Dans le mois</p>
                <ul className="mt-2 grid gap-1 text-sm">
                  {monthly.map((item, index) => (
                    <li key={`${item.title}-${index}`} className="text-ink-muted">
                      <span className="font-medium text-ink">{item.title}</span> — {item.clientName} · {item.cadence}
                      {item.next ? ` · prochaine : ${formatSchedule(item.next)}` : ""}
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </>
        )}
      </section>

      {/* --- Calendriers de routines ------------------------------------- */}
      <div className="mt-6 grid gap-6">
        {liveSets.map((set) => (
          <section key={set.id} className={SECTION}>
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div className="min-w-0">
                <h2 className="font-display text-lg font-medium text-ink">{set.name}</h2>
                <p className="mt-1 text-sm text-ink-muted">
                  {set.client ? (
                    <Link href={`/admin/reseaux/clients/${set.client.id}`} className="hover:text-ink hover:underline">
                      {set.client.name}
                    </Link>
                  ) : (
                    "Routines internes (sans client)"
                  )}{" "}
                  · {set.routines.length} routine{set.routines.length > 1 ? "s" : ""}
                </p>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                {!set.active && <StatusBadge label="En pause" color="amber" />}
                <form action={toggleRoutineSet.bind(null, set.id)}>
                  <button type="submit" className={SMALL_BUTTON}>
                    {set.active ? "Tout mettre en pause" : "Tout réactiver"}
                  </button>
                </form>
                <form action={saveRoutineSetAsTemplate.bind(null, set.id)}>
                  <button type="submit" className={SMALL_BUTTON}>
                    Enregistrer comme modèle
                  </button>
                </form>
                <DeleteButton
                  action={deleteRoutineSet.bind(null, set.id)}
                  confirmMessage={`Supprimer le calendrier "${set.name}" et ses ${set.routines.length} routine(s) ?`}
                  label={`Supprimer ${set.name}`}
                  icon={<Trash size={14} weight="regular" />}
                  className={ICON_BUTTON}
                />
              </div>
            </div>

            <div className="mt-4">
              <RoutineSetForm
                action={renameRoutineSet.bind(null, set.id)}
                placeholder="Nom du calendrier"
                submitLabel="Renommer"
                defaultValue={set.name}
              />
            </div>

            {set.routines.length > 0 && (
              <ul className="mt-4 grid gap-3">
                {set.routines.map((routine) => {
                  const next = nextRoutineOccurrence(routine, now);
                  return (
                    <li key={routine.id} className="rounded-xl border border-line p-4">
                      <div className="flex flex-wrap items-start justify-between gap-3">
                        <div className={`min-w-0 ${routine.active && set.active ? "" : "opacity-60"}`}>
                          <p className="font-medium text-ink">{routine.title}</p>
                          <p className="mt-1 text-sm text-ink-muted">{describeCadence(routine)}</p>
                          <p className="mt-1 text-xs text-ink-muted">
                            Produit :{" "}
                            {describeRoutineProduction({ ...routine, hasClient: Boolean(set.clientId) })} · avance{" "}
                            {routine.leadDays} j
                          </p>
                          <p className="mt-1 text-xs text-ink-muted">
                            {!routine.active
                              ? "En pause"
                              : !set.active
                                ? "Calendrier en pause"
                                : next
                                  ? `Prochaine : ${formatSchedule(next)}`
                                  : "Plus d'occurrence à venir"}
                          </p>
                        </div>
                        <div className="flex shrink-0 items-center gap-2">
                          <form action={toggleRoutine.bind(null, routine.id)}>
                            <button type="submit" className={SMALL_BUTTON}>
                              {routine.active ? "Pause" : "Réactiver"}
                            </button>
                          </form>
                          <DeleteButton
                            action={deleteRoutine.bind(null, routine.id)}
                            confirmMessage={`Supprimer la routine "${routine.title}" ?`}
                            label={`Supprimer ${routine.title}`}
                            icon={<Trash size={14} weight="regular" />}
                            className={ICON_BUTTON}
                          />
                        </div>
                      </div>
                      <details className="mt-3">
                        <summary className="cursor-pointer text-xs text-ink-muted hover:text-ink">Modifier</summary>
                        <div className="mt-3">
                          <RoutineForm
                            action={updateRoutine.bind(null, routine.id)}
                            categories={lists.categories}
                            taskTypes={lists.taskTypes}
                            hasClient={Boolean(set.clientId)}
                            resetOnSuccess={false}
                            submitLabel="Enregistrer"
                            savedLabel="Routine enregistrée"
                            defaultValues={{
                              ...routine,
                              categoryId: routine.categoryId ?? "",
                              captionTemplate: routine.captionTemplate ?? "",
                              hashtags: routine.hashtags ?? "",
                              taskTypeSlug: routine.taskTypeSlug ?? "",
                              taskBrief: routine.taskBrief ?? "",
                              actionBrief: routine.actionBrief ?? "",
                              activeFrom: routine.activeFrom ? toParisDateTimeLocal(routine.activeFrom).slice(0, 10) : "",
                              activeUntil: routine.activeUntil
                                ? toParisDateTimeLocal(routine.activeUntil).slice(0, 10)
                                : "",
                            }}
                          />
                        </div>
                      </details>
                    </li>
                  );
                })}
              </ul>
            )}

            <details className="mt-4">
              <summary className="cursor-pointer text-sm font-medium text-ink">Ajouter une routine</summary>
              <div className="mt-3">
                <RoutineForm
                  action={createRoutine.bind(null, set.id)}
                  categories={lists.categories}
                  taskTypes={lists.taskTypes}
                  hasClient={Boolean(set.clientId)}
                />
              </div>
            </details>
          </section>
        ))}
      </div>

      {/* --- Modèles ------------------------------------------------------ */}
      <section className={`mt-6 ${SECTION}`}>
        <h2 className={SECTION_TITLE}>Modèles réutilisables ({templates.length})</h2>
        <p className="mt-1 text-xs text-ink-muted">
          Un modèle ne produit rien par lui-même : il sert à installer d&apos;un coup les mêmes routines chez un
          nouveau client.
        </p>
        {templates.length > 0 && (
          <ul className="mt-4 grid gap-2">
            {templates.map((template) => (
              <li key={template.id} className="flex flex-wrap items-start justify-between gap-3 rounded-xl border border-line p-3">
                <div className="min-w-0">
                  <p className="font-medium text-ink">{template.name}</p>
                  <p className="mt-1 text-sm text-ink-muted">
                    {template.routines.length} routine{template.routines.length > 1 ? "s" : ""} —{" "}
                    {template.routines.map((routine) => routine.title).join(", ") || "vide"}
                  </p>
                </div>
                <DeleteButton
                  action={deleteRoutineSet.bind(null, template.id)}
                  confirmMessage={`Supprimer le modèle "${template.name}" ?`}
                  label={`Supprimer ${template.name}`}
                  icon={<Trash size={14} weight="regular" />}
                  className={ICON_BUTTON}
                />
              </li>
            ))}
          </ul>
        )}
        {templates.length > 0 && clients.length > 0 && (
          <div className="mt-4 rounded-xl border border-line p-3">
            <ApplyRoutineTemplateForm
              action={applyRoutineTemplate}
              templates={templates.map((template) => ({
                id: template.id,
                name: template.name,
                count: template.routines.length,
              }))}
              clients={clients}
            />
          </div>
        )}
      </section>

      {/* --- Créer un calendrier ------------------------------------------ */}
      <section className={`mt-6 ${SECTION}`}>
        <h2 className={SECTION_TITLE}>Nouveau calendrier</h2>
        <div className="mt-4 grid gap-4 lg:grid-cols-3">
          {clients.map((client) => (
            <div key={client.id} className="rounded-xl border border-dashed border-line p-3">
              <p className="text-sm font-medium text-ink">{client.name}</p>
              <div className="mt-2">
                <RoutineSetForm
                  action={createRoutineSet.bind(null, client.id, false)}
                  placeholder="Nom (ex. Rythme hebdo)"
                  submitLabel="Créer"
                />
              </div>
            </div>
          ))}
          <div className="rounded-xl border border-dashed border-line p-3">
            <p className="text-sm font-medium text-ink">Routines internes</p>
            <p className="mt-1 text-xs text-ink-muted">Sans client : rappels et pense-bête pour vous.</p>
            <div className="mt-2">
              <RoutineSetForm
                action={createRoutineSet.bind(null, null, false)}
                placeholder="Nom (ex. Mon rythme)"
                submitLabel="Créer"
              />
            </div>
          </div>
          <div className="rounded-xl border border-dashed border-line p-3">
            <p className="text-sm font-medium text-ink">Modèle réutilisable</p>
            <p className="mt-1 text-xs text-ink-muted">
              Ne produit rien : sert à installer les mêmes routines chez un nouveau client.
            </p>
            <div className="mt-2">
              <RoutineSetForm
                action={createRoutineSet.bind(null, null, true)}
                placeholder="Nom (ex. Pack club)"
                submitLabel="Créer"
              />
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
