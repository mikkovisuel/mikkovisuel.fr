-- AlterTable
ALTER TABLE "SocialPlanRunItem" ADD COLUMN     "actionId" TEXT;

-- AlterTable
ALTER TABLE "SocialPlanStep" ADD COLUMN     "actionBrief" TEXT,
ADD COLUMN     "actionLeadDays" INTEGER,
ADD COLUMN     "createsAction" BOOLEAN NOT NULL DEFAULT false;

-- AlterTable
ALTER TABLE "SocialPost" ADD COLUMN     "readyAt" TIMESTAMP(3);

-- AlterTable
ALTER TABLE "SocialRoutine" ADD COLUMN     "actionBrief" TEXT,
ADD COLUMN     "actionLeadDays" INTEGER,
ADD COLUMN     "createsAction" BOOLEAN NOT NULL DEFAULT false;

-- CreateTable
CREATE TABLE "SocialAction" (
    "id" TEXT NOT NULL,
    "clientId" TEXT,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "dueAt" TIMESTAMP(3) NOT NULL,
    "doneAt" TIMESTAMP(3),
    "routineId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SocialAction_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "SocialAction_clientId_idx" ON "SocialAction"("clientId");

-- CreateIndex
CREATE INDEX "SocialAction_dueAt_idx" ON "SocialAction"("dueAt");

-- CreateIndex
CREATE INDEX "SocialAction_routineId_idx" ON "SocialAction"("routineId");

-- AddForeignKey
ALTER TABLE "SocialAction" ADD CONSTRAINT "SocialAction_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "Client"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SocialAction" ADD CONSTRAINT "SocialAction_routineId_fkey" FOREIGN KEY ("routineId") REFERENCES "SocialRoutine"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SocialPlanRunItem" ADD CONSTRAINT "SocialPlanRunItem_actionId_fkey" FOREIGN KEY ("actionId") REFERENCES "SocialAction"("id") ON DELETE SET NULL ON UPDATE CASCADE;
