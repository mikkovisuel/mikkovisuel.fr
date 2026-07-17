-- CreateTable
CREATE TABLE "HomepageContent" (
    "id" TEXT NOT NULL DEFAULT 'homepage',
    "heroTitle" TEXT,
    "heroSubtitle" TEXT,
    "heroButtonLabel" TEXT,
    "portfolioTitle" TEXT,
    "portfolioSubtitle" TEXT,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "HomepageContent_pkey" PRIMARY KEY ("id")
);
