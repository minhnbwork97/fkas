import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/src/lib/prisma";
import { adminPinError } from "@/src/lib/adminGuard";
import {
  isBlank,
  kitItemInclude,
  parseKitItemFields,
  parseMoney,
  priceFor,
} from "@/src/lib/kit-order";

/** Organizer adds a shirt for a player or for a non-member */
export async function POST(
  req: NextRequest,
  context: { params: Promise<{ kitOrderId: string }> }
) {
  try {
    const body = await req.json();
    const authError = adminPinError(body?.adminPin);
    if (authError) {
      return NextResponse.json(
        { error: authError.error },
        { status: authError.status }
      );
    }
    const { kitOrderId } = await context.params;

    const order = await prisma.kitOrder.findUnique({
      where: { id: kitOrderId },
    });
    if (!order) {
      return NextResponse.json(
        { error: "Không tìm thấy đợt làm áo" },
        { status: 404 }
      );
    }

    const playerId =
      typeof body.playerId === "string" && body.playerId ? body.playerId : null;
    const guestName =
      typeof body.guestName === "string" && body.guestName.trim()
        ? body.guestName.trim()
        : null;
    if (!playerId && !guestName) {
      return NextResponse.json(
        { error: "Chọn cầu thủ hoặc nhập tên người đặt" },
        { status: 400 }
      );
    }

    if (playerId) {
      const existing = await prisma.kitOrderItem.findUnique({
        where: { kitOrderId_playerId: { kitOrderId, playerId } },
      });
      if (existing) {
        return NextResponse.json(
          { error: "Cầu thủ này đã đăng ký áo trong đợt" },
          { status: 409 }
        );
      }
    }

    const parsed = parseKitItemFields(body);
    if ("error" in parsed) {
      return NextResponse.json({ error: parsed.error }, { status: 400 });
    }

    const customAmount = parseMoney(body.amount);
    if (!isBlank(body.amount) && customAmount === null) {
      return NextResponse.json(
        { error: "Số tiền không hợp lệ" },
        { status: 400 }
      );
    }

    const item = await prisma.kitOrderItem.create({
      data: {
        kitOrderId,
        playerId,
        guestName: playerId ? null : guestName,
        ...parsed.fields,
        amount: customAmount ?? priceFor(order, parsed.fields.printOnly),
        priceOverridden: customAmount !== null,
      },
      include: kitItemInclude,
    });

    return NextResponse.json(item, { status: 201 });
  } catch (e: unknown) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Lỗi hệ thống" },
      { status: 500 }
    );
  }
}
