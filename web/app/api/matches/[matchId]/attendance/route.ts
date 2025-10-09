import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/src/lib/prisma";
import { log } from "@/src/lib/logger";

export async function POST(
  req: NextRequest,
  context: { params: Promise<{ matchId: string }> }
) {
  try {
    const { matchId } = await context.params;
    const body = await req.json();
    const { playerId, status, isLate, note, guestCount } = body ?? {};
    if (!playerId || !status) {
      return NextResponse.json(
        { error: "Mã cầu thủ và trạng thái là bắt buộc" },
        { status: 400 }
      );
    }
    // Upsert latest intent
    const intent = await prisma.attendanceIntent.upsert({
      where: { matchId_playerId: { matchId, playerId } },
      update: {
        status,
        isLate: Boolean(isLate),
        note: note ?? null,
        guestCount: Number.isFinite(guestCount) ? Number(guestCount) : 0,
        createdAt: new Date(),
      },
      create: {
        matchId,
        playerId,
        status,
        isLate: Boolean(isLate),
        note: note ?? null,
        guestCount: Number.isFinite(guestCount) ? Number(guestCount) : 0,
      },
    });

    log({
      action: "attendance_submitted",
      matchId,
      playerId,
      outcome: "ok",
    });

    return NextResponse.json({ id: intent.id }, { status: 200 });
  } catch (e: unknown) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Lỗi hệ thống" },
      { status: 500 }
    );
  }
}
