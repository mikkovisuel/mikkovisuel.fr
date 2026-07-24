import "server-only";
import { db } from "@/lib/db";
import { sendEmail, getAdminEmail } from "@/lib/email/service";

function plainTextSnippet(html: string, maxLength = 140) {
  const text = html
    .replace(/<[^>]*>/g, " ")
    .replace(/\s+/g, " ")
    .trim();
  if (text.length <= maxLength) return text;
  return `${text.slice(0, maxLength)}…`;
}

// Envoie un email récapitulatif pour les notes dont le rappel est arrivé à
// échéance (Note.reminderAt <= maintenant, pas encore notifié) — un seul
// email groupé plutôt qu'un par note, pour ne pas spammer un jour chargé.
// Appelé par /api/cron/note-reminders (planifié, voir cron.json) et
// pourrait aussi l'être manuellement au besoin.
export async function sendDueNoteReminders() {
  const dueNotes = await db.note.findMany({
    where: { reminderAt: { lte: new Date() }, reminderSentAt: null },
    orderBy: { reminderAt: "asc" },
  });
  if (dueNotes.length === 0) return { sentCount: 0 };

  const adminEmail = await getAdminEmail();
  if (!adminEmail) return { sentCount: 0 };

  const itemsHtml = dueNotes
    .map((note) => {
      const title = note.title.trim() || "Sans titre";
      const preview = plainTextSnippet(note.content);
      return `<li><strong>${title}</strong>${preview ? ` — ${preview}` : ""}</li>`;
    })
    .join("");

  await sendEmail({
    trigger: "note_reminder",
    to: adminEmail,
    subject:
      dueNotes.length > 1
        ? `${dueNotes.length} rappels de notes aujourd'hui`
        : "1 rappel de note aujourd'hui",
    html: `<p>Rappel programmé sur ${dueNotes.length > 1 ? "ces notes" : "cette note"} :</p><ul>${itemsHtml}</ul>`,
  });

  await db.note.updateMany({
    where: { id: { in: dueNotes.map((note) => note.id) } },
    data: { reminderSentAt: new Date() },
  });

  return { sentCount: dueNotes.length };
}
