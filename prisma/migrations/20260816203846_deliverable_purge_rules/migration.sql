/*
  Warnings:

  - You are about to drop the column `deliverableRetentionDays` on the `AppSettings` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "AppSettings" DROP COLUMN "deliverableRetentionDays",
ADD COLUMN     "deliverableRetentionAfterEventDays" INTEGER NOT NULL DEFAULT 7,
ADD COLUMN     "deliverableRetentionNoDateDays" INTEGER NOT NULL DEFAULT 30;
