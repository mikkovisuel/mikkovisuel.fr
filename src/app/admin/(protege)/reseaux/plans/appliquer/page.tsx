import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { verifyAdminSession } from "@/lib/dal";
import { db } from "@/lib/db";
import { applyPlan } from "@/lib/actions/social-plans";
import { PlanApplyPreview } from "@/components/admin/social-plan-apply-preview";
import { describeOffset, fillPlanTemplate, stepDate } from "@/lib/social-plans";
import { formatDay, formatLabel, formatSchedule, networkLabel } from "@/lib/social-posts";
import { PageToolbar, PAGE_BODY } from "@/components/admin/page-toolbar";

export const metadata: Metadata = {
  title: "Appliquer un plan — Admin Mikko Visuel",
};

// Aperçu avant application (2026-09-25) : rien n'est créé ici. Les étapes
// déjà passées sont décochées et signalées (choix du client), mais restent
// cochables pour rattraper un plan appliqué tard.
export default async function ApplyPlanPage({
  searchParams,
}: {
  searchParams: Promise<{
    planId?: string;
    clientId?: string;
    nom?: string;
    date?: string;
    lieu?: string;
    tacheId?: string;
  }>;
}) {
  await verifyAdminSession();
  const { planId, clientId, nom, date, lieu, tacheId } = await searchParams;

  const [plan, client] = await Promise.all([
    planId
      ? db.socialPlan.findUnique({ where: { id: planId }, include: { steps: { orderBy: { sortOrder: "asc" } } } })
      : null,
    clientId ? db.client.findUnique({ where: { id: clientId }, select: { id: true, name: true } }) : null,
  ]);
  if (!plan || !client || !nom || !date || !/^\d{4}-\d{2}-\d{2}$/.test(date)) notFound();

  const eventDate = new Date(`${date}T12:00:00.000Z`);
  const now = new Date();
  const values = {
    evenement: nom,
    client: client.name,
    lieu: lieu ?? "",
    date: formatDay(eventDate),
    etape: "",
  };

  const steps = plan.steps
    .map((step) => {
      const due = stepDate(eventDate, step.offsetDays, step.time);
      return {
        id: step.id,
        label: step.label,
        offset: describeOffset(step.offsetDays),
        dueLabel: due ? formatSchedule(due) : "Date invalide",
        past: due ? due < now : false,
        title: fillPlanTemplate(step.titlePattern, { ...values, etape: step.label }),
        production: [
          step.createsDraft
            ? `brouillon ${formatLabel(step.format).toLowerCase()} (${step.networks.map(networkLabel).join(", ") || "réseau à choisir"})`
            : null,
          step.createsTask ? "tâche de travail" : null,
          step.createsReminder ? `rappel ${step.remindDaysBefore} j avant` : null,
        ]
          .filter(Boolean)
          .join(" · "),
      };
    })
    .filter((step) => step.dueLabel !== "Date invalide");

  const pastCount = steps.filter((step) => step.past).length;

  return (
    <>
      <PageToolbar title={plan.name} back={{ href: "/admin/reseaux/plans", label: "Retour aux plans" }} />
      <div className={`${PAGE_BODY} mx-auto max-w-3xl`}>
        <p className="text-sm text-ink-muted">
          {client.name} · {nom} · {formatDay(eventDate)}
          {lieu ? ` · ${lieu}` : ""}
        </p>
        <div className="mt-6 rounded-2xl border border-line p-6">
          <h2 className="text-xs font-medium uppercase tracking-wide text-ink-muted">
            Aperçu ({steps.length} étape{steps.length > 1 ? "s" : ""})
          </h2>
          <p className="mt-1 text-xs text-ink-muted">
            Rien n&apos;est créé tant que vous n&apos;avez pas validé.
            {pastCount > 0
              ? ` ${pastCount} étape${pastCount > 1 ? "s sont déjà passées et sont décochées" : " est déjà passée et est décochée"} — cochez-la pour la créer quand même.`
              : ""}
          </p>
          <div className="mt-4">
            <PlanApplyPreview
              action={applyPlan}
              steps={steps}
              hidden={{
                planId: plan.id,
                clientId: client.id,
                eventName: nom,
                eventPlace: lieu ?? "",
                eventDate: date,
                sourceTaskId: tacheId ?? "",
              }}
            />
          </div>
        </div>
      </div>
    </>
  );
}
