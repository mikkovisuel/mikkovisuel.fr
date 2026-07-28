"use server";

import { sendEmail, getAdminEmail } from "@/lib/email/service";
import { escapeHtml } from "@/lib/html-escape";
import { ContactSchema, type ContactFormState } from "@/lib/validation/contact";

const SUBJECT_LABELS: Record<string, string> = {
  devis: "Demande de devis",
  question: "Question",
  autre: "Autre",
};

export async function submitContactForm(
  _prev: ContactFormState,
  formData: FormData,
): Promise<ContactFormState> {
  const parsed = ContactSchema.safeParse({
    name: formData.get("name"),
    email: formData.get("email"),
    subject: formData.get("subject"),
    message: formData.get("message"),
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Formulaire invalide." };
  }

  const adminEmail = await getAdminEmail();
  if (!adminEmail) {
    return { error: "Une erreur est survenue, merci de réessayer." };
  }

  const subjectLabel = SUBJECT_LABELS[parsed.data.subject] ?? parsed.data.subject;

  await sendEmail({
    trigger: "contact_form",
    to: adminEmail,
    subject: `Nouveau message de contact — ${subjectLabel}`,
    html: `
      <p><strong>De :</strong> ${escapeHtml(parsed.data.name)} (${escapeHtml(parsed.data.email)})</p>
      <p><strong>Type de demande :</strong> ${escapeHtml(subjectLabel)}</p>
      <p><strong>Message :</strong></p>
      <blockquote>${escapeHtml(parsed.data.message).replace(/\n/g, "<br>")}</blockquote>
    `,
  });

  return { success: true };
}
