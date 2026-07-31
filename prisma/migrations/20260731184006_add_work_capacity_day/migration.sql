-- CreateTable
CREATE TABLE "WorkCapacityDay" (
    "date" TIMESTAMP(3) NOT NULL,
    "availableMinutes" INTEGER NOT NULL,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "WorkCapacityDay_pkey" PRIMARY KEY ("date")
);
