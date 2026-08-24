-- AlterTable
ALTER TABLE "Client" ADD COLUMN     "requirePaymentForDeliverables" BOOLEAN NOT NULL DEFAULT false;

-- AlterTable
ALTER TABLE "Document" ADD COLUMN     "paypalOrderId" TEXT;

-- AlterTable
ALTER TABLE "Task" ADD COLUMN     "deliverablesLockOverride" TEXT,
ADD COLUMN     "deliverablesPaymentConfirmedAt" TIMESTAMP(3);
