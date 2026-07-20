-- AlterTable
ALTER TABLE "Client" ADD COLUMN     "isDemo" BOOLEAN NOT NULL DEFAULT false;

-- AlterTable
ALTER TABLE "Deliverable" ADD COLUMN     "kind" TEXT NOT NULL DEFAULT 'final';

-- CreateTable
CREATE TABLE "AppSettings" (
    "id" TEXT NOT NULL DEFAULT 'settings',
    "deliverableRetentionDays" INTEGER NOT NULL DEFAULT 60,
    "batWatermarkEnabled" BOOLEAN NOT NULL DEFAULT true,
    "popupEnabled" BOOLEAN NOT NULL DEFAULT false,
    "popupMessage" TEXT,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AppSettings_pkey" PRIMARY KEY ("id")
);
