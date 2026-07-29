import "server-only";
import { db } from "@/lib/db";
import { sendEmailToAdmins, getAdminEmails } from "@/lib/email/service";
import { escapeHtml } from "@/lib/html-escape";
import { DOCUMENT_TYPE } from "@/lib/dropdown-lists";
import { EXCLUDE_DEMO_CLIENT } from "@/lib/clients";
import { EXCLUDE_DEMO_CLIENT_TASKS, taskDateFormatter } from "@/lib/tasks";

function startOfWeek(date: Date) {
  const result = new Date(date);
  const day = (result.getDay() + 6) % 7; // lundi = 0
  result.setHours(0, 0, 0, 0);
  result.setDate(result.getDate() - day);
  return result;
}

function endOfWeek(date: Date) {
  const result = startOfWeek(date);
  result.setDate(result.getDate() + 7);
  return result;
}

function itemsList(items: string[]) {
  return `<ul>${items.map((item) => `<li>${item}</li>`).join("")}</ul>`;
}

// Digest hebdomadaire du lundi matin, envoyé à tous les admins — tâches de
// la semaine, relances prospection dues, factures en retard. Suit le
// pattern de sendDueNoteReminders/sendDueProspectReminders (un email
// agrégé), mais ne "marque" rien comme envoyé côté données sources : la
// protection anti-doublon vient uniquement du rythme hebdomadaire du cron
// lui-même (voir /api/cron/weekly-digest).
export async function sendWeeklyDigest() {
  const now = new Date();
  const from = startOfWeek(now);
  const to = endOfWeek(now);

  const [tasksThisWeek, dueProspects, overdueInvoices] = await Promise.all([
    db.task.findMany({
      where: {
        ...EXCLUDE_DEMO_CLIENT_TASKS,
        archivedAt: null,
        OR: [
          { dueDate: { gte: from, lt: to } },
          { eventDate: { gte: from, lt: to } },
        ],
      },
      include: { client: true },
      orderBy: { dueDate: "asc" },
    }),
    db.prospect.findMany({
      where: { nextReminderAt: { lte: now }, reminderSentAt: null },
      orderBy: { nextReminderAt: "asc" },
    }),
    db.document.findMany({
      where: {
        type: { slug: DOCUMENT_TYPE.FACTURE },
        client: EXCLUDE_DEMO_CLIENT,
        paymentStatus: "unpaid",
        dueDate: { lt: now },
      },
      include: { client: true },
      orderBy: { dueDate: "asc" },
    }),
  ]);

  const adminEmails = await getAdminEmails();
  if (adminEmails.length === 0) return { sent: false };

  const sections: string[] = [];

  sections.push(
    `<h2>Tâches de la semaine (${taskDateFormatter.format(from)})</h2>${
      tasksThisWeek.length === 0
        ? "<p>Aucune tâche cette semaine.</p>"
        : itemsList(
            tasksThisWeek.map(
              (task) => `<strong>${escapeHtml(task.title)}</strong> — ${escapeHtml(task.client.name)}`,
            ),
          )
    }`,
  );

  sections.push(
    `<h2>Relances prospection dues</h2>${
      dueProspects.length === 0
        ? "<p>Aucune relance due.</p>"
        : itemsList(
            dueProspects.map((prospect) => {
              const label = prospect.company
                ? `${escapeHtml(prospect.name)} (${escapeHtml(prospect.company)})`
                : escapeHtml(prospect.name);
              return `<strong>${label}</strong>`;
            }),
          )
    }`,
  );

  sections.push(
    `<h2>Factures en retard</h2>${
      overdueInvoices.length === 0
        ? "<p>Aucune facture en retard.</p>"
        : itemsList(
            overdueInvoices.map(
              (doc) => `<strong>${escapeHtml(doc.fileName)}</strong> — ${escapeHtml(doc.client.name)}`,
            ),
          )
    }`,
  );

  await sendEmailToAdmins({
    trigger: "weekly_digest",
    subject: "Résumé de la semaine — Mikko Visuel",
    html: sections.join(""),
  });

  return {
    sent: true,
    taskCount: tasksThisWeek.length,
    prospectReminderCount: dueProspects.length,
    overdueInvoiceCount: overdueInvoices.length,
  };
}
