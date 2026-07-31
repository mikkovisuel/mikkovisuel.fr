-- AlterTable
ALTER TABLE "Note" ADD COLUMN     "prospectId" TEXT;

-- CreateIndex
CREATE INDEX "Note_prospectId_idx" ON "Note"("prospectId");

-- AddForeignKey
ALTER TABLE "Note" ADD CONSTRAINT "Note_prospectId_fkey" FOREIGN KEY ("prospectId") REFERENCES "Prospect"("id") ON DELETE SET NULL ON UPDATE CASCADE;
