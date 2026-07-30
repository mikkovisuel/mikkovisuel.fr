"use server";

import { verifyClientSession, assertNotDemo } from "@/lib/dal";
import { sendEmailToAdmins, getAdminEmails } from "@/lib/email/service";
import { escapeHtml } from "@/lib/html-escape";
import { FeedbackSchema, type FeedbackFormState } from "@/lib/validation/feedback";

export async function submitInterfaceFeedback(
  _prev: FeedbackFormState,
  formData: FormData,
): Promise<FeedbackFormState> {
  const clientUser = await verifyClientSession();
  assertNotDemo(clientUser);

  const parsed = FeedbackSchema.safeParse({ message: formData.get("message") });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Formulaire invalide." };
  }

  const adminEmails = await getAdminEmails();
  if (adminEmails.length === 0) {
    return { error: "Une erreur est survenue, merci de réessayer." };
  }

  await sendEmailToAdmins({
    trigger: "feedback_suggestion",
    subject: `Suggestion d'amélioration interface — ${clientUser.client.name}`,
    html: `
      <p><strong>De :</strong> ${escapeHtml(clientUser.name)}${clientUser.email ? ` (${escapeHtml(clientUser.email)})` : ""} — ${escapeHtml(clientUser.client.name)}</p>
      <p><strong>Message :</strong></p>
      <blockquote>${escapeHtml(parsed.data.message).replace(/\n/g, "<br>")}</blockquote>
    `,
  });

  return { success: true };
}
