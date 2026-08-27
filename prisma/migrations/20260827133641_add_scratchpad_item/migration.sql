-- CreateTable
CREATE TABLE "ScratchpadItem" (
    "id" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ScratchpadItem_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ScratchpadItem_sortOrder_idx" ON "ScratchpadItem"("sortOrder");
