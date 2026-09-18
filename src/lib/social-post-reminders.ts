import "server-only";
import { db } from "@/lib/db";
import { sendEmailToAdmins } from "@/lib/email/service";
import { escapeHtml } from "@/lib/html-escape";
import {
  SOCIAL_POST_STATUS,
  formatLabel,
  formatSchedule,
  isSameParisDay,
  networkLabel,
  nextSlotOccurrence,
  slotReminderTime,
  toParisDateTimeLocal,
} from "@/lib/social-posts";

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? "https://www.mikkovisuel.fr";

// Rappel "à publier maintenant" du module Community management : en V1
// l'app ne publie rien elle-même (choix du client), c'est Mikko qui publie
// depuis l'application du réseau — encore faut-il qu'il y pense à l'heure
// dite. Appelé toutes les heures par /api/cron/social-post-reminders.
//
// Seules les publications **validées** déclenchent un rappel : une
// publication encore en attente du client n'est pas publiable, elle apparaît
// "en retard" dans /admin/reseaux au lieu de générer un email par heure.
export async function sendDueSocialPostReminders() {
  const due = await db.socialPost.findMany({
    where: {
      status: SOCIAL_POST_STATUS.VALIDE,
      scheduledAt: { lte: new Date() },
      reminderSentAt: null,
    },
    include: { client: { select: { name: true } } },
    orderBy: { scheduledAt: "asc" },
  });
  if (due.length === 0) return { sentCount: 0 };

  const items = due
    .map(
      (post) => `
        <li>
          <strong>${escapeHtml(post.client.name)}</strong> — ${escapeHtml(post.title)}
          (${escapeHtml(post.networks.map(networkLabel).join(", "))}, prévue ${escapeHtml(formatSchedule(post.scheduledAt))})
          — <a href="${SITE_URL}/admin/reseaux/${post.id}">ouvrir</a>
        </li>`,
    )
    .join("");

  await sendEmailToAdmins({
    trigger: "social_post_reminder",
    subject:
      due.length > 1 ? `${due.length} publications à publier maintenant` : `À publier maintenant — ${due[0].title}`,
    html: `
      <p>${due.length > 1 ? "Ces publications validées sont arrivées à leur heure" : "Cette publication validée est arrivée à son heure"} :</p>
      <ul>${items}</ul>
      <p>Une fois publiée, collez le lien du post sur sa fiche pour la marquer "Publiée".</p>
    `,
  });

  // Marqué après la tentative d'envoi, réussie ou non : `sendEmail` ne lève
  // jamais d'erreur (un échec est consigné dans EmailLog), comme pour les
  // autres rappels. Sans ce marquage, un envoi en échec répété relancerait
  // la même alerte toutes les heures.
  await db.socialPost.updateMany({
    where: { id: { in: due.map((post) => post.id) } },
    data: { reminderSentAt: new Date() },
  });

  return { sentCount: due.length };
}

// Créneaux récurrents (livraison 2) : choix "simple rappel" — aucune
// publication n'est créée automatiquement. Pour chaque créneau actif, un
// email part à partir de `slotReminderTime` avec un lien qui pré-remplit la
// création ; une seule fois par occurrence (`lastRemindedFor`). Si une
// publication existe déjà ce jour-là (heure de Paris) pour ce client, pas
// d'email : le créneau est déjà couvert. Appelé par la même tâche horaire
// que les rappels de publication (limite Scalingo de 5 tâches planifiées).
export async function sendDueSlotReminders(now = new Date()) {
  const slots = await db.socialRecurringSlot.findMany({
    where: { active: true },
    include: { client: { select: { name: true } } },
  });

  const due: { slot: (typeof slots)[number]; occurrence: Date }[] = [];
  const covered: { id: string; occurrence: Date }[] = [];
  for (const slot of slots) {
    const occurrence = nextSlotOccurrence(slot.weekday, slot.time, now);
    if (!occurrence) continue;
    if (slot.lastRemindedFor?.getTime() === occurrence.getTime()) continue;
    if (now < slotReminderTime(occurrence, slot.remindDaysBefore)) continue;

    const dayWindow = 36 * 60 * 60 * 1000;
    const nearby = await db.socialPost.findMany({
      where: {
        clientId: slot.clientId,
        scheduledAt: { gte: new Date(occurrence.getTime() - dayWindow), lte: new Date(occurrence.getTime() + dayWindow) },
      },
      select: { scheduledAt: true },
    });
    if (nearby.some((post) => post.scheduledAt && isSameParisDay(post.scheduledAt, occurrence))) {
      covered.push({ id: slot.id, occurrence });
    } else {
      due.push({ slot, occurrence });
    }
  }

  if (due.length > 0) {
    const items = due
      .map(({ slot, occurrence }) => {
        const params = new URLSearchParams({
          clientId: slot.clientId,
          titre: slot.title,
          format: slot.format,
          reseaux: slot.networks.join(","),
          date: toParisDateTimeLocal(occurrence),
        });
        return `
        <li>
          <strong>${escapeHtml(slot.client.name)}</strong> — ${escapeHtml(slot.title)}
          (${escapeHtml(formatLabel(slot.format))}, ${escapeHtml(slot.networks.map(networkLabel).join(", "))},
          ${escapeHtml(formatSchedule(occurrence))})
          — <a href="${SITE_URL}/admin/reseaux/nouveau?${escapeHtml(params.toString())}">préparer la publication</a>
        </li>`;
      })
      .join("");

    await sendEmailToAdmins({
      trigger: "social_slot_reminder",
      subject:
        due.length > 1
          ? `${due.length} créneaux réseaux à préparer`
          : `À préparer — ${due[0].slot.title} (${due[0].slot.client.name})`,
      html: `
      <p>${due.length > 1 ? "Ces créneaux récurrents approchent et n'ont pas encore de publication" : "Ce créneau récurrent approche et n'a pas encore de publication"} :</p>
      <ul>${items}</ul>
      <p>Le lien ouvre une nouvelle publication déjà remplie (client, titre, format, réseaux, date).</p>
    `,
    });
  }

  // Même principe que ci-dessus : marqué après la tentative d'envoi pour ne
  // pas relancer la même alerte toutes les heures. Les créneaux déjà
  // couverts sont marqués aussi, pour ne pas refaire la vérification.
  for (const { id, occurrence } of [...due.map(({ slot, occurrence }) => ({ id: slot.id, occurrence })), ...covered]) {
    await db.socialRecurringSlot.update({ where: { id }, data: { lastRemindedFor: occurrence } });
  }

  return { slotReminderCount: due.length, coveredSlotCount: covered.length };
}
