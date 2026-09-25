-- Programmation (routines + plans de communication), 2026-09-25.
--
-- `SocialRecurringSlot` disparaît au profit de `SocialRoutine`, mais ses
-- données sont **reprises d'abord** (voir la fin de ce fichier) : chaque
-- créneau devient une routine hebdomadaire qui ne produit qu'un rappel,
-- c'est-à-dire exactement son comportement d'avant. La suppression n'a lieu
-- qu'après la copie, dans la même transaction : soit tout passe, soit rien.

-- CreateTable
CREATE TABLE "SocialRoutineSet" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "clientId" TEXT,
    "isTemplate" BOOLEAN NOT NULL DEFAULT false,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SocialRoutineSet_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SocialRoutine" (
    "id" TEXT NOT NULL,
    "setId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "cadence" TEXT NOT NULL DEFAULT 'weekly',
    "weekdays" INTEGER[],
    "biweeklyAnchor" TIMESTAMP(3),
    "monthDay" INTEGER,
    "monthWeek" INTEGER,
    "monthWeekday" INTEGER,
    "time" TEXT NOT NULL DEFAULT '18:00',
    "activeFrom" TIMESTAMP(3),
    "activeUntil" TIMESTAMP(3),
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createsReminder" BOOLEAN NOT NULL DEFAULT true,
    "createsDraft" BOOLEAN NOT NULL DEFAULT false,
    "createsTask" BOOLEAN NOT NULL DEFAULT false,
    "leadDays" INTEGER NOT NULL DEFAULT 3,
    "networks" TEXT[],
    "format" TEXT NOT NULL DEFAULT 'post',
    "categoryId" TEXT,
    "captionTemplate" TEXT,
    "hashtags" TEXT,
    "taskTypeSlug" TEXT,
    "taskLeadDays" INTEGER,
    "taskBrief" TEXT,
    "lastRunFor" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SocialRoutine_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SocialPlan" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SocialPlan_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SocialPlanStep" (
    "id" TEXT NOT NULL,
    "planId" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "offsetDays" INTEGER NOT NULL,
    "time" TEXT NOT NULL DEFAULT '18:00',
    "createsDraft" BOOLEAN NOT NULL DEFAULT true,
    "createsReminder" BOOLEAN NOT NULL DEFAULT true,
    "createsTask" BOOLEAN NOT NULL DEFAULT false,
    "networks" TEXT[],
    "format" TEXT NOT NULL DEFAULT 'post',
    "categoryId" TEXT,
    "titlePattern" TEXT NOT NULL DEFAULT '{etape} — {evenement}',
    "captionTemplate" TEXT,
    "hashtags" TEXT,
    "taskTypeSlug" TEXT,
    "taskLeadDays" INTEGER,
    "taskBrief" TEXT,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "SocialPlanStep_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SocialPlanRun" (
    "id" TEXT NOT NULL,
    "planId" TEXT,
    "planName" TEXT NOT NULL,
    "clientId" TEXT NOT NULL,
    "eventName" TEXT NOT NULL,
    "eventDate" TIMESTAMP(3) NOT NULL,
    "eventPlace" TEXT,
    "sourceTaskId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "canceledAt" TIMESTAMP(3),

    CONSTRAINT "SocialPlanRun_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SocialPlanRunItem" (
    "id" TEXT NOT NULL,
    "runId" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "dueAt" TIMESTAMP(3) NOT NULL,
    "postId" TEXT,
    "taskId" TEXT,

    CONSTRAINT "SocialPlanRunItem_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "SocialRoutineSet_clientId_idx" ON "SocialRoutineSet"("clientId");

-- CreateIndex
CREATE INDEX "SocialRoutine_setId_idx" ON "SocialRoutine"("setId");

-- CreateIndex
CREATE INDEX "SocialRoutine_categoryId_idx" ON "SocialRoutine"("categoryId");

-- CreateIndex
CREATE INDEX "SocialPlanStep_planId_idx" ON "SocialPlanStep"("planId");

-- CreateIndex
CREATE INDEX "SocialPlanRun_clientId_idx" ON "SocialPlanRun"("clientId");

-- CreateIndex
CREATE INDEX "SocialPlanRun_sourceTaskId_idx" ON "SocialPlanRun"("sourceTaskId");

-- CreateIndex
CREATE INDEX "SocialPlanRunItem_runId_idx" ON "SocialPlanRunItem"("runId");

-- AddForeignKey
ALTER TABLE "SocialRoutineSet" ADD CONSTRAINT "SocialRoutineSet_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "Client"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SocialRoutine" ADD CONSTRAINT "SocialRoutine_setId_fkey" FOREIGN KEY ("setId") REFERENCES "SocialRoutineSet"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SocialRoutine" ADD CONSTRAINT "SocialRoutine_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "DropdownItem"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SocialPlanStep" ADD CONSTRAINT "SocialPlanStep_planId_fkey" FOREIGN KEY ("planId") REFERENCES "SocialPlan"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SocialPlanStep" ADD CONSTRAINT "SocialPlanStep_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "DropdownItem"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SocialPlanRun" ADD CONSTRAINT "SocialPlanRun_planId_fkey" FOREIGN KEY ("planId") REFERENCES "SocialPlan"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SocialPlanRun" ADD CONSTRAINT "SocialPlanRun_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "Client"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SocialPlanRun" ADD CONSTRAINT "SocialPlanRun_sourceTaskId_fkey" FOREIGN KEY ("sourceTaskId") REFERENCES "Task"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SocialPlanRunItem" ADD CONSTRAINT "SocialPlanRunItem_runId_fkey" FOREIGN KEY ("runId") REFERENCES "SocialPlanRun"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SocialPlanRunItem" ADD CONSTRAINT "SocialPlanRunItem_postId_fkey" FOREIGN KEY ("postId") REFERENCES "SocialPost"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SocialPlanRunItem" ADD CONSTRAINT "SocialPlanRunItem_taskId_fkey" FOREIGN KEY ("taskId") REFERENCES "Task"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- === Reprise des créneaux récurrents existants ===========================
-- Un ensemble de routines par client concerné...
INSERT INTO "SocialRoutineSet" ("id", "name", "clientId", "isTemplate", "active", "createdAt")
SELECT DISTINCT
  'set_migr_' || "clientId",
  'Routines',
  "clientId",
  false,
  true,
  CURRENT_TIMESTAMP
FROM "SocialRecurringSlot";

-- ...puis une routine hebdomadaire par créneau, à l'identique : même jour,
-- même heure, mêmes réseaux, même format, même délai de rappel, même état
-- actif/en pause, et même dernière occurrence déjà rappelée.
INSERT INTO "SocialRoutine" (
  "id", "setId", "title", "cadence", "weekdays", "time", "active",
  "createsReminder", "createsDraft", "createsTask", "leadDays",
  "networks", "format", "lastRunFor", "createdAt"
)
SELECT
  "id",
  'set_migr_' || "clientId",
  "title",
  'weekly',
  ARRAY["weekday"],
  "time",
  "active",
  true,
  false,
  false,
  "remindDaysBefore",
  "networks",
  "format",
  "lastRemindedFor",
  "createdAt"
FROM "SocialRecurringSlot";

-- Les données sont copiées : l'ancienne table peut partir.
ALTER TABLE "SocialRecurringSlot" DROP CONSTRAINT "SocialRecurringSlot_clientId_fkey";
DROP TABLE "SocialRecurringSlot";
