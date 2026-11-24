-- AlterTable
ALTER TABLE "Item" ADD COLUMN "slug" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "Item_slug_key" ON "Item"("slug");
