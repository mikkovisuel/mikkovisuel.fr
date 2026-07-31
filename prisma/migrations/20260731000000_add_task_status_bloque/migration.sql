-- Ajoute le statut de tâche "Bloqué", entre "Non commencé" et "En cours"
-- (demande du client du 2026-07-31, qui rouvre le cycle verrouillé —
-- voir TASK_STATUS_SEED dans src/lib/dropdown-lists.ts).
--
-- Pourquoi une migration et pas `prisma/seed.ts` : le seed ne tourne PAS au
-- déploiement (le Procfile n'exécute que `prisma migrate deploy`). Sans
-- cette migration, le statut existerait dans le code mais aucune ligne
-- correspondante n'existerait en production — il serait simplement absent
-- du sélecteur et du Kanban.
--
-- Et lancer le seed complet à la main en production serait destructeur :
-- `seedDropdownList` fait un `update` du label, de la couleur et de l'ordre
-- de chaque item déjà présent, ce qui écraserait les renommages et
-- changements de couleur faits depuis /admin/listes. Même raisonnement que
-- la migration 20260730143000_seed_client_category_list.

-- 1) Décaler d'un rang tout ce qui se trouve à partir de "En cours", pour
--    libérer la place juste avant lui. Le décalage est relatif (et non un
--    ordre réécrit en dur) afin de préserver un éventuel réordonnancement
--    manuel des statuts suivants.
--
--    Le garde `NOT EXISTS ... 'bloque'` rend l'opération idempotente : si la
--    migration est rejouée, ou si la ligne a déjà été créée autrement, plus
--    aucun décalage n'a lieu. Sans lui, un second passage repousserait les
--    statuts une fois de plus et laisserait un trou dans l'ordre.
UPDATE "DropdownItem"
SET "sortOrder" = "sortOrder" + 1
WHERE "listId" = (SELECT "id" FROM "DropdownList" WHERE "key" = 'task_status')
  AND "sortOrder" >= (
    SELECT "sortOrder" FROM "DropdownItem"
    WHERE "listId" = (SELECT "id" FROM "DropdownList" WHERE "key" = 'task_status')
      AND "slug" = 'en-cours'
  )
  AND NOT EXISTS (
    SELECT 1 FROM "DropdownItem"
    WHERE "listId" = (SELECT "id" FROM "DropdownList" WHERE "key" = 'task_status')
      AND "slug" = 'bloque'
  );

-- 2) Insérer "Bloqué" dans l'espace ainsi libéré, c'est-à-dire juste avant
--    "En cours" (dont l'ordre vient d'être incrémenté).
--    `locked = true` comme les autres statuts : le cycle reste fermé à
--    l'ajout/suppression depuis /admin/listes, seuls le libellé, la couleur
--    et l'ordre y restent modifiables.
INSERT INTO "DropdownItem" ("id", "listId", "slug", "label", "color", "sortOrder", "locked", "createdAt", "updatedAt")
SELECT
  'task_status_bloque',
  "list"."id",
  'bloque',
  'Bloqué',
  'red',
  (
    SELECT "sortOrder" - 1 FROM "DropdownItem"
    WHERE "listId" = "list"."id" AND "slug" = 'en-cours'
  ),
  true,
  CURRENT_TIMESTAMP,
  CURRENT_TIMESTAMP
FROM "DropdownList" AS "list"
WHERE "list"."key" = 'task_status'
ON CONFLICT ("listId", "slug") DO NOTHING;
