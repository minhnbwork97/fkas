import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/src/lib/prisma";

export async function GET(
  _req: NextRequest,
  context: { params: Promise<{ playerId: string }> }
) {
  try {
    const { playerId } = await context.params;

    // Direct UUID lookup
    const player = await prisma.player.findUnique({
      where: { id: playerId },
      select: { id: true, name: true, balance: true },
    });

    if (!player) {
      return NextResponse.json(
        { error: "Không tìm thấy cầu thủ" },
        { status: 404 }
      );
    }

    // Count player's transactions to determine if they've used the fund system
    const transactionCount = await prisma.transaction.count({
      where: { playerId },
    });

    return NextResponse.json(
      {
        id: player.id,
        name: player.name,
        balance: player.balance,
        hasTransactions: transactionCount > 0,
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
