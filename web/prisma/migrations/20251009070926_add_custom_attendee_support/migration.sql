-- CreateTable
CREATE TABLE "CustomAttendee" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "matchId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "guestCount" INTEGER NOT NULL DEFAULT 0,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "CustomAttendee_matchId_fkey" FOREIGN KEY ("matchId") REFERENCES "Match" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Settlement" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "matchId" TEXT NOT NULL,
    "playerId" TEXT,
    "customId" TEXT,
    "amount" INTEGER NOT NULL,
    "paid" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Settlement_matchId_fkey" FOREIGN KEY ("matchId") REFERENCES "Match" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "Settlement_playerId_fkey" FOREIGN KEY ("playerId") REFERENCES "Player" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "Settlement_customId_fkey" FOREIGN KEY ("customId") REFERENCES "CustomAttendee" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_Settlement" ("amount", "createdAt", "id", "matchId", "paid", "playerId", "updatedAt") SELECT "amount", "createdAt", "id", "matchId", "paid", "playerId", "updatedAt" FROM "Settlement";
DROP TABLE "Settlement";
ALTER TABLE "new_Settlement" RENAME TO "Settlement";
CREATE UNIQUE INDEX "Settlement_matchId_playerId_key" ON "Settlement"("matchId", "playerId");
CREATE UNIQUE INDEX "Settlement_matchId_customId_key" ON "Settlement"("matchId", "customId");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
