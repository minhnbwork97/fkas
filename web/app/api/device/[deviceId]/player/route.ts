import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/src/lib/prisma";

export async function GET(
  req: NextRequest,
  context: { params: Promise<{ deviceId: string }> }
) {
  try {
    const { deviceId } = await context.params;

    // Find the most recent approved roster request for this device
    const approvedRequest = await prisma.pendingRosterRequest.findFirst({
      where: {
        deviceId: deviceId,
        status: "Approved",
      },
      orderBy: { createdAt: "desc" },
    });

    if (!approvedRequest) {
      return NextResponse.json(
        { error: "Không tìm thấy cầu thủ cho thiết bị này" },
        { status: 404 }
      );
    }

    // Find the player by name (since we don't store playerId in the request)
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

    return NextResponse.json(
      {
        playerId: player.id,
        name: player.name,
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
