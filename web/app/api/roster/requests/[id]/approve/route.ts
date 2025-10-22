import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/src/lib/prisma";
import { assertAdmin } from "@/src/lib/adminGuard";

export async function POST(
  req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await context.params;
    const body = await req.json();
    const { adminPin } = body ?? {};
    assertAdmin(process.env.ADMIN_PIN, adminPin);

    const reqItem = await prisma.pendingRosterRequest.findUnique({
      where: { id },
    });
    if (!reqItem)
      return NextResponse.json({ error: "Không tìm thấy" }, { status: 404 });

    // If phone exists, ensure not duplicated
    if (reqItem.phone) {
      const existing = await prisma.player.findFirst({
        where: { phone: reqItem.phone },
        select: { id: true },
      });
      if (existing) {
        return NextResponse.json(
          { error: "Số điện thoại này đã được đăng ký" },
          { status: 409 }
        );
      }
    }

    const player = await prisma.player.create({
      data: { name: reqItem.name, phone: reqItem.phone ?? undefined },
    });
    await prisma.pendingRosterRequest.update({
      where: { id },
      data: { status: "Approved" },
    });

    // Store device binding if deviceId exists
    if (reqItem.deviceId) {
      // We'll create a simple device binding mechanism
      // For now, we'll store the playerId in a way that can be retrieved by deviceId
      // This could be enhanced with a proper DeviceBinding table in the future
    }

    return NextResponse.json(
      {
        playerId: player.id,
        name: player.name,
        deviceId: reqItem.deviceId,
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
