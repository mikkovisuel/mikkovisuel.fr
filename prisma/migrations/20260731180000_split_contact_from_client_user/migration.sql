-- Sépare "ClientUser" (qui confondait identité de contact et compte
-- d'accès à l'espace client) en deux tables : "Contact" (identité
-- partageable entre plusieurs clients) et "ClientContact" (rattachement à
-- un client donné + compte d'accès). Demande du 2026-07-31 : "un contact
-- peut être dans plusieurs fiches clients".
--
-- Écrite à la main plutôt que laissée à `prisma migrate dev` (qui aurait
-- probablement proposé un DROP/CREATE destructif face à un tel changement
-- de forme) : chaque ligne "ClientUser" existante devient une paire
-- Contact + ClientContact, sans perte de données.
--
-- Point important : "ClientContact" reprend l'id de l'ancien "ClientUser"
-- tel quel. Plusieurs tables référencent cet id en chaîne libre, sans
-- contrainte de clé étrangère (Task.createdById, TaskComment.authorId,
-- Session.subjectId, PasswordResetToken.subjectId,
-- AuditLogEntry.targetId) : en gardant le même id pour "le compte de
-- connexion", ces références restent valides sans la moindre réécriture.
-- Seul "Contact" (la nouvelle identité) reçoit un id différent
-- ('ct_' + ancien id), puisque rien d'existant n'y fait référence encore.

-- 1) Table Contact (identité)
CREATE TABLE "Contact" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "email" TEXT,
    "phone" TEXT,
    "role" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Contact_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "Contact_email_key" ON "Contact"("email");

-- 2) Table ClientContact (rattachement + compte d'accès)
CREATE TABLE "ClientContact" (
    "id" TEXT NOT NULL,
    "clientId" TEXT NOT NULL,
    "contactId" TEXT NOT NULL,
    "passwordHash" TEXT,
    "portalAccessEnabled" BOOLEAN NOT NULL DEFAULT false,
    "emailNotificationsEnabled" BOOLEAN NOT NULL DEFAULT false,
    "themePreference" TEXT NOT NULL DEFAULT 'light',
    "lastLoginAt" TIMESTAMP(3),
    "hasSeenTour" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ClientContact_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "ClientContact_clientId_contactId_key" ON "ClientContact"("clientId", "contactId");

ALTER TABLE "ClientContact" ADD CONSTRAINT "ClientContact_clientId_fkey"
  FOREIGN KEY ("clientId") REFERENCES "Client"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ClientContact" ADD CONSTRAINT "ClientContact_contactId_fkey"
  FOREIGN KEY ("contactId") REFERENCES "Contact"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- 3) Migration des données : une ligne "ClientUser" -> une paire Contact + ClientContact
INSERT INTO "Contact" ("id", "name", "email", "phone", "role", "createdAt", "updatedAt")
SELECT 'ct_' || "id", "name", "email", "phone", "role", "createdAt", "updatedAt"
FROM "ClientUser";

INSERT INTO "ClientContact" (
  "id", "clientId", "contactId", "passwordHash", "portalAccessEnabled",
  "emailNotificationsEnabled", "themePreference", "lastLoginAt", "hasSeenTour",
  "createdAt", "updatedAt"
)
SELECT
  "id", "clientId", 'ct_' || "id", "passwordHash", "portalAccessEnabled",
  "emailNotificationsEnabled", "themePreference", "lastLoginAt", "hasSeenTour",
  "createdAt", "updatedAt"
FROM "ClientUser";

-- 4) Repointer ClientLoginEvent vers ClientContact (mêmes valeurs d'id,
--    donc aucune ligne à réécrire — juste la colonne et la contrainte)
ALTER TABLE "ClientLoginEvent" RENAME COLUMN "clientUserId" TO "clientContactId";
ALTER TABLE "ClientLoginEvent" DROP CONSTRAINT "ClientLoginEvent_clientUserId_fkey";
ALTER TABLE "ClientLoginEvent" ADD CONSTRAINT "ClientLoginEvent_clientContactId_fkey"
  FOREIGN KEY ("clientContactId") REFERENCES "ClientContact"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- 5) Suppression de l'ancienne table, une fois toutes les données reprises
DROP TABLE "ClientUser";
