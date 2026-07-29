"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { verifyClientSession, assertNotDemo } from "@/lib/dal";
import { DOCUMENT_TYPE } from "@/lib/dropdown-lists";
import { getClientIp } from "@/lib/request-ip";
import { sendEmailToAdmins } from "@/lib/email/service";
import { escapeHtml } from "@/lib/html-escape";

const AcceptDevisSchema = z.object({
  acceptedByName: z.string().trim().min(1, { message: "Nom requis." }),
  signatureDataUrl: z
    .string()
    .startsWith("data:image/png;base64,", { message: "Signature invalide." }),
});

export type AcceptDevisState = { error?: string; success?: boolean } | undefined;

// Signature légère sur le devis déjà uploadé par l'admin (pas de générateur
// de devis avec lignes de prix — décision client 2026-07-29) : le client
// dessine sa signature + tape son nom, horodatage + IP enregistrés. Pas de
// valeur légale certifiée, juste un accord tracé qui accélère le cycle
// devis → accord par rapport au PDF téléchargé seul.
export async function acceptDevis(
  documentId: string,
  _prev: AcceptDevisState,
  formData: FormData,
): Promise<AcceptDevisState> {
  const clientUser = await verifyClientSession();
  assertNotDemo(clientUser);

  const parsed = AcceptDevisSchema.safeParse({
    acceptedByName: formData.get("acceptedByName"),
    signatureDataUrl: formData.get("signatureDataUrl"),
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Formulaire invalide." };
  }

  const document = await db.document.findUnique({
    where: { id: documentId },
    include: { type: true, client: true },
  });
  if (!document || document.clientId !== clientUser.clientId) {
    return { error: "Devis introuvable." };
  }
  if (document.type.slug !== DOCUMENT_TYPE.DEVIS) {
    return { error: "Ce document n'est pas un devis." };
  }
  if (document.acceptedAt) {
    return { error: "Ce devis a déjà été accepté." };
  }

  await db.document.update({
    where: { id: documentId },
    data: {
      acceptedAt: new Date(),
      acceptedByName: parsed.data.acceptedByName,
      signatureDataUrl: parsed.data.signatureDataUrl,
      acceptedFromIp: await getClientIp(),
    },
  });

  await sendEmailToAdmins({
    trigger: "devis_accepted",
    subject: `Devis accepté — ${document.client.name}`,
    html: `<p><strong>${escapeHtml(document.client.name)}</strong> a accepté et signé le devis "${escapeHtml(document.fileName)}".</p><p>Signé par : ${escapeHtml(parsed.data.acceptedByName)}</p>`,
  });

  revalidatePath("/espace-client/administratif");
  return { success: true };
}
