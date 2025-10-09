import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/src/lib/prisma";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ matchId: string }> }
) {
  try {
    const { matchId } = await params;

    // Fetch current attendance for this match
    const attendance = await prisma.attendanceIntent.findMany({
      where: {
        matchId: matchId,
      },
      include: {
        player: {
          select: {
            id: true,
            name: true,
          },
        },
      },
      orderBy: {
        createdAt: "desc",
      },
    });

    // Format the response for player view
    const formattedAttendance = attendance.map((intent) => ({
      playerName: intent.player.name,
      status: intent.status,
      guestCount: intent.guestCount,
      isLate: intent.isLate,
      note: intent.note,
      updatedAt: intent.createdAt,
    }));

    // Calculate totals
    const attendingCount = attendance.filter(
      (a) => a.status === "Attending"
    ).length;
    const totalGuests = attendance.reduce(
      (sum, a) => sum + (a.status === "Attending" ? a.guestCount : 0),
      0
    );
    const totalAttending = attendingCount + totalGuests;

    return NextResponse.json({
      attendance: formattedAttendance,
      summary: {
        totalPlayers: attendingCount,
        totalGuests: totalGuests,
        totalAttending: totalAttending,
        undecided: attendance.filter((a) => a.status === "Tentative").length,
        notGoing: attendance.filter((a) => a.status === "NotGoing").length,
      },
    });
  } catch (error) {
    console.error("Error fetching current attendance:", error);
    return NextResponse.json(
      { error: "Không thể tải danh sách tham gia" },
      { status: 500 }
    );
  }
}
