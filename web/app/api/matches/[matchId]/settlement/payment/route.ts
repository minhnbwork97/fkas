import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/src/lib/prisma";
import { assertAdmin } from "@/src/lib/adminGuard";
import { executeTransaction } from "@/src/lib/transaction";

async function handlePayment(
  req: NextRequest,
  context: { params: Promise<{ matchId: string }> }
) {
  try {
    const { matchId } = await context.params;
    const body = await req.json();
    const { adminPin, playerId, customId, paid } = body;

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

    if ((!playerId && !customId) || typeof paid !== "boolean") {
      return NextResponse.json(
        { error: "playerId/customId and paid status required" },
        { status: 400 }
      );
    }

    // Update payment status (return 404 if not found instead of throwing)
    const existing = await prisma.settlement.findFirst({
      where: {
        matchId: matchId,
        OR: [
          playerId ? { playerId } : undefined,
          customId ? { customId } : undefined,
        ].filter(
          (
            condition
          ): condition is { playerId: string } | { customId: string } =>
            Boolean(condition)
        ),
      },
      include: {
        player: { select: { id: true, name: true } },
        custom: { select: { id: true, name: true } },
      },
    });

    if (!existing) {
      return NextResponse.json(
        { error: "Không tìm thấy bản ghi thanh toán" },
        { status: 404 }
      );
    }

    // Check if player has any previous transactions (indicating they've contributed to the fund)
    const hasContributedToFund = existing.playerId
      ? await prisma.transaction.count({
          where: {
            playerId: existing.playerId,
            type: { in: ["TopUp", "Charge"] },
          },
        })
      : 0;

    // Use transaction to ensure atomicity when deducting from fund
    const result = await executeTransaction(async (tx) => {
      const settlement = await tx.settlement.update({
        where: { id: existing.id },
        data: { paid },
        include: {
          player: { select: { id: true, name: true, balance: true } },
          custom: { select: { id: true, name: true } },
          match: { select: { dateTime: true } },
        },
      });

      // If marking as paid and player exists, deduct from fund only if they've contributed before
      if (
        paid &&
        settlement.playerId &&
        settlement.player &&
        hasContributedToFund > 0
      ) {
        // Deduct the full settlement amount from player fund
        const deductAmount = settlement.amount;

        // Format match date as "dd/MM/yyyy"
        const matchDate = new Date(settlement.match.dateTime);
        const day = matchDate.getDate().toString().padStart(2, "0");
        const month = (matchDate.getMonth() + 1).toString().padStart(2, "0");
        const year = matchDate.getFullYear();
        const formattedDate = `${day}/${month}/${year}`;

        // Create charge transaction
        await tx.transaction.create({
          data: {
            playerId: settlement.playerId,
            matchId: matchId,
            type: "Charge",
            amount: -deductAmount, // negative for deduction
            note: `Trừ tiền sân ${formattedDate}`,
          },
        });

        // Update player balance (allow negative)
        await tx.player.update({
          where: { id: settlement.playerId },
          data: { balance: { decrement: deductAmount } },
        });
      }

      return settlement;
    });

    return NextResponse.json(
      {
        success: true,
        settlement: {
          playerId: result.playerId ?? result.customId,
          playerName: result.player?.name ?? result.custom?.name ?? "",
          amount: result.amount,
          paid: result.paid,
        },
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

// Export both PATCH and PUT methods
export async function PATCH(
  req: NextRequest,
  context: { params: Promise<{ matchId: string }> }
) {
  return handlePayment(req, context);
}

export async function PUT(
  req: NextRequest,
  context: { params: Promise<{ matchId: string }> }
) {
  return handlePayment(req, context);
}
