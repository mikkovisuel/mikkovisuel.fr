-- AlterTable
ALTER TABLE "Client" ADD COLUMN     "requirePaymentBeforeWork" BOOLEAN NOT NULL DEFAULT false;

-- AlterTable
ALTER TABLE "Task" ADD COLUMN     "workLockOverride" TEXT,
ADD COLUMN     "workPaymentConfirmedAt" TIMESTAMP(3);
