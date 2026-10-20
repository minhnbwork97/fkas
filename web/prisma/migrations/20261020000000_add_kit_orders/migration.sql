-- CreateEnum
CREATE TYPE "KitOrderStatus" AS ENUM ('Collecting', 'Ordered', 'Delivered');

-- CreateEnum
CREATE TYPE "KitSize" AS ENUM ('S', 'M', 'L', 'XL', 'XXL', 'Other');

-- CreateTable
CREATE TABLE "KitOrder" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "defaultPrice" INTEGER NOT NULL,
    "printOnlyPrice" INTEGER,
    "deadline" TIMESTAMP(3),
    "status" "KitOrderStatus" NOT NULL DEFAULT 'Collecting',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "KitOrder_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "KitOrderItem" (
    "id" TEXT NOT NULL,
    "kitOrderId" TEXT NOT NULL,
    "playerId" TEXT,
    "guestName" TEXT,
    "size" "KitSize" NOT NULL,
    "sizeNote" TEXT,
    "printName" TEXT,
    "number" INTEGER,
    "printOnly" BOOLEAN NOT NULL DEFAULT false,
    "amount" INTEGER NOT NULL,
    "priceOverridden" BOOLEAN NOT NULL DEFAULT false,
    "note" TEXT,
    "paid" BOOLEAN NOT NULL DEFAULT false,
    "paidAt" TIMESTAMP(3),
    "selfReportedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "KitOrderItem_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "KitOrderItem_kitOrderId_idx" ON "KitOrderItem"("kitOrderId");

-- AddForeignKey
ALTER TABLE "KitOrderItem" ADD CONSTRAINT "KitOrderItem_kitOrderId_fkey" FOREIGN KEY ("kitOrderId") REFERENCES "KitOrder"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "KitOrderItem" ADD CONSTRAINT "KitOrderItem_playerId_fkey" FOREIGN KEY ("playerId") REFERENCES "Player"("id") ON DELETE SET NULL ON UPDATE CASCADE;

