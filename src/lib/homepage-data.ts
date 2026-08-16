import "server-only";
import { cache } from "react";
import { db } from "@/lib/db";

// Perf (2026-08-16) : `Hero` et `PortfolioSection` (page d'accueil, rendue
// en `force-dynamic` donc sur chaque requête, voir src/app/page.tsx)
// interrogeaient chacun `HomepageContent` séparément — deux requêtes pour
// la même ligne dans une seule et même requête HTTP. `cache()` (mémoïsation
// React, scope = une requête) déduplique ça automatiquement, et permet en
// plus à `page.tsx` de "pré-chauffer" les trois lectures d'un coup avec
// `Promise.all` avant de rendre les sections, au lieu de les laisser
// s'enchaîner l'une après l'autre au fil du rendu des composants.
export const getHomepageHero = cache(() => db.homepageHero.findUnique({ where: { id: "hero" } }));

export const getHomepageContent = cache(() =>
  db.homepageContent.findUnique({ where: { id: "homepage" } }),
);

export const getPortfolioPillars = cache(() =>
  db.portfolioPillar.findMany({ orderBy: { sortOrder: "asc" } }),
);
