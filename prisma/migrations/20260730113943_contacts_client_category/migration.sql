-- AlterTable
ALTER TABLE "Client" ADD COLUMN     "categoryId" TEXT;

-- AlterTable
ALTER TABLE "ClientUser" ADD COLUMN     "portalAccessEnabled" BOOLEAN NOT NULL DEFAULT false,
ALTER COLUMN "email" DROP NOT NULL,
ALTER COLUMN "passwordHash" DROP NOT NULL;

-- Reprise des comptes existants : avant cette migration, tout `ClientUser`
-- était par définition un compte de connexion (`passwordHash` NOT NULL).
-- `ADD COLUMN ... DEFAULT false` les mettrait tous à `false`, c'est-à-dire
-- couperait l'accès à l'espace client de TOUS les clients en production. On
-- rétablit donc explicitement l'accès pour toute ligne qui avait déjà un mot
-- de passe. Le `DEFAULT false` ne vaut que pour les contacts créés ensuite.
UPDATE "ClientUser" SET "portalAccessEnabled" = true WHERE "passwordHash" IS NOT NULL;

-- AddForeignKey
ALTER TABLE "Client" ADD CONSTRAINT "Client_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "DropdownItem"("id") ON DELETE SET NULL ON UPDATE CASCADE;
