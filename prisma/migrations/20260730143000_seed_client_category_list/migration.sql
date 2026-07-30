-- Crée la liste déroulante "Catégories de client" et ses 6 valeurs de départ.
--
-- Pourquoi une migration et pas `prisma/seed.ts` : le seed ne tourne PAS au
-- déploiement (Procfile n'exécute que `prisma migrate deploy`), donc la
-- migration précédente ajoutait `Client.categoryId` sans qu'aucune catégorie
-- n'existe en production — sélecteur vide et filtres absents.
--
-- Et surtout, lancer le seed complet à la main en production serait
-- destructeur : `seedDropdownList` fait un `update` sur label/color/sortOrder
-- de chaque item déjà présent, ce qui **écraserait les renommages et
-- changements de couleur** faits par l'admin depuis /admin/listes sur les
-- statuts de tâche, types de document, etc. Cette migration n'insère que la
-- nouvelle liste, sans jamais toucher aux autres.
--
-- Idempotente (`ON CONFLICT DO NOTHING` sur les contraintes uniques
-- `DropdownList.key` et `DropdownItem(listId, slug)`) : rejouable sans effet
-- de bord, et sans écraser une personnalisation ultérieure.
INSERT INTO "DropdownList" ("id", "key", "name", "allowCustomItems")
VALUES ('cl_category_list_seed', 'client_category', 'Catégories de client', true)
ON CONFLICT ("key") DO NOTHING;

INSERT INTO "DropdownItem" ("id", "listId", "slug", "label", "color", "sortOrder", "locked", "createdAt", "updatedAt")
SELECT
  'cl_cat_' || v.slug,
  (SELECT "id" FROM "DropdownList" WHERE "key" = 'client_category'),
  v.slug,
  v.label,
  v.color,
  v.sort_order,
  false,
  CURRENT_TIMESTAMP,
  CURRENT_TIMESTAMP
FROM (VALUES
  ('club', 'Club', 'violet', 0),
  ('marque', 'Marque', 'blue', 1),
  ('artiste', 'Artiste', 'rose', 2),
  ('agence', 'Agence', 'amber', 3),
  ('evenementiel', 'Événementiel', 'orange', 4),
  ('particulier', 'Particulier', 'slate', 5)
) AS v(slug, label, color, sort_order)
ON CONFLICT ("listId", "slug") DO NOTHING;
