import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

// Droits d'accès : toute action serveur (fichier "use server") exportée est
// appelable depuis n'importe quel navigateur. Chacune doit donc vérifier la
// session (admin ou client) avant de faire quoi que ce soit — sauf la courte
// liste des actions publiques par nature (connexion, mot de passe oublié,
// formulaire de contact…). Ce test échoue si une nouvelle action oublie la
// vérification.

const ACTIONS_DIR = join(__dirname, "..", "src", "lib", "actions");
const GUARDS = /\b(verifyAdminSession|verifyClientSession|getAdminSession|getClientSession|readSession|requireAdmin|requireClient)\s*\(/;

/** Actions publiques par nature, vérifiées une à une. */
const PUBLIC_ACTIONS = new Set([
  "admin-auth.ts:adminLogin",
  "client-auth.ts:clientLogin",
  // Sortie du mode « voir comme le client » : s'appuie sur le jeton de retour
  // posé à l'entrée (cookie), pas sur la session courante (celle du client).
  "impersonation.ts:stopImpersonation",
  // Bouton public « essayer la démo » : ouvre une session sur le seul client
  // de démonstration (`isDemo`), sans données réelles.
  "demo.ts:viewDemoClientSpace",
  "admin-auth.ts:loginAdmin",
  "client-auth.ts:loginClient",
  "logout.ts:logout",
  "password-reset.ts:requestPasswordReset",
  "password-reset.ts:requestAdminPasswordReset",
  "password-reset.ts:requestClientPasswordReset",
  "password-reset.ts:resetPassword",
  "password-reset.ts:resetAdminPassword",
  "password-reset.ts:resetClientPassword",
  "contact.ts:sendContactMessage",
  "contact.ts:submitContactForm",
  "theme.ts:setThemeCookie",
  "theme.ts:updateThemePreference",
  "demo.ts:startDemo",
  "demo.ts:enterDemo",
  "feedback.ts:sendFeedback",
]);

function exportedActions(source: string) {
  const found: { name: string; body: string }[] = [];
  const pattern = /export\s+async\s+function\s+(\w+)\s*\(/g;
  let match: RegExpExecArray | null;
  const starts: { name: string; index: number }[] = [];
  while ((match = pattern.exec(source))) starts.push({ name: match[1], index: match.index });
  starts.forEach((start, i) => {
    const end = i + 1 < starts.length ? starts[i + 1].index : source.length;
    found.push({ name: start.name, body: source.slice(start.index, end) });
  });
  return found;
}

describe("actions serveur", () => {
  const files = readdirSync(ACTIONS_DIR).filter((file) => file.endsWith(".ts"));

  it("trouve les fichiers d'actions", () => {
    expect(files.length).toBeGreaterThan(10);
  });

  for (const file of files) {
    const source = readFileSync(join(ACTIONS_DIR, file), "utf8");
    if (!/^\s*["']use server["']/m.test(source)) continue;
    for (const action of exportedActions(source)) {
      const key = `${file}:${action.name}`;
      if (PUBLIC_ACTIONS.has(key)) continue;
      it(`${key} vérifie la session`, () => {
        expect(GUARDS.test(action.body), `${key} n'appelle aucune vérification de session`).toBe(true);
      });
    }
  }
});
