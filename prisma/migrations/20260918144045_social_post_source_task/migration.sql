-- AlterTable
ALTER TABLE "SocialPost" ADD COLUMN     "sourceTaskId" TEXT;

-- CreateIndex
CREATE INDEX "SocialPost_sourceTaskId_idx" ON "SocialPost"("sourceTaskId");

-- AddForeignKey
ALTER TABLE "SocialPost" ADD CONSTRAINT "SocialPost_sourceTaskId_fkey" FOREIGN KEY ("sourceTaskId") REFERENCES "Task"("id") ON DELETE SET NULL ON UPDATE CASCADE;
