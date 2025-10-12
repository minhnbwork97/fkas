import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/src/lib/prisma";
import { assertAdmin } from "@/src/lib/adminGuard";

export async function GET(
  req: NextRequest,
  context: { params: Promise<{ playerId: string }> }
) {
  try {
    const { playerId } = await context.params;
    const url = new URL(req.url);
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

    // Verify player exists
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

    // Fetch all transactions for this player, ordered by newest first
    const transactions = await prisma.transaction.findMany({
      where: { playerId },
      orderBy: { createdAt: "desc" },
      include: {
        match: {
          select: { dateTime: true },
        },
      },
    });

    return NextResponse.json(
      {
        player: {
          id: player.id,
          name: player.name,
          balance: player.balance,
        },
        transactions: transactions.map((tx) => ({
          id: tx.id,
          type: tx.type,
          amount: tx.amount,
          note: tx.note,
          matchDate: tx.match?.dateTime,
          createdAt: tx.createdAt.toISOString(),
        })),
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

