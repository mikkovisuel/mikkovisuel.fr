"use server";

import { verifyClientSession } from "@/lib/dal";
import { sendEmail, getAdminEmail } from "@/lib/email/service";
import { FeedbackSchema, type FeedbackFormState } from "@/lib/validation/feedback";

export async function submitInterfaceFeedback(
  _prev: FeedbackFormState,
  formData: FormData,
): Promise<FeedbackFormState> {
  const clientUser = await verifyClientSession();

  const parsed = FeedbackSchema.safeParse({ message: formData.get("message") });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Formulaire invalide." };
  }

  const adminEmail = await getAdminEmail();
  if (!adminEmail) {
    return { error: "Une erreur est survenue, merci de réessayer." };
  }

  await sendEmail({
    trigger: "feedback_suggestion",
    to: adminEmail,
    subject: `Suggestion d'amélioration interface — ${clientUser.client.name}`,
    html: `
      <p><strong>De :</strong> ${clientUser.name} (${clientUser.email}) — ${clientUser.client.name}</p>
      <p><strong>Message :</strong></p>
      <blockquote>${parsed.data.message.replace(/\n/g, "<br>")}</blockquote>
    `,
  });

  return { success: true };
}
