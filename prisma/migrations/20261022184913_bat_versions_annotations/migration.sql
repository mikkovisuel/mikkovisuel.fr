-- AlterTable
ALTER TABLE "Deliverable" ADD COLUMN     "version" INTEGER NOT NULL DEFAULT 1;

-- CreateTable
CREATE TABLE "DeliverableAnnotation" (
    "id" TEXT NOT NULL,
    "deliverableId" TEXT NOT NULL,
    "x" DOUBLE PRECISION NOT NULL,
    "y" DOUBLE PRECISION NOT NULL,
    "body" TEXT NOT NULL,
    "authorType" TEXT NOT NULL,
    "authorId" TEXT NOT NULL,
    "authorName" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "DeliverableAnnotation_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "DeliverableAnnotation_deliverableId_idx" ON "DeliverableAnnotation"("deliverableId");

-- AddForeignKey
ALTER TABLE "DeliverableAnnotation" ADD CONSTRAINT "DeliverableAnnotation_deliverableId_fkey" FOREIGN KEY ("deliverableId") REFERENCES "Deliverable"("id") ON DELETE CASCADE ON UPDATE CASCADE;
