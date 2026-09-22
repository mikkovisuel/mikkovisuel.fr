-- AlterTable
ALTER TABLE "SocialPost" ADD COLUMN     "captionVariants" JSONB,
ADD COLUMN     "previousCaption" TEXT,
ADD COLUMN     "previousHashtags" TEXT;

-- CreateTable
CREATE TABLE "SocialPostComment" (
    "id" TEXT NOT NULL,
    "postId" TEXT NOT NULL,
    "authorType" TEXT NOT NULL,
    "authorId" TEXT NOT NULL,
    "authorName" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SocialPostComment_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "SocialPostComment_postId_idx" ON "SocialPostComment"("postId");

-- AddForeignKey
ALTER TABLE "SocialPostComment" ADD CONSTRAINT "SocialPostComment_postId_fkey" FOREIGN KEY ("postId") REFERENCES "SocialPost"("id") ON DELETE CASCADE ON UPDATE CASCADE;
