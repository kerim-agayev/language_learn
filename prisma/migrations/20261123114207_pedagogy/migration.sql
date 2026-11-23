-- AlterEnum
ALTER TYPE "ItemType" ADD VALUE 'COLLOCATION';

-- AlterTable
ALTER TABLE "Item" ADD COLUMN     "simple" TEXT;
