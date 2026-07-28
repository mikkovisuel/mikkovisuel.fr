import "server-only";
import { verifyAdminSession } from "@/lib/dal";
import { verifyPassword } from "@/lib/password";

export type StepUpFormState = { error?: string; success?: boolean } | undefined;

// Revérifie le mot de passe admin juste avant les actions les plus
// sensibles (suppression définitive d'un client, réinitialisation du mot
// de passe d'un client, usurpation d'espace client) — la session de 30
// jours reste inchangée pour le reste de l'admin, mais ces actions
// précises demandent une preuve fraîche d'identité plutôt qu'une simple
// confirmation. Retourne un message d'erreur (à renvoyer tel quel) ou
// `null` si le mot de passe est correct.
export async function requireFreshAdminPassword(formData: FormData): Promise<string | null> {
  const admin = await verifyAdminSession();
  const password = formData.get("stepUpPassword");
  if (typeof password !== "string" || password.length === 0) {
    return "Mot de passe requis.";
  }
  const valid = await verifyPassword(password, admin.passwordHash);
  if (!valid) {
    return "Mot de passe incorrect.";
  }
  return null;
}
