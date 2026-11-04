import type { AttendanceStatus } from "@prisma/client";
import { prisma } from "./prisma";

/**
 * Official attendance deadline: 9 hours before kickoff (10:00 for a 19:00
 * match). Later submissions still count but are flagged as late on the
 * organizer's list (see attendance-list).
 */
export const ATTENDANCE_DEADLINE_HOURS = 9;

export function attendanceDeadline(kickoff: Date): Date {
  return new Date(kickoff.getTime() - ATTENDANCE_DEADLINE_HOURS * 3600 * 1000);
}

export const ATTENDANCE_STATUSES: AttendanceStatus[] = [
  "Attending",
  "Tentative",
  "NotGoing",
];

/** Save a player's latest intent for a match (shared by the API and the bot) */
export function upsertAttendance(input: {
  matchId: string;
  playerId: string;
  status: AttendanceStatus;
  isLate?: boolean;
  note?: string | null;
  guestCount?: number;
}) {
  const fields = {
    status: input.status,
    isLate: Boolean(input.isLate),
    note: input.note ?? null,
    guestCount: Number.isFinite(input.guestCount) ? Number(input.guestCount) : 0,
  };
  return prisma.attendanceIntent.upsert({
    where: { matchId_playerId: { matchId: input.matchId, playerId: input.playerId } },
    // createdAt doubles as "last updated" for the late-submission flag
    update: { ...fields, createdAt: new Date() },
    create: { matchId: input.matchId, playerId: input.playerId, ...fields },
  });
}
