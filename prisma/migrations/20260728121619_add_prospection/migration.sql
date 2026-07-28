-- AlterTable
ALTER TABLE "AppSettings" ADD COLUMN     "prospectReminderDefaultDays" INTEGER NOT NULL DEFAULT 14;

-- CreateTable
CREATE TABLE "Prospect" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "company" TEXT,
    "address" TEXT,
    "phone" TEXT,
    "email" TEXT,
    "instagram" TEXT,
    "notes" TEXT,
    "statusId" TEXT NOT NULL,
    "source" TEXT NOT NULL DEFAULT 'manuel',
    "nextReminderAt" TIMESTAMP(3),
    "reminderSentAt" TIMESTAMP(3),
    "convertedClientId" TEXT,
    "convertedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Prospect_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Prospect_convertedClientId_key" ON "Prospect"("convertedClientId");

-- AddForeignKey
ALTER TABLE "Prospect" ADD CONSTRAINT "Prospect_statusId_fkey" FOREIGN KEY ("statusId") REFERENCES "DropdownItem"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Prospect" ADD CONSTRAINT "Prospect_convertedClientId_fkey" FOREIGN KEY ("convertedClientId") REFERENCES "Client"("id") ON DELETE SET NULL ON UPDATE CASCADE;
