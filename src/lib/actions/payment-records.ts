"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { db } from "@/lib/db";
import { verifyAdminSession } from "@/lib/dal";

// Suivi de paiement "sans facture" (ajouté le 2026-07-31) — acompte reçu par
// virement, règlement en espèces... : un client, un montant, un statut,
// jamais de fichier. Distinct de `Document`, qui suppose toujours un PDF
// chargé.
const PaymentRecordSchema = z.object({
  clientId: z.string().trim().min(1, { message: "Choisissez un client." }),
  label: z.string().trim().optional(),
  amountEuros: z.coerce
    .number({ message: "Montant invalide." })
    .positive({ message: "Le montant doit être positif." }),
  date: z.string().trim().optional(),
});

export type PaymentRecordFormState = { error?: string } | undefined;

export async function createPaymentRecord(
  _prev: PaymentRecordFormState,
  formData: FormData,
): Promise<PaymentRecordFormState> {
  await verifyAdminSession();

  const parsed = PaymentRecordSchema.safeParse({
    clientId: formData.get("clientId"),
    label: formData.get("label"),
    amountEuros: formData.get("amountEuros"),
    date: formData.get("date"),
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Formulaire invalide." };
  }

  await db.paymentRecord.create({
    data: {
      clientId: parsed.data.clientId,
      label: parsed.data.label || null,
      amountCents: Math.round(parsed.data.amountEuros * 100),
      // Un champ vide retombe sur "maintenant", même défaut que la colonne
      // — évite une date invalide si l'admin laisse le champ vide plutôt
      // que de forcer le champ requis côté formulaire.
      date: parsed.data.date ? new Date(parsed.data.date) : new Date(),
    },
  });

  revalidatePath("/admin/administratif");
  return undefined;
}

// Éditable après coup (demande du 2026-08-16) : le mois affecté aux
// Finances peut devoir être corrigé une fois le paiement déjà saisi.
export async function updatePaymentRecordDate(recordId: string, dateValue: string) {
  await verifyAdminSession();

  const date = new Date(dateValue);
  if (Number.isNaN(date.getTime())) return;

  await db.paymentRecord.update({ where: { id: recordId }, data: { date } });

  revalidatePath("/admin/administratif");
}

export async function setPaymentRecordStatus(recordId: string, status: "paid" | "unpaid") {
  await verifyAdminSession();

  await db.paymentRecord.update({
    where: { id: recordId },
    data: { paymentStatus: status, paidAt: status === "paid" ? new Date() : null },
  });

  revalidatePath("/admin/administratif");
}

export async function deletePaymentRecord(recordId: string) {
  await verifyAdminSession();

  await db.paymentRecord.delete({ where: { id: recordId } });

  revalidatePath("/admin/administratif");
}
