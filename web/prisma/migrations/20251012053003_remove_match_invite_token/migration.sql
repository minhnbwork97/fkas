/*
  Warnings:

  - You are about to drop the `MatchInviteToken` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropForeignKey
ALTER TABLE "public"."MatchInviteToken" DROP CONSTRAINT "MatchInviteToken_matchId_fkey";

-- DropForeignKey
ALTER TABLE "public"."MatchInviteToken" DROP CONSTRAINT "MatchInviteToken_playerId_fkey";

-- DropTable
DROP TABLE "public"."MatchInviteToken";

-- DropEnum
DROP TYPE "public"."InviteStatus";
