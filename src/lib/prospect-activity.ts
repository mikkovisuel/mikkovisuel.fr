import "server-only";
import { db } from "@/lib/db";

export type ProspectActivityType =
  | "created"
  | "status_change"
  | "email_sent"
  | "reminder_sent"
  | "converted";

// Un seul point d'écriture pour le fil d'historique d'un prospect — voir
// ProspectActivity dans le schéma. Message déjà mis en forme (dénormalisé),
// pour rester lisible même si le prospect change ensuite.
export async function logProspectActivity(
  prospectId: string,
  type: ProspectActivityType,
  message: string,
) {
  await db.prospectActivity.create({ data: { prospectId, type, message } });
}
