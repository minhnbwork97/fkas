-- CreateTable
CREATE TABLE "ZaloTurn" (
    "messageId" TEXT NOT NULL,
    "zaloUserId" TEXT NOT NULL,
    "chatId" TEXT NOT NULL,
    "chatType" TEXT NOT NULL,
    "text" TEXT NOT NULL,
    "reply" TEXT,
    "steps" JSONB,
    "inputTokens" INTEGER,
    "outputTokens" INTEGER,
    "durationMs" INTEGER,
    "error" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ZaloTurn_pkey" PRIMARY KEY ("messageId")
);

-- CreateTable
CREATE TABLE "ZaloPendingAction" (
    "id" TEXT NOT NULL,
    "zaloUserId" TEXT NOT NULL,
    "chatId" TEXT NOT NULL,
    "kind" TEXT NOT NULL,
    "payload" JSONB NOT NULL,
    "summary" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ZaloPendingAction_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ZaloGroup" (
    "chatId" TEXT NOT NULL,
    "notify" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "lastSeenAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ZaloGroup_pkey" PRIMARY KEY ("chatId")
);

-- CreateTable
CREATE TABLE "ZaloNotification" (
    "id" TEXT NOT NULL,
    "kind" TEXT NOT NULL,
    "refId" TEXT NOT NULL,
    "chatId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ZaloNotification_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ZaloTurn_zaloUserId_chatId_createdAt_idx" ON "ZaloTurn"("zaloUserId", "chatId", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "ZaloPendingAction_zaloUserId_chatId_key" ON "ZaloPendingAction"("zaloUserId", "chatId");

-- CreateIndex
CREATE UNIQUE INDEX "ZaloNotification_kind_refId_chatId_key" ON "ZaloNotification"("kind", "refId", "chatId");

