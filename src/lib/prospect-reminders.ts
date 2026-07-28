import "server-only";
import { db } from "@/lib/db";
import { sendEmail, getAdminEmail } from "@/lib/email/service";
import { escapeHtml } from "@/lib/html-escape";
import { logProspectActivity } from "@/lib/prospect-activity";

// Miroir de sendDueNoteReminders (src/lib/note-reminders.ts) : email
// récapitulatif groupé pour les prospects dont la relance est arrivée à
// échéance (Prospect.nextReminderAt <= maintenant, pas encore notifié).
// Alerte l'admin lui-même — jamais un email envoyé au prospect. Appelé par
// /api/cron/prospect-reminders (planifié, voir cron.json).
export async function sendDueProspectReminders() {
  const dueProspects = await db.prospect.findMany({
    where: { nextReminderAt: { lte: new Date() }, reminderSentAt: null },
    orderBy: { nextReminderAt: "asc" },
  });
  if (dueProspects.length === 0) return { sentCount: 0 };

  const adminEmail = await getAdminEmail();
  if (!adminEmail) return { sentCount: 0 };

  const itemsHtml = dueProspects
    .map((prospect) => {
      const label = prospect.company
        ? `${escapeHtml(prospect.name)} (${escapeHtml(prospect.company)})`
        : escapeHtml(prospect.name);
      return `<li><strong>${label}</strong></li>`;
    })
    .join("");

  await sendEmail({
    trigger: "prospect_reminder",
    to: adminEmail,
    subject:
      dueProspects.length > 1
        ? `${dueProspects.length} relances de prospection aujourd'hui`
        : "1 relance de prospection aujourd'hui",
    html: `<p>Il est temps de relancer ${dueProspects.length > 1 ? "ces prospects" : "ce prospect"} :</p><ul>${itemsHtml}</ul>`,
  });

  await db.prospect.updateMany({
    where: { id: { in: dueProspects.map((prospect) => prospect.id) } },
    data: { reminderSentAt: new Date() },
  });
  await Promise.all(
    dueProspects.map((prospect) =>
      logProspectActivity(prospect.id, "reminder_sent", "Relance planifiée envoyée (automatique)."),
    ),
  );

  return { sentCount: dueProspects.length };
}
