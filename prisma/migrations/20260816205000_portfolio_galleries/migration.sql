-- Refonte "galeries" du portfolio (2026-08-16) : les médias d'un pilier
-- passent d'un lien direct pilier -> média à pilier -> galerie -> média.
-- Migration écrite à la main (pas générée par `prisma migrate dev`, qui
-- refuse d'ajouter une colonne requise sans valeur par défaut sur une table
-- non vide) pour préserver les médias existants : une galerie "Galerie" par
-- défaut est créée pour chaque pilier existant, et tous ses médias y sont
-- rattachés. Choix explicite du client (2026-08-16) : pas de galerie par
-- média existant, l'admin réorganise ensuite à la main depuis /admin.

-- CreateTable
CREATE TABLE "PortfolioGallery" (
    "id" TEXT NOT NULL,
    "pillarId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "textBefore" TEXT,
    "textAfter" TEXT,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PortfolioGallery_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "PortfolioGallery_pillarId_idx" ON "PortfolioGallery"("pillarId");

-- AddForeignKey
ALTER TABLE "PortfolioGallery" ADD CONSTRAINT "PortfolioGallery_pillarId_fkey" FOREIGN KEY ("pillarId") REFERENCES "PortfolioPillar"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Data migration: one default gallery per existing pillar (even if it has
-- no items yet, so every pillar keeps at least one gallery to grow into).
INSERT INTO "PortfolioGallery" ("id", "pillarId", "title", "sortOrder", "createdAt", "updatedAt")
SELECT gen_random_uuid()::text, "id", 'Galerie', 0, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
FROM "PortfolioPillar";

-- AlterTable: add galleryId nullable first, backfill, then enforce NOT NULL
ALTER TABLE "PortfolioMediaItem" ADD COLUMN "galleryId" TEXT;

UPDATE "PortfolioMediaItem" AS item
SET "galleryId" = gallery."id"
FROM "PortfolioGallery" AS gallery
WHERE gallery."pillarId" = item."pillarId";

ALTER TABLE "PortfolioMediaItem" ALTER COLUMN "galleryId" SET NOT NULL;

-- DropForeignKey
ALTER TABLE "PortfolioMediaItem" DROP CONSTRAINT "PortfolioMediaItem_pillarId_fkey";

-- DropIndex
DROP INDEX "PortfolioMediaItem_pillarId_idx";

-- AlterTable
ALTER TABLE "PortfolioMediaItem" DROP COLUMN "pillarId";

-- CreateIndex
CREATE INDEX "PortfolioMediaItem_galleryId_idx" ON "PortfolioMediaItem"("galleryId");

-- AddForeignKey
ALTER TABLE "PortfolioMediaItem" ADD CONSTRAINT "PortfolioMediaItem_galleryId_fkey" FOREIGN KEY ("galleryId") REFERENCES "PortfolioGallery"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AlterTable: PortfolioPillar.mediaType was only ever written (never read
-- anywhere in the app) as a rollup of its direct items — meaningless now
-- that items live under galleries, dropped rather than left to go stale.
ALTER TABLE "PortfolioPillar" DROP COLUMN "mediaType";
