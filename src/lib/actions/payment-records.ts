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
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Formulaire invalide." };
  }

  await db.paymentRecord.create({
    data: {
      clientId: parsed.data.clientId,
      label: parsed.data.label || null,
      amountCents: Math.round(parsed.data.amountEuros * 100),
    },
  });

  revalidatePath("/admin/documents");
  return undefined;
}

export async function setPaymentRecordStatus(recordId: string, status: "paid" | "unpaid") {
  await verifyAdminSession();

  await db.paymentRecord.update({
    where: { id: recordId },
    data: { paymentStatus: status, paidAt: status === "paid" ? new Date() : null },
  });

  revalidatePath("/admin/documents");
}

export async function deletePaymentRecord(recordId: string) {
  await verifyAdminSession();

  await db.paymentRecord.delete({ where: { id: recordId } });

  revalidatePath("/admin/documents");
}
