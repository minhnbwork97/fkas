import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/src/lib/prisma";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ matchId: string }> }
) {
  try {
    const { matchId } = await params;
    const { searchParams } = new URL(request.url);
    const playerId = searchParams.get("playerId");

    if (!playerId) {
      return NextResponse.json(
        { error: "Thiếu thông tin cầu thủ" },
        { status: 400 }
      );
    }

    // Check if player has existing attendance for this match
    const existingAttendance = await prisma.attendanceIntent.findFirst({
      where: {
        matchId: matchId,
        playerId: playerId,
      },
      include: {
        player: {
          select: {
            name: true,
          },
        },
      },
    });

    if (existingAttendance) {
      return NextResponse.json({
        hasAttendance: true,
        attendance: {
          status: existingAttendance.status,
          guestCount: existingAttendance.guestCount,
          isLate: existingAttendance.isLate,
          note: existingAttendance.note,
          updatedAt: existingAttendance.createdAt,
          playerName: existingAttendance.player.name,
        },
      });
    }

    return NextResponse.json({
      hasAttendance: false,
    });
  } catch (error) {
    console.error("Error checking player attendance:", error);
    return NextResponse.json(
      { error: "Không thể kiểm tra điểm danh" },
      { status: 500 }
    );
  }
}
