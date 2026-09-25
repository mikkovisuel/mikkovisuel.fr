import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft, Trash } from "@phosphor-icons/react/dist/ssr";
import { verifyAdminSession } from "@/lib/dal";
import { db } from "@/lib/db";
import { ACTIVE_CLIENTS } from "@/lib/clients";
import { DeleteButton } from "@/components/admin/delete-button";
import { StatusBadge } from "@/components/status-badge";
import { PlanForm, PlanStepForm, PlanApplyStartForm } from "@/components/admin/social-plan-forms";
import {
  createPlan,
  createPlanStep,
  deletePlan,
  deletePlanStep,
  duplicatePlan,
  updatePlan,
  updatePlanStep,
} from "@/lib/actions/social-plans";
import { loadSocialFormLists } from "@/lib/social-library";
import { describeOffset } from "@/lib/social-plans";
import { formatDay, formatLabel, networkLabel } from "@/lib/social-posts";

export const metadata: Metadata = {
  title: "Plans de communication — Admin Mikko Visuel",
};

const SECTION = "rounded-2xl border border-line p-6";
const SECTION_TITLE = "text-xs font-medium uppercase tracking-wide text-ink-muted";
const ICON_BUTTON =
  "flex h-7 w-7 shrink-0 items-center justify-center rounded-full border border-line text-ink-muted transition-colors hover:border-danger hover:bg-danger hover:text-white";
const SMALL_BUTTON =
  "rounded-full border border-line px-3 py-1 text-xs text-ink-muted transition-colors hover:border-accent hover:text-ink";

// Plans de communication standard (2026-09-25) : modèles de séquences
// autour d'un évènement (J-30, J-7, J+1), appliqués à un client et une date.
export default async function SocialPlansPage() {
  await verifyAdminSession();

  const [plans, runs, clients, lists] = await Promise.all([
    db.socialPlan.findMany({
      include: { steps: { orderBy: { sortOrder: "asc" } } },
      orderBy: { createdAt: "asc" },
    }),
    db.socialPlanRun.findMany({
      include: {
        client: { select: { name: true } },
        items: {
          include: {
            post: { select: { status: true } },
            task: { select: { status: { select: { slug: true } } } },
          },
        },
      },
      orderBy: { eventDate: "desc" },
      take: 20,
    }),
    db.client.findMany({ where: ACTIVE_CLIENTS, select: { id: true, name: true }, orderBy: { name: "asc" } }),
    loadSocialFormLists(),
  ]);

  return (
    <div className="mx-auto max-w-7xl 2xl:max-w-[100rem] px-4 py-10 sm:px-6 lg:px-8">
      <Link
        href="/admin/reseaux"
        className="inline-flex items-center gap-2 text-sm text-ink-muted transition-colors hover:text-ink"
      >
        <ArrowLeft size={16} weight="regular" />
        Retour aux réseaux sociaux
      </Link>
      <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="font-display text-2xl font-medium tracking-tight text-ink">Plans de communication</h1>
          <p className="mt-1 text-sm text-ink-muted">
            Des séquences prêtes à appliquer autour d&apos;un évènement : J-30, J-7, J+1… Un plan ne produit rien tant
            qu&apos;il n&apos;est pas appliqué à une date.
          </p>
        </div>
        <Link
          href="/admin/reseaux/routines"
          className="rounded-full border border-line px-5 py-2.5 text-sm text-ink transition-colors hover:border-accent"
        >
          Routines récurrentes
        </Link>
      </div>

      {/* --- Appliquer --------------------------------------------------- */}
      {plans.some((plan) => plan.steps.length > 0) && clients.length > 0 && (
        <section className={`mt-8 ${SECTION}`}>
          <h2 className={SECTION_TITLE}>Appliquer un plan</h2>
          <p className="mt-1 text-xs text-ink-muted">
            Vous verrez l&apos;aperçu des étapes avec leurs vraies dates avant que quoi que ce soit ne soit créé.
          </p>
          <div className="mt-4">
            <PlanApplyStartForm
              plans={plans
                .filter((plan) => plan.steps.length > 0)
                .map((plan) => ({ id: plan.id, name: plan.name, steps: plan.steps.length }))}
              clients={clients}
            />
          </div>
        </section>
      )}

      {/* --- Plans appliqués ---------------------------------------------- */}
      {runs.length > 0 && (
        <section className={`mt-6 ${SECTION}`}>
          <h2 className={SECTION_TITLE}>Plans appliqués ({runs.length})</h2>
          <ul className="mt-4 grid gap-2">
            {runs.map((run) => {
              const ready = run.items.filter(
                (item) =>
                  (item.post && item.post.status !== "idee" && item.post.status !== "redaction") ||
                  item.task?.status.slug === "termine",
              ).length;
              return (
                <li key={run.id} className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-line p-3">
                  <div className="min-w-0">
                    <Link
                      href={`/admin/reseaux/plans/suivi/${run.id}`}
                      className="font-medium text-ink underline-offset-2 hover:underline"
                    >
                      {run.eventName}
                    </Link>
                    <p className="mt-1 text-sm text-ink-muted">
                      {run.client.name} · {run.planName} · {formatDay(run.eventDate)}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    {run.canceledAt ? (
                      <StatusBadge label="Annulé" color="red" />
                    ) : (
                      <span className="text-sm text-ink-muted">
                        {ready}/{run.items.length} étape{run.items.length > 1 ? "s" : ""} prête
                        {run.items.length > 1 ? "s" : ""}
                      </span>
                    )}
                  </div>
                </li>
              );
            })}
          </ul>
        </section>
      )}

      {/* --- Modèles de plan ---------------------------------------------- */}
      <div className="mt-6 grid gap-6">
        {plans.map((plan) => (
          <section key={plan.id} className={SECTION}>
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div className="min-w-0">
                <h2 className="font-display text-lg font-medium text-ink">{plan.name}</h2>
                {plan.description && <p className="mt-1 text-sm text-ink-muted">{plan.description}</p>}
                <p className="mt-1 text-xs text-ink-muted">
                  {plan.steps.length} étape{plan.steps.length > 1 ? "s" : ""}
                  {plan.steps.length > 0
                    ? ` · de ${describeOffset(plan.steps[0].offsetDays)} à ${describeOffset(plan.steps[plan.steps.length - 1].offsetDays)}`
                    : ""}
                </p>
              </div>
              <div className="flex items-center gap-2">
                <form action={duplicatePlan.bind(null, plan.id)}>
                  <button type="submit" className={SMALL_BUTTON}>
                    Dupliquer
                  </button>
                </form>
                <DeleteButton
                  action={deletePlan.bind(null, plan.id)}
                  confirmMessage={`Supprimer le plan "${plan.name}" et ses étapes ? Les plans déjà appliqués gardent leur suivi.`}
                  label={`Supprimer ${plan.name}`}
                  icon={<Trash size={14} weight="regular" />}
                  className={ICON_BUTTON}
                />
              </div>
            </div>

            <details className="mt-3">
              <summary className="cursor-pointer text-xs text-ink-muted hover:text-ink">Renommer</summary>
              <div className="mt-3">
                <PlanForm
                  action={updatePlan.bind(null, plan.id)}
                  defaultName={plan.name}
                  defaultDescription={plan.description ?? ""}
                  submitLabel="Enregistrer"
                  resetOnSuccess={false}
                />
              </div>
            </details>

            {plan.steps.length > 0 && (
              <ul className="mt-4 grid gap-3">
                {plan.steps.map((step) => (
                  <li key={step.id} className="rounded-xl border border-line p-4">
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="font-medium text-ink">
                          <span className="mr-2 rounded-full border border-line px-2 py-0.5 text-xs text-ink-muted">
                            {describeOffset(step.offsetDays)}
                          </span>
                          {step.label}
                        </p>
                        <p className="mt-1 text-sm text-ink-muted">
                          {step.time} ·{" "}
                          {[
                            step.createsDraft
                              ? `brouillon ${formatLabel(step.format).toLowerCase()} (${step.networks.map(networkLabel).join(", ") || "réseau à choisir"})`
                              : null,
                            step.createsTask ? "tâche de travail" : null,
                            step.createsReminder ? `rappel ${step.remindDaysBefore} j avant` : null,
                          ]
                            .filter(Boolean)
                            .join(" · ")}
                        </p>
                        <p className="mt-1 text-xs text-ink-muted">Titre : {step.titlePattern}</p>
                      </div>
                      <DeleteButton
                        action={deletePlanStep.bind(null, step.id)}
                        confirmMessage={`Supprimer l'étape "${step.label}" ?`}
                        label={`Supprimer ${step.label}`}
                        icon={<Trash size={14} weight="regular" />}
                        className={ICON_BUTTON}
                      />
                    </div>
                    <details className="mt-3">
                      <summary className="cursor-pointer text-xs text-ink-muted hover:text-ink">Modifier</summary>
                      <div className="mt-3">
                        <PlanStepForm
                          action={updatePlanStep.bind(null, step.id)}
                          categories={lists.categories}
                          taskTypes={lists.taskTypes}
                          submitLabel="Enregistrer"
                          resetOnSuccess={false}
                          defaultValues={{
                            ...step,
                            categoryId: step.categoryId ?? "",
                            captionTemplate: step.captionTemplate ?? "",
                            hashtags: step.hashtags ?? "",
                            taskTypeSlug: step.taskTypeSlug ?? "",
                            taskBrief: step.taskBrief ?? "",
                            actionBrief: step.actionBrief ?? "",
                          }}
                        />
                      </div>
                    </details>
                  </li>
                ))}
              </ul>
            )}

            <details className="mt-4">
              <summary className="cursor-pointer text-sm font-medium text-ink">Ajouter une étape</summary>
              <div className="mt-3">
                <PlanStepForm
                  action={createPlanStep.bind(null, plan.id)}
                  categories={lists.categories}
                  taskTypes={lists.taskTypes}
                />
              </div>
            </details>
          </section>
        ))}
      </div>

      {/* --- Nouveau plan -------------------------------------------------- */}
      <section className={`mt-6 ${SECTION}`}>
        <h2 className={SECTION_TITLE}>Nouveau plan</h2>
        <div className="mt-4 max-w-xl">
          <PlanForm action={createPlan} submitLabel="Créer le plan" />
        </div>
      </section>
    </div>
  );
}
