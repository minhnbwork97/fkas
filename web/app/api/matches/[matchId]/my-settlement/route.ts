import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/src/lib/prisma";
import {
  generatePaymentQR,
  getBankInfo,
  formatMatchPaymentDescription,
} from "@/src/lib/qr-payment";

export async function GET(
  req: NextRequest,
  context: { params: Promise<{ matchId: string }> }
) {
  try {
    const { matchId } = await context.params;
    const deviceId = req.nextUrl.searchParams.get("deviceId");
    const phone = req.nextUrl.searchParams.get("phone");
    if (!deviceId && !phone) {
      return NextResponse.json(
        { error: "deviceId or phone required" },
        { status: 400 }
      );
    }

    // Resolve player either by phone directly or via device binding
    let player: { id: string; name: string } | null = null;
    if (phone) {
      const found = await prisma.player.findFirst({
        where: { phone },
        select: { id: true, name: true },
      });
      if (!found) {
        return NextResponse.json(
          { error: "Không tìm thấy cầu thủ với số điện thoại này" },
          { status: 404 }
        );
      }
      player = found;
    } else if (deviceId) {
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
      const found = await prisma.player.findFirst({
        where: { name: approved.name, phone: approved.phone },
        select: { id: true, name: true },
      });
      player = found;
    }
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

    // Generate QR code if bank info is configured and payment not yet made
    let qrCodeUrl: string | null = null;
    if (!settlement.paid) {
      const bankInfo = getBankInfo();
      if (bankInfo) {
        // Get match info for description
        const match = await prisma.match.findUnique({
          where: { id: matchId },
          select: { dateTime: true },
        });

        if (match) {
          const description = formatMatchPaymentDescription(
            new Date(match.dateTime),
            matchId,
            player.name
          );

          qrCodeUrl = await generatePaymentQR({
            bankInfo,
            amount: settlement.amount,
            description,
          });
        }
      }
    }

    return NextResponse.json(
      {
        hasSettlement: true,
        amount: settlement.amount,
        paid: settlement.paid,
        playerName: player.name,
        qrCodeUrl, // Include QR code if generated
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
