import "server-only";
import { NextResponse } from "next/server";
import { logAuditEvent } from "@/lib/audit-log";
import { getClientIp } from "@/lib/request-ip";

// Fin de traitement commune aux routes /api/exports/* (factorisée le
// 2026-09-22 : huit routes répétaient la même journalisation et les mêmes
// en-têtes de téléchargement). Chaque export garde sa propre logique de
// contenu — seul le « qui a téléchargé quoi » et l'en-tête de pièce jointe
// sont mis en commun.

/** Journalise le téléchargement dans la piste d'audit (`data_export`). */
export async function logExportDownload(
  admin: { id: string; email: string },
  fileName: string,
): Promise<void> {
  await logAuditEvent({
    actorType: "ADMIN",
    actorId: admin.id,
    actorLabel: admin.email,
    action: "data_export",
    targetType: "Export",
    targetLabel: fileName,
    ipAddress: await getClientIp(),
  });
}

/**
 * Réponse de téléchargement : journalise puis renvoie le fichier en pièce
 * jointe. `body` accepte aussi bien une chaîne (CSV), un tampon binaire
 * (PDF) qu'un flux (archive ZIP produite au fil de l'eau — dans ce cas
 * aucune `Content-Length` n'est envoyée, la taille n'étant pas connue).
 */
export async function downloadResponse(options: {
  admin: { id: string; email: string };
  fileName: string;
  contentType: string;
  body: BodyInit;
  /** "inline" pour un aperçu dans le navigateur (défaut : téléchargement). */
  disposition?: "attachment" | "inline";
  /** En-têtes supplémentaires (ex. `Cache-Control: no-store`). */
  headers?: Record<string, string>;
}): Promise<NextResponse> {
  await logExportDownload(options.admin, options.fileName);
  return new NextResponse(options.body, {
    headers: {
      "Content-Type": options.contentType,
      "Content-Disposition": `${options.disposition ?? "attachment"}; filename="${options.fileName}"`,
      ...options.headers,
    },
  });
}
