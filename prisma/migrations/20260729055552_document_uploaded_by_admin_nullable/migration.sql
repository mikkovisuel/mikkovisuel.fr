-- DropForeignKey
ALTER TABLE "Document" DROP CONSTRAINT "Document_uploadedByAdminId_fkey";

-- AlterTable
ALTER TABLE "Document" ALTER COLUMN "uploadedByAdminId" DROP NOT NULL;

-- AddForeignKey
ALTER TABLE "Document" ADD CONSTRAINT "Document_uploadedByAdminId_fkey" FOREIGN KEY ("uploadedByAdminId") REFERENCES "Admin"("id") ON DELETE SET NULL ON UPDATE CASCADE;
