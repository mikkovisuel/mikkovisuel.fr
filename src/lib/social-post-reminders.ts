import "server-only";
import { db } from "@/lib/db";
import { sendEmailToAdmins } from "@/lib/email/service";
import { escapeHtml } from "@/lib/html-escape";
import { SOCIAL_POST_STATUS, formatSchedule, networkLabel } from "@/lib/social-posts";

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
