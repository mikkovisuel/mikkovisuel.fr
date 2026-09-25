import "server-only";
import { db } from "@/lib/db";
import { sendEmailToAdmins } from "@/lib/email/service";
import { escapeHtml } from "@/lib/html-escape";
import { SOCIAL_POST_STATUS, formatSchedule } from "@/lib/social-posts";

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? "https://www.mikkovisuel.fr";

// Rappels des étapes d'un plan appliqué (2026-09-25) : chaque étape qui a
// coché "rappel" a une date de rappel calculée à l'application. Envoyé une
// seule fois (`reminderSentAt`), par la tâche planifiée horaire existante.
//
// Une étape déjà publiée ne déclenche rien : le travail est fait.
export async function sendDuePlanStepReminders(now = new Date()) {
  const items = await db.socialPlanRunItem.findMany({
    where: {
      remindAt: { lte: now },
      reminderSentAt: null,
      run: { canceledAt: null },
    },
    include: {
      run: { select: { id: true, eventName: true, client: { select: { name: true } } } },
      post: { select: { id: true, status: true } },
    },
    orderBy: { dueAt: "asc" },
  });

  const due = items.filter((item) => item.post?.status !== SOCIAL_POST_STATUS.PUBLIE);
  if (due.length === 0) {
    // Les étapes déjà publiées sont marquées pour ne plus être examinées.
    if (items.length > 0) {
      await db.socialPlanRunItem.updateMany({
        where: { id: { in: items.map((item) => item.id) } },
        data: { reminderSentAt: now },
      });
    }
    return { planStepReminderCount: 0 };
  }

  const rows = due
    .map(
      (item) => `
        <li>
          <strong>${escapeHtml(item.run.client.name)}</strong> — ${escapeHtml(item.run.eventName)} :
          ${escapeHtml(item.label)} (${escapeHtml(formatSchedule(item.dueAt))})
          — <a href="${SITE_URL}${item.post ? `/admin/reseaux/${item.post.id}` : `/admin/reseaux/plans/suivi/${item.run.id}`}">ouvrir</a>
        </li>`,
    )
    .join("");

  await sendEmailToAdmins({
    trigger: "social_plan_step_reminder",
    subject:
      due.length > 1
        ? `${due.length} étapes de plan à préparer`
        : `Étape à préparer — ${due[0].label} (${due[0].run.eventName})`,
    html: `
      <p>${due.length > 1 ? "Ces étapes de plan de communication arrivent" : "Cette étape de plan de communication arrive"} :</p>
      <ul>${rows}</ul>
    `,
  });

  await db.socialPlanRunItem.updateMany({
    where: { id: { in: items.map((item) => item.id) } },
    data: { reminderSentAt: now },
  });

  return { planStepReminderCount: due.length };
}
