-- AlterTable
ALTER TABLE "Client" ADD COLUMN     "billingEmail" TEXT,
ADD COLUMN     "driveUrl" TEXT;

-- AlterTable
ALTER TABLE "Document" ADD COLUMN     "sentAt" TIMESTAMP(3);
