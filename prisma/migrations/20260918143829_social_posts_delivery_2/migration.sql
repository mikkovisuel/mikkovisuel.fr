-- CreateTable
CREATE TABLE "SocialClientProfile" (
    "id" TEXT NOT NULL,
    "clientId" TEXT NOT NULL,
    "editorialLine" TEXT,
    "brandTone" TEXT,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SocialClientProfile_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SocialLibraryItem" (
    "id" TEXT NOT NULL,
    "clientId" TEXT NOT NULL,
    "kind" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SocialLibraryItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SocialRecurringSlot" (
    "id" TEXT NOT NULL,
    "clientId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "weekday" INTEGER NOT NULL,
    "time" TEXT NOT NULL,
    "networks" TEXT[],
    "format" TEXT NOT NULL,
    "remindDaysBefore" INTEGER NOT NULL DEFAULT 3,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "lastRemindedFor" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SocialRecurringSlot_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SocialMonthlyStats" (
    "id" TEXT NOT NULL,
    "clientId" TEXT NOT NULL,
    "year" INTEGER NOT NULL,
    "month" INTEGER NOT NULL,
    "followers" INTEGER,
    "reach" INTEGER,
    "interactions" INTEGER,
    "notes" TEXT,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SocialMonthlyStats_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "SocialClientProfile_clientId_key" ON "SocialClientProfile"("clientId");

-- CreateIndex
CREATE INDEX "SocialLibraryItem_clientId_idx" ON "SocialLibraryItem"("clientId");

-- CreateIndex
CREATE INDEX "SocialRecurringSlot_clientId_idx" ON "SocialRecurringSlot"("clientId");

-- CreateIndex
CREATE UNIQUE INDEX "SocialMonthlyStats_clientId_year_month_key" ON "SocialMonthlyStats"("clientId", "year", "month");

-- AddForeignKey
ALTER TABLE "SocialClientProfile" ADD CONSTRAINT "SocialClientProfile_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "Client"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SocialLibraryItem" ADD CONSTRAINT "SocialLibraryItem_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "Client"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SocialRecurringSlot" ADD CONSTRAINT "SocialRecurringSlot_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "Client"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SocialMonthlyStats" ADD CONSTRAINT "SocialMonthlyStats_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "Client"("id") ON DELETE CASCADE ON UPDATE CASCADE;
