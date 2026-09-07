-- AlterTable
ALTER TABLE "AppSettings" ADD COLUMN     "documentSentEmailBody" TEXT,
ADD COLUMN     "documentSentEmailSubject" TEXT,
ADD COLUMN     "invoiceEmailCc" TEXT DEFAULT 'mikko.visuel@gmail.com',
ADD COLUMN     "paymentReminderEmailBody" TEXT,
ADD COLUMN     "paymentReminderEmailSubject" TEXT;
