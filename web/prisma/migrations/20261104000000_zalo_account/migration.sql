-- CreateTable
CREATE TABLE "ZaloAccount" (
    "zaloUserId" TEXT NOT NULL,
    "displayName" TEXT NOT NULL,
    "playerId" TEXT,
    "isAdmin" BOOLEAN NOT NULL DEFAULT false,
    "linkedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ZaloAccount_pkey" PRIMARY KEY ("zaloUserId")
);

-- CreateIndex
CREATE UNIQUE INDEX "ZaloAccount_playerId_key" ON "ZaloAccount"("playerId");

-- AddForeignKey
ALTER TABLE "ZaloAccount" ADD CONSTRAINT "ZaloAccount_playerId_fkey" FOREIGN KEY ("playerId") REFERENCES "Player"("id") ON DELETE SET NULL ON UPDATE CASCADE;

