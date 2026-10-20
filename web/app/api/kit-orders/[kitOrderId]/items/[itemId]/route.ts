import { NextRequest, NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { prisma } from "@/src/lib/prisma";
import { adminPinError } from "@/src/lib/adminGuard";
import {
  kitItemInclude,
  parseKitItemFields,
  parseMoney,
  priceFor,
} from "@/src/lib/kit-order";

type Ctx = { params: Promise<{ kitOrderId: string; itemId: string }> };

async function findItem(kitOrderId: string, itemId: string) {
  return prisma.kitOrderItem.findFirst({
    where: { id: itemId, kitOrderId },
    include: { kitOrder: true },
  });
}

/**
 * Organizer edits a shirt. Any subset of fields may be sent:
 * shirt fields, `amount` (number = custom price, null = back to order price)
 * and `paid`.
 */
export async function PATCH(req: NextRequest, context: Ctx) {
  try {
    const body = await req.json();
    const authError = adminPinError(body?.adminPin);
    if (authError) {
      return NextResponse.json(
        { error: authError.error },
        { status: authError.status }
      );
    }
    const { kitOrderId, itemId } = await context.params;

    const existing = await findItem(kitOrderId, itemId);
    if (!existing) {
      return NextResponse.json({ error: "Không tìm thấy áo" }, { status: 404 });
    }

    const parsed = parseKitItemFields({
      size: existing.size,
      sizeNote: existing.sizeNote,
      printName: existing.printName,
      number: existing.number,
      printOnly: existing.printOnly,
      ...body,
    });
    if ("error" in parsed) {
      return NextResponse.json({ error: parsed.error }, { status: 400 });
    }

    const data: Prisma.KitOrderItemUpdateInput = { ...parsed.fields };

    if ("guestName" in body && !existing.playerId) {
      const guestName =
        typeof body.guestName === "string" ? body.guestName.trim() : "";
      if (!guestName) {
        return NextResponse.json(
          { error: "Tên người đặt là bắt buộc" },
          { status: 400 }
        );
      }
      data.guestName = guestName;
    }

    if ("amount" in body && body.amount !== null) {
      const amount = parseMoney(body.amount);
      if (amount === null) {
        return NextResponse.json(
          { error: "Số tiền không hợp lệ" },
          { status: 400 }
        );
      }
      data.amount = amount;
      data.priceOverridden = true;
    } else if (
      ("amount" in body && body.amount === null) ||
      (!existing.priceOverridden && !existing.paid)
    ) {
      // Follow the order price (also picks up a printOnly toggle)
      data.amount = priceFor(existing.kitOrder, parsed.fields.printOnly);
      data.priceOverridden = false;
    }

    if ("paid" in body) {
      if (typeof body.paid !== "boolean") {
        return NextResponse.json(
          { error: "paid phải là true/false" },
          { status: 400 }
        );
      }
      data.paid = body.paid;
      data.paidAt = body.paid ? existing.paidAt ?? new Date() : null;
      if (!body.paid) data.selfReportedAt = null;
    }

    const item = await prisma.kitOrderItem.update({
      where: { id: itemId },
      data,
      include: kitItemInclude,
    });
    return NextResponse.json(item);
  } catch (e: unknown) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Lỗi hệ thống" },
      { status: 500 }
    );
  }
}

export async function DELETE(req: NextRequest, context: Ctx) {
  try {
    const authError = adminPinError(req.nextUrl.searchParams.get("adminPin"));
    if (authError) {
      return NextResponse.json(
        { error: authError.error },
        { status: authError.status }
      );
    }
    const { kitOrderId, itemId } = await context.params;

    const existing = await findItem(kitOrderId, itemId);
    if (!existing) {
      return NextResponse.json({ error: "Không tìm thấy áo" }, { status: 404 });
    }
    if (existing.paid) {
      return NextResponse.json(
        { error: "Áo đã thu tiền, bỏ đánh dấu đã thu trước khi xoá" },
        { status: 409 }
      );
    }

    await prisma.kitOrderItem.delete({ where: { id: itemId } });
    return NextResponse.json({ success: true });
  } catch (e: unknown) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Lỗi hệ thống" },
      { status: 500 }
    );
  }
}
