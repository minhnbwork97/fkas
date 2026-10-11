-- AlterTable
ALTER TABLE "AttendanceActual" ADD COLUMN     "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;

-- Existing rows: we only know when they were first saved. Using that (rather
-- than the migration time) lets attendance changes made after it take effect.
UPDATE "AttendanceActual" SET "updatedAt" = "createdAt";
