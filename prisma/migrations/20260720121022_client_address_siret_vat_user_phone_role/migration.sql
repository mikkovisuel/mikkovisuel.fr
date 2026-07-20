-- AlterTable
ALTER TABLE "Client" ADD COLUMN     "address" TEXT,
ADD COLUMN     "siret" TEXT,
ADD COLUMN     "vatNumber" TEXT;

-- AlterTable
ALTER TABLE "ClientUser" ADD COLUMN     "phone" TEXT,
ADD COLUMN     "role" TEXT;
