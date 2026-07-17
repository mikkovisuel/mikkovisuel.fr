-- CreateTable
CREATE TABLE "ClientLoginEvent" (
    "id" TEXT NOT NULL,
    "clientUserId" TEXT NOT NULL,
    "loggedInAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ClientLoginEvent_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "ClientLoginEvent" ADD CONSTRAINT "ClientLoginEvent_clientUserId_fkey" FOREIGN KEY ("clientUserId") REFERENCES "ClientUser"("id") ON DELETE CASCADE ON UPDATE CASCADE;
