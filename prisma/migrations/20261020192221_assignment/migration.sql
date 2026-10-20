-- AlterTable
ALTER TABLE "SocialAction" ADD COLUMN     "assignedAdminId" TEXT;

-- AlterTable
ALTER TABLE "SocialPost" ADD COLUMN     "assignedAdminId" TEXT;

-- AlterTable
ALTER TABLE "Task" ADD COLUMN     "assignedAdminId" TEXT;

-- CreateIndex
CREATE INDEX "SocialAction_assignedAdminId_idx" ON "SocialAction"("assignedAdminId");

-- CreateIndex
CREATE INDEX "SocialPost_assignedAdminId_idx" ON "SocialPost"("assignedAdminId");

-- CreateIndex
CREATE INDEX "Task_assignedAdminId_idx" ON "Task"("assignedAdminId");

-- AddForeignKey
ALTER TABLE "Task" ADD CONSTRAINT "Task_assignedAdminId_fkey" FOREIGN KEY ("assignedAdminId") REFERENCES "Admin"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SocialPost" ADD CONSTRAINT "SocialPost_assignedAdminId_fkey" FOREIGN KEY ("assignedAdminId") REFERENCES "Admin"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SocialAction" ADD CONSTRAINT "SocialAction_assignedAdminId_fkey" FOREIGN KEY ("assignedAdminId") REFERENCES "Admin"("id") ON DELETE SET NULL ON UPDATE CASCADE;
