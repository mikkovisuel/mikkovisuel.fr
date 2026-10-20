-- AlterTable
ALTER TABLE "AppSettings" ADD COLUMN     "invoiceAutoReminderBody" TEXT,
ADD COLUMN     "invoiceAutoReminderEnabled" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "invoiceAutoReminderSubject" TEXT;

-- AlterTable
ALTER TABLE "Document" ADD COLUMN     "autoReminderCount" INTEGER NOT NULL DEFAULT 0;
