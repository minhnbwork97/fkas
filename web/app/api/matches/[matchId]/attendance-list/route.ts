import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/src/lib/prisma";
import { assertAdmin } from "@/src/lib/adminGuard";

export async function GET(
  _req: NextRequest,
  context: { params: Promise<{ matchId: string }> }
) {
  try {
    const { matchId } = await context.params;

    // Get admin PIN from query params
    const url = new URL(_req.url);
    const adminPin = url.searchParams.get("adminPin");
    if (!adminPin) {
      return NextResponse.json(
        { error: "Admin PIN required" },
        { status: 401 }
      );
    }

    // Verify admin PIN
    try {
      assertAdmin(process.env.ADMIN_PIN, adminPin);
    } catch {
      return NextResponse.json({ error: "Invalid admin PIN" }, { status: 403 });
    }

    // Get match
    const match = await prisma.match.findUnique({
      where: { id: matchId },
    });

    if (!match) {
      return NextResponse.json({ error: "Không tìm thấy" }, { status: 404 });
    }

    // Get attendance intents with player info
    const intents = await prisma.attendanceIntent.findMany({
      where: { matchId },
      include: {
        player: {
          select: {
            id: true,
            name: true,
          },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    // Get actual attendance data (if settlement has been calculated)
    const actualAttendance = await prisma.attendanceActual.findMany({
      where: { matchId },
    });

    // Create a map of actual attendance for quick lookup
    const actualAttendanceMap = new Map(
      actualAttendance.map((actual) => [actual.playerId, actual])
    );

    // Calculate late submission status for each intent and merge with actual data
    const attendance = intents.map((intent) => {
      const matchTime = new Date(match.dateTime);
      const officialDeadline = new Date(
        matchTime.getTime() - 9 * 60 * 60 * 1000
      ); // 9 hours before match
      const isLateSubmission = intent.createdAt > officialDeadline;

      // Get actual attendance data if available
      const actual = actualAttendanceMap.get(intent.playerId);

      return {
        playerId: intent.playerId,
        playerName: intent.player.name,
        status: intent.status,
        guestCount: intent.guestCount,
        isLate: intent.isLate, // Will arrive late to match
        isLateSubmission: isLateSubmission, // Submitted attendance after deadline
        note: intent.note || "",
        updatedAt: intent.createdAt.toISOString(),
        // Add actual attendance data for settlement page
        memberAttended: actual?.memberAttended ?? intent.status === "Attending",
        guestsAttended:
          actual?.guestsAttended ??
          (intent.status === "Attending" ? intent.guestCount : 0),
      };
    });

    return NextResponse.json({ attendance }, { status: 200 });
  } catch (e: unknown) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Lỗi hệ thống" },
      { status: 500 }
    );
  }
}
