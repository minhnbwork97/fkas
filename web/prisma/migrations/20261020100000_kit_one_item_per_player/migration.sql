-- AlterTable
ALTER TABLE "KitOrderItem" DROP COLUMN "note",
ALTER COLUMN "size" DROP NOT NULL;

-- CreateIndex
CREATE UNIQUE INDEX "KitOrderItem_kitOrderId_playerId_key" ON "KitOrderItem"("kitOrderId", "playerId");

