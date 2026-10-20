-- CreateEnum
CREATE TYPE "KitImageKind" AS ENUM ('Preview', 'SizeChart');

-- CreateTable
CREATE TABLE "KitOrderImage" (
    "id" TEXT NOT NULL,
    "kitOrderId" TEXT NOT NULL,
    "kind" "KitImageKind" NOT NULL,
    "mimeType" TEXT NOT NULL,
    "data" BYTEA NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "KitOrderImage_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "KitOrderImage_kitOrderId_idx" ON "KitOrderImage"("kitOrderId");

-- AddForeignKey
ALTER TABLE "KitOrderImage" ADD CONSTRAINT "KitOrderImage_kitOrderId_fkey" FOREIGN KEY ("kitOrderId") REFERENCES "KitOrder"("id") ON DELETE CASCADE ON UPDATE CASCADE;

