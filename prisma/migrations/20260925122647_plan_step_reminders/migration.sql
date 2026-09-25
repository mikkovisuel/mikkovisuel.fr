-- AlterTable
ALTER TABLE "SocialPlanRunItem" ADD COLUMN     "remindAt" TIMESTAMP(3),
ADD COLUMN     "reminderSentAt" TIMESTAMP(3);

-- AlterTable
ALTER TABLE "SocialPlanStep" ADD COLUMN     "remindDaysBefore" INTEGER NOT NULL DEFAULT 2;
