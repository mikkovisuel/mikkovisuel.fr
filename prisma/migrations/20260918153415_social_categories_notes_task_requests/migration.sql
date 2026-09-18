-- AlterTable
ALTER TABLE "SocialPost" ADD COLUMN     "categoryId" TEXT,
ADD COLUMN     "taskMediaImportedAt" TIMESTAMP(3);

-- AlterTable
ALTER TABLE "Task" ADD COLUMN     "internal" BOOLEAN NOT NULL DEFAULT false;

-- CreateTable
CREATE TABLE "SocialPostNote" (
    "id" TEXT NOT NULL,
    "postId" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SocialPostNote_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "SocialPostNote_postId_idx" ON "SocialPostNote"("postId");

-- CreateIndex
CREATE INDEX "SocialPost_categoryId_idx" ON "SocialPost"("categoryId");

-- AddForeignKey
ALTER TABLE "SocialPost" ADD CONSTRAINT "SocialPost_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "DropdownItem"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SocialPostNote" ADD CONSTRAINT "SocialPostNote_postId_fkey" FOREIGN KEY ("postId") REFERENCES "SocialPost"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Liste "Catégories de publication" et ses 3 valeurs de départ (exemples du
-- client). Même principe que 20260730143000_seed_client_category_list : le
-- seed ne tourne pas au déploiement, et cette insertion idempotente ne
-- touche à aucune autre liste ni à une personnalisation ultérieure.
INSERT INTO "DropdownList" ("id", "key", "name", "allowCustomItems")
VALUES ('social_category_list_seed', 'social_category', 'Catégories de publication', true)
ON CONFLICT ("key") DO NOTHING;

INSERT INTO "DropdownItem" ("id", "listId", "slug", "label", "color", "sortOrder", "locked", "createdAt", "updatedAt")
SELECT
  'social_cat_' || v.slug,
  (SELECT "id" FROM "DropdownList" WHERE "key" = 'social_category'),
  v.slug,
  v.label,
  v.color,
  v.sort_order,
  false,
  CURRENT_TIMESTAMP,
  CURRENT_TIMESTAMP
FROM (VALUES
  ('flyer-soiree', 'Flyer soirée', 'violet', 0),
  ('contenu-food', 'Contenu food', 'orange', 1),
  ('contenu-club', 'Contenu club', 'blue', 2)
) AS v(slug, label, color, sort_order)
ON CONFLICT ("listId", "slug") DO NOTHING;
