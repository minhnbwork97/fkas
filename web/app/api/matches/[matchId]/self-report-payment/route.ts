import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/src/lib/prisma";
import { executeTransaction } from "@/src/lib/transaction";

export async function POST(
  req: NextRequest,
  context: { params: Promise<{ matchId: string }> }
) {
  try {
    const { matchId } = await context.params;
    const body = await req.json();
    const { deviceId, phone } = body;

    if (!deviceId && !phone) {
      return NextResponse.json(
        { error: "Device ID or phone required" },
        { status: 400 }
      );
    }

    // Find player either by device ID or phone
    let player: { id: string; name: string } | null = null;

    if (deviceId) {
      // Find player by device ID through approved roster request
      const approvedRequest = await prisma.pendingRosterRequest.findFirst({
        where: {
          deviceId: deviceId,
          status: "Approved",
        },
        orderBy: { createdAt: "desc" },
      });

      if (!approvedRequest) {
        return NextResponse.json(
          { error: "Không tìm thấy cầu thủ với thiết bị này" },
          { status: 404 }
        );
      }

      // Find the player by name and phone
      const foundPlayer = await prisma.player.findFirst({
        where: {
          name: approvedRequest.name,
          phone: approvedRequest.phone,
        },
      });

      if (foundPlayer) {
        player = { id: foundPlayer.id, name: foundPlayer.name };
      }
    } else if (phone) {
      // Find player directly by phone
      const foundPlayer = await prisma.player.findFirst({
        where: { phone },
        select: { id: true, name: true },
      });

      if (foundPlayer) {
        player = foundPlayer;
      }
    }

    if (!player) {
      return NextResponse.json(
        { error: "Không tìm thấy cầu thủ" },
        { status: 404 }
      );
    }

    const playerId = player.id;

    // Find the settlement record for this player and match
    const settlement = await prisma.settlement.findFirst({
      where: {
        matchId: matchId,
        playerId: playerId,
      },
      include: {
        player: { select: { id: true, name: true } },
      },
    });

    if (!settlement) {
      return NextResponse.json(
        { error: "Không tìm thấy thông tin thanh toán cho bạn trong trận này" },
        { status: 404 }
      );
    }

    // Check if player has any previous transactions (indicating they've contributed to the fund)
    const hasContributedToFund = await prisma.transaction.count({
      where: {
        playerId: playerId,
        type: { in: ["TopUp", "Charge"] },
      },
    });

    // Use transaction to ensure atomicity when deducting from fund
    const result = await executeTransaction(async (tx) => {
      const updatedSettlement = await tx.settlement.update({
        where: { id: settlement.id },
        data: {
          paid: true,
          // Note: We could add a field to track if this was self-reported vs admin-confirmed
          // but for now we'll just mark as paid
        },
        include: {
          player: { select: { id: true, name: true, balance: true } },
          match: { select: { dateTime: true } },
        },
      });

      // Only deduct from player fund if they have contributed to the fund before (have previous transactions)
      if (updatedSettlement.player && hasContributedToFund > 0) {
        // Deduct the full settlement amount from player fund
        const deductAmount = updatedSettlement.amount;

        // Format match date as "dd/MM/yyyy"
        const matchDate = new Date(updatedSettlement.match.dateTime);
        const day = matchDate.getDate().toString().padStart(2, "0");
        const month = (matchDate.getMonth() + 1).toString().padStart(2, "0");
        const year = matchDate.getFullYear();
        const formattedDate = `${day}/${month}/${year}`;

        // Create charge transaction
        await tx.transaction.create({
          data: {
            playerId: playerId,
            matchId: matchId,
            type: "Charge",
            amount: -deductAmount, // negative for deduction
            note: `Trừ tiền sân ${formattedDate}`,
          },
        });

        // Update player balance (allow negative)
        await tx.player.update({
          where: { id: playerId },
          data: { balance: { decrement: deductAmount } },
        });
      }

      return updatedSettlement;
    });

    return NextResponse.json({
      success: true,
      message: "Đã ghi nhận báo cáo thanh toán của bạn",
      settlement: {
        id: result.id,
        amount: result.amount,
        paid: result.paid,
        playerName: result.player?.name,
      },
    });
  } catch (error) {
    console.error("Error in self-report payment:", error);
    return NextResponse.json(
      { error: "Lỗi server khi xử lý báo cáo thanh toán" },
      { status: 500 }
    );
  }
}
