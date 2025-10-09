import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/src/lib/prisma";

export async function GET(
  req: NextRequest,
  context: { params: Promise<{ matchId: string }> }
) {
  try {
    const { matchId } = await context.params;
    const deviceId = req.nextUrl.searchParams.get("deviceId");
    if (!deviceId) {
      return NextResponse.json({ error: "deviceId required" }, { status: 400 });
    }

    // Resolve player for deviceId via latest approved request
    const approved = await prisma.pendingRosterRequest.findFirst({
      where: { deviceId, status: "Approved" },
      orderBy: { createdAt: "desc" },
      select: { name: true, phone: true },
    });
    if (!approved) {
      return NextResponse.json(
        { error: "Không tìm thấy cầu thủ" },
        { status: 404 }
      );
    }

    const player = await prisma.player.findFirst({
      where: { name: approved.name, phone: approved.phone },
      select: { id: true, name: true },
    });
    if (!player) {
      return NextResponse.json(
        { error: "Không tìm thấy cầu thủ" },
        { status: 404 }
      );
    }

    // Fetch settlement for this player and match
    const settlement = await prisma.settlement.findUnique({
      where: { matchId_playerId: { matchId, playerId: player.id } },
      select: { amount: true, paid: true },
    });

    if (!settlement) {
      return NextResponse.json({ hasSettlement: false }, { status: 200 });
    }

    return NextResponse.json(
      {
        hasSettlement: true,
        amount: settlement.amount,
        paid: settlement.paid,
        playerName: player.name,
      },
      { status: 200 }
    );
  } catch (e: unknown) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Lỗi hệ thống" },
      { status: 500 }
    );
  }
}
