import { fileURLToPath } from "node:url";
import { defineConfig } from "vitest/config";

// Tests automatiques des règles critiques (feuille de route, point 5,
// 2026-10-20). Rapides, sans base de données ni navigateur : ils tournent
// avant chaque `git push` (voir .githooks/pre-push). `server-only` est
// remplacé par un module vide, il n'a de sens que dans Next.js.
export default defineConfig({
  test: {
    include: ["tests/**/*.test.ts"],
    environment: "node",
    // Le client Prisma se construit à l'import mais ne se connecte qu'à la
    // première requête : une adresse factice suffit, aucun test n'interroge
    // la base.
    env: { DATABASE_URL: "postgresql://test:test@localhost:5432/test" },
  },
  resolve: {
    alias: {
      "@": fileURLToPath(new URL("./src", import.meta.url)),
      "server-only": fileURLToPath(new URL("./tests/server-only-stub.ts", import.meta.url)),
    },
  },
});
