import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/src/lib/prisma";

export async function POST(
  req: NextRequest,
  context: { params: Promise<{ matchId: string }> }
) {
  try {
    const { matchId } = await context.params;
    const body = await req.json();
    const { deviceId } = body;

    if (!deviceId) {
      return NextResponse.json(
        { error: "Device ID required" },
        { status: 400 }
      );
    }

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
    const player = await prisma.player.findFirst({
      where: {
        name: approvedRequest.name,
        phone: approvedRequest.phone,
      },
    });

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

    // Update the settlement to mark as paid (self-reported)
    const updatedSettlement = await prisma.settlement.update({
      where: { id: settlement.id },
      data: {
        paid: true,
        // Note: We could add a field to track if this was self-reported vs admin-confirmed
        // but for now we'll just mark as paid
      },
      include: {
        player: { select: { id: true, name: true } },
      },
    });

    return NextResponse.json({
      success: true,
      message: "Đã ghi nhận báo cáo thanh toán của bạn",
      settlement: {
        id: updatedSettlement.id,
        amount: updatedSettlement.amount,
        paid: updatedSettlement.paid,
        playerName: updatedSettlement.player?.name,
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
