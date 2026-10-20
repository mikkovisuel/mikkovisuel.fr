import "server-only";
import { db } from "@/lib/db";
import { sendEmail } from "@/lib/email/service";
import { escapeHtml } from "@/lib/html-escape";

// Travail à deux admins (2026-10-20) : prévenir par e-mail l'admin à qui l'on
// attribue une tâche, une publication ou une action. Jamais quand on se
// l'attribue soi-même, ni quand on retire l'attribution.

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? "https://www.mikkovisuel.fr";

const KIND_LABELS = {
  task: "la tâche",
  post: "la publication",
  action: "l'action",
} as const;

export async function notifyAssignment(input: {
  kind: keyof typeof KIND_LABELS;
  title: string;
  /** Chemin dans l'admin, ex. `/admin/taches/abc`. */
  path: string;
  assigneeId: string | null;
  byAdmin: { id: string; email: string };
}) {
  if (!input.assigneeId || input.assigneeId === input.byAdmin.id) return;
  const assignee = await db.admin.findUnique({ where: { id: input.assigneeId }, select: { email: true } });
  if (!assignee) return;
  const what = KIND_LABELS[input.kind];
  await sendEmail({
    trigger: "assignment",
    to: assignee.email,
    subject: `On vous a attribué ${what} « ${input.title} »`,
    html: `<p>${escapeHtml(input.byAdmin.email)} vous a attribué ${what} « ${escapeHtml(input.title)} ».</p><p><a href="${SITE_URL}${input.path}">Ouvrir dans l'admin</a></p>`,
  });
}

/** Liste des admins pour les menus « Attribué à ». */
export async function listAssignableAdmins() {
  const admins = await db.admin.findMany({ select: { id: true, email: true }, orderBy: { createdAt: "asc" } });
  return admins.map((admin) => ({ id: admin.id, label: admin.email.split("@")[0], email: admin.email }));
}

/** Champ « Attribué à » d'un formulaire : `undefined` si le formulaire n'en a
 * pas (rien à changer), `null` si « Non attribué », sinon l'id d'un admin
 * existant. */
export async function readAssigneeFromForm(
  formData: FormData,
): Promise<{ value: string | null | undefined } | { error: string }> {
  if (!formData.has("assignedAdminId")) return { value: undefined };
  const raw = String(formData.get("assignedAdminId") ?? "").trim();
  if (!raw) return { value: null };
  const admin = await db.admin.findUnique({ where: { id: raw }, select: { id: true } });
  return admin ? { value: admin.id } : { error: "Admin introuvable." };
}
