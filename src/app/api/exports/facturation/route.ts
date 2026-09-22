import { NextResponse } from "next/server";
import { getAdminSession } from "@/lib/dal";
import { downloadResponse } from "@/lib/export-response";
import { generateMonthlyRecapPdf } from "@/lib/monthly-recap";

// Récapitulatif mensuel des tâches terminées, PDF téléchargé à la demande
// (rien n'est enregistré côté app — demande explicite du 2026-09-02, "juste
// téléchargé, rien enregistré") — pensé comme pièce jointe à joindre à la
// facture faite ailleurs. Génération déléguée à generateMonthlyRecapPdf
// (src/lib/monthly-recap.ts) depuis le 2026-09-08, pour rester identique à
// celle utilisée en pièce jointe automatique d'un envoi de facture.
export async function GET(request: Request) {
  const admin = await getAdminSession();
  if (!admin) {
    return new NextResponse(null, { status: 403 });
  }

  const url = new URL(request.url);
  const clientId = url.searchParams.get("clientId");
  const annee = Number.parseInt(url.searchParams.get("annee") ?? "", 10);
  const mois = Number.parseInt(url.searchParams.get("mois") ?? "", 10);
  // Aperçu (2026-09-08, "valider chaque pièce jointe avec un aperçu") :
  // affichage inline dans le navigateur plutôt qu'un téléchargement forcé —
  // comportement par défaut inchangé pour tout appelant existant.
  const preview = url.searchParams.get("preview") === "1";

  if (!clientId || !Number.isInteger(annee) || !Number.isInteger(mois) || mois < 1 || mois > 12) {
    return new NextResponse("Client, année et mois sont requis.", { status: 400 });
  }

  const result = await generateMonthlyRecapPdf({ clientId, annee, mois });
  if (!result) {
    return new NextResponse(null, { status: 404 });
  }
  const { buffer, fileName } = result;

  return downloadResponse({
    admin,
    fileName,
    contentType: "application/pdf",
    body: new Uint8Array(buffer),
    disposition: preview ? "inline" : "attachment",
  });
}
