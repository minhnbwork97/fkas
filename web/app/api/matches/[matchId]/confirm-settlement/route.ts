import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/src/lib/prisma";
import { assertAdmin } from "@/src/lib/adminGuard";
import { executeTransaction } from "@/src/lib/transaction";

export async function POST(
  req: NextRequest,
  context: { params: Promise<{ matchId: string }> }
) {
  try {
    const { matchId } = await context.params;
    const body = await req.json();
    const { adminPin } = body;

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

    // Get match to verify it exists and current status
    const match = await prisma.match.findUnique({
      where: { id: matchId },
      select: { id: true, status: true, dateTime: true },
    });

    if (!match) {
      return NextResponse.json(
        { error: "Không tìm thấy trận đấu" },
        { status: 404 }
      );
    }

    if (match.status === "Settled") {
      return NextResponse.json(
        { error: "Trận đấu đã được xác nhận thanh toán rồi" },
        { status: 400 }
      );
    }

    // Check if there are any settlements for this match
    const settlementsCount = await prisma.settlement.count({
      where: { matchId },
    });

    if (settlementsCount === 0) {
      return NextResponse.json(
        {
          error:
            "Chưa có tính toán thanh toán nào. Vui lòng tính toán trước khi xác nhận.",
        },
        { status: 400 }
      );
    }

    // Get all unpaid settlements with players (not custom attendees)
    const unpaidPlayerSettlements = await prisma.settlement.findMany({
      where: {
        matchId,
        playerId: { not: null },
        paid: false,
      },
      include: {
        player: { select: { id: true, name: true, balance: true } },
      },
    });

    // Format match date for transaction notes
    const matchDate = new Date(match.dateTime);
    const day = matchDate.getDate().toString().padStart(2, "0");
    const month = (matchDate.getMonth() + 1).toString().padStart(2, "0");
    const year = matchDate.getFullYear();
    const formattedDate = `${day}/${month}/${year}`;

    // Track how many settlements were auto-paid
    let autoMarkedPaidCount = 0;

    // Pre-check which players have contributed to fund to avoid nested queries in transaction
    const playerIds = unpaidPlayerSettlements
      .map((s) => s.playerId)
      .filter((id): id is string => Boolean(id));

    const playersWithFunds = new Set(
      playerIds.length > 0
        ? (
            await prisma.transaction.findMany({
              where: {
                playerId: { in: playerIds },
                type: { in: ["TopUp", "Charge"] },
              },
              select: { playerId: true },
              distinct: ["playerId"],
            })
          ).map((t) => t.playerId)
        : []
    );

    // Use transaction to update match status and auto-pay player settlements
    await executeTransaction(async (tx) => {
      // Update match status to settled
      await tx.match.update({
        where: { id: matchId },
        data: { status: "Settled" },
      });

      // Auto-mark player settlements as paid ONLY if they have contributed to the fund
      for (const settlement of unpaidPlayerSettlements) {
        if (!settlement.player || !settlement.playerId) continue;

        // Check if player has contributed to fund (using pre-fetched data)
        const hasContributedToFund = playersWithFunds.has(settlement.playerId);

        // Only mark as paid and deduct from fund if player has contributed before
        if (hasContributedToFund) {
          // Mark settlement as paid
          await tx.settlement.update({
            where: { id: settlement.id },
            data: { paid: true },
          });

          // Create charge transaction
          await tx.transaction.create({
            data: {
              playerId: settlement.playerId,
              matchId: matchId,
              type: "Charge",
              amount: -settlement.amount, // negative for deduction
              note: `Trừ tiền sân ${formattedDate}`,
            },
          });

          // Update player balance (allow negative)
          await tx.player.update({
            where: { id: settlement.playerId },
            data: { balance: { decrement: settlement.amount } },
          });

          autoMarkedPaidCount++;
        }
        // If player has no fund transactions, leave settlement as unpaid (they need to pay cash)
      }
    });

    return NextResponse.json(
      {
        success: true,
        message: "Đã xác nhận thanh toán trận đấu thành công",
        matchId,
        status: "Settled",
        autoMarkedPaid: autoMarkedPaidCount,
        totalUnpaid: unpaidPlayerSettlements.length,
        remainingUnpaid: unpaidPlayerSettlements.length - autoMarkedPaidCount,
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
