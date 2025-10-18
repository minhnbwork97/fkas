-- AlterTable
ALTER TABLE "CustomAttendee" ADD COLUMN     "playerId" TEXT;

-- AddForeignKey
ALTER TABLE "CustomAttendee" ADD CONSTRAINT "CustomAttendee_playerId_fkey" FOREIGN KEY ("playerId") REFERENCES "Player"("id") ON DELETE SET NULL ON UPDATE CASCADE;
