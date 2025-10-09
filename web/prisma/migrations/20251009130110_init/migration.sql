-- CreateEnum
CREATE TYPE "MatchType" AS ENUM ('Internal', 'VsTeam');

-- CreateEnum
CREATE TYPE "MatchStatus" AS ENUM ('Draft', 'Collecting', 'Ready', 'NotReady', 'Settled');

-- CreateEnum
CREATE TYPE "AttendanceStatus" AS ENUM ('Attending', 'Tentative', 'NotGoing');

-- CreateEnum
CREATE TYPE "TransactionType" AS ENUM ('TopUp', 'Charge', 'Refund');

-- CreateEnum
CREATE TYPE "FundDirection" AS ENUM ('Income', 'Expense');

-- CreateEnum
CREATE TYPE "InviteStatus" AS ENUM ('Active', 'Revoked', 'Used');

-- CreateEnum
CREATE TYPE "RosterRequestStatus" AS ENUM ('Pending', 'Approved', 'Rejected');

-- CreateTable
CREATE TABLE "Player" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "phone" TEXT,
    "balance" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Player_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Match" (
    "id" TEXT NOT NULL,
    "dateTime" TIMESTAMP(3) NOT NULL,
    "type" "MatchType" NOT NULL,
    "status" "MatchStatus" NOT NULL,
    "fieldCost" INTEGER NOT NULL DEFAULT 600000,
    "link" TEXT NOT NULL,
    "qrCodeRef" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Match_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AttendanceIntent" (
    "id" TEXT NOT NULL,
    "matchId" TEXT NOT NULL,
    "playerId" TEXT NOT NULL,
    "status" "AttendanceStatus" NOT NULL,
    "isLate" BOOLEAN NOT NULL DEFAULT false,
    "note" TEXT,
    "guestCount" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AttendanceIntent_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AttendanceActual" (
    "id" TEXT NOT NULL,
    "matchId" TEXT NOT NULL,
    "playerId" TEXT NOT NULL,
    "memberAttended" BOOLEAN NOT NULL DEFAULT false,
    "guestsAttended" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AttendanceActual_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Transaction" (
    "id" TEXT NOT NULL,
    "playerId" TEXT NOT NULL,
    "matchId" TEXT,
    "type" "TransactionType" NOT NULL,
    "amount" INTEGER NOT NULL,
    "note" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Transaction_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Settlement" (
    "id" TEXT NOT NULL,
    "matchId" TEXT NOT NULL,
    "playerId" TEXT,
    "customId" TEXT,
    "amount" INTEGER NOT NULL,
    "paid" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Settlement_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CustomAttendee" (
    "id" TEXT NOT NULL,
    "matchId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "guestCount" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CustomAttendee_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TeamFundEntry" (
    "id" TEXT NOT NULL,
    "direction" "FundDirection" NOT NULL,
    "amount" INTEGER NOT NULL,
    "note" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "TeamFundEntry_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MatchInviteToken" (
    "id" TEXT NOT NULL,
    "matchId" TEXT NOT NULL,
    "playerId" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "status" "InviteStatus" NOT NULL,

    CONSTRAINT "MatchInviteToken_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PendingRosterRequest" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "phone" TEXT,
    "deviceId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "status" "RosterRequestStatus" NOT NULL,

    CONSTRAINT "PendingRosterRequest_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "AttendanceIntent_matchId_playerId_key" ON "AttendanceIntent"("matchId", "playerId");

-- CreateIndex
CREATE UNIQUE INDEX "AttendanceActual_matchId_playerId_key" ON "AttendanceActual"("matchId", "playerId");

-- CreateIndex
CREATE UNIQUE INDEX "Settlement_matchId_playerId_key" ON "Settlement"("matchId", "playerId");

-- CreateIndex
CREATE UNIQUE INDEX "Settlement_matchId_customId_key" ON "Settlement"("matchId", "customId");

-- CreateIndex
CREATE UNIQUE INDEX "MatchInviteToken_token_key" ON "MatchInviteToken"("token");

-- AddForeignKey
ALTER TABLE "AttendanceIntent" ADD CONSTRAINT "AttendanceIntent_matchId_fkey" FOREIGN KEY ("matchId") REFERENCES "Match"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AttendanceIntent" ADD CONSTRAINT "AttendanceIntent_playerId_fkey" FOREIGN KEY ("playerId") REFERENCES "Player"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AttendanceActual" ADD CONSTRAINT "AttendanceActual_matchId_fkey" FOREIGN KEY ("matchId") REFERENCES "Match"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AttendanceActual" ADD CONSTRAINT "AttendanceActual_playerId_fkey" FOREIGN KEY ("playerId") REFERENCES "Player"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Transaction" ADD CONSTRAINT "Transaction_playerId_fkey" FOREIGN KEY ("playerId") REFERENCES "Player"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Transaction" ADD CONSTRAINT "Transaction_matchId_fkey" FOREIGN KEY ("matchId") REFERENCES "Match"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Settlement" ADD CONSTRAINT "Settlement_matchId_fkey" FOREIGN KEY ("matchId") REFERENCES "Match"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Settlement" ADD CONSTRAINT "Settlement_playerId_fkey" FOREIGN KEY ("playerId") REFERENCES "Player"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Settlement" ADD CONSTRAINT "Settlement_customId_fkey" FOREIGN KEY ("customId") REFERENCES "CustomAttendee"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CustomAttendee" ADD CONSTRAINT "CustomAttendee_matchId_fkey" FOREIGN KEY ("matchId") REFERENCES "Match"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MatchInviteToken" ADD CONSTRAINT "MatchInviteToken_matchId_fkey" FOREIGN KEY ("matchId") REFERENCES "Match"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MatchInviteToken" ADD CONSTRAINT "MatchInviteToken_playerId_fkey" FOREIGN KEY ("playerId") REFERENCES "Player"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
