import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/src/lib/prisma";
import { resolvePlayer } from "@/src/lib/player-identity";

/**
 * Player says they have transferred the money for all their unpaid shirts.
 * Only flags the rows; the organizer still confirms `paid`.
 */
export async function POST(
  req: NextRequest,
  context: { params: Promise<{ kitOrderId: string }> }
) {
  try {
    const body = await req.json();
    const { kitOrderId } = await context.params;

    const player = await resolvePlayer(body);
    if (!player) {
      return NextResponse.json(
        { error: "Không xác định được cầu thủ" },
        { status: 404 }
      );
    }

    const { count } = await prisma.kitOrderItem.updateMany({
      where: { kitOrderId, playerId: player.id, paid: false },
      data: { selfReportedAt: new Date() },
    });
    if (count === 0) {
      return NextResponse.json(
        { error: "Không có áo nào cần thanh toán" },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      message: "Đã ghi nhận, BTC sẽ xác nhận khi nhận được tiền",
    });
  } catch (e: unknown) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Lỗi hệ thống" },
      { status: 500 }
    );
  }
}
