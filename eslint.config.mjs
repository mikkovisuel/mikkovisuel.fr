import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  // Override default ignores of eslint-config-next.
  globalIgnores([
    // Default ignores of eslint-config-next:
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
  ]),
  {
    rules: {
      // Les Server Actions ont une signature imposée par `useActionState`
      // (`(state, formData)`), et certaines n'utilisent ni l'un ni l'autre —
      // ex. `sendDeliverablesByEmail`, qui ne travaille qu'à partir de l'id
      // reçu par `bind`. Le projet préfixe déjà ces paramètres d'un `_` ;
      // cette règle fait respecter cette convention au lieu de signaler des
      // paramètres délibérément inutilisés.
      "@typescript-eslint/no-unused-vars": [
        "warn",
        { argsIgnorePattern: "^_", varsIgnorePattern: "^_", caughtErrorsIgnorePattern: "^_" },
      ],
    },
  },
]);

export default eslintConfig;
