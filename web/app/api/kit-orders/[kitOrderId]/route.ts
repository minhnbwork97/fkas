import { NextRequest, NextResponse } from "next/server";
import { KitOrderStatus, Prisma } from "@prisma/client";
import { prisma } from "@/src/lib/prisma";
import { adminPinError } from "@/src/lib/adminGuard";
import {
  displayName,
  isBlank,
  kitItemInclude,
  parseMoney,
  priceFor,
  summarizeKitOrder,
} from "@/src/lib/kit-order";

type Ctx = { params: Promise<{ kitOrderId: string }> };

const STATUSES: KitOrderStatus[] = ["Collecting", "Ordered", "Delivered"];

export async function GET(req: NextRequest, context: Ctx) {
  try {
    const authError = adminPinError(req.nextUrl.searchParams.get("adminPin"));
    if (authError) {
      return NextResponse.json(
        { error: authError.error },
        { status: authError.status }
      );
    }
    const { kitOrderId } = await context.params;

    const order = await prisma.kitOrder.findUnique({
      where: { id: kitOrderId },
      include: {
        items: { include: kitItemInclude, orderBy: { createdAt: "asc" } },
      },
    });
    if (!order) {
      return NextResponse.json(
        { error: "Không tìm thấy đợt làm áo" },
        { status: 404 }
      );
    }

    const { items, ...rest } = order;
    return NextResponse.json({
      ...rest,
      summary: summarizeKitOrder(items),
      items: items.map((item) => ({
        ...item,
        displayName: displayName(item),
      })),
    });
  } catch (e: unknown) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Lỗi hệ thống" },
      { status: 500 }
    );
  }
}

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
    const { kitOrderId } = await context.params;

    const existing = await prisma.kitOrder.findUnique({
      where: { id: kitOrderId },
    });
    if (!existing) {
      return NextResponse.json(
        { error: "Không tìm thấy đợt làm áo" },
        { status: 404 }
      );
    }

    const data: Prisma.KitOrderUpdateInput = {};
    if ("name" in body) {
      const name = typeof body.name === "string" ? body.name.trim() : "";
      if (!name) {
        return NextResponse.json(
          { error: "Tên đợt là bắt buộc" },
          { status: 400 }
        );
      }
      data.name = name;
    }
    if ("description" in body) {
      data.description =
        typeof body.description === "string" && body.description.trim()
          ? body.description.trim()
          : null;
    }
    if ("deadline" in body) {
      data.deadline = body.deadline ? new Date(body.deadline) : null;
    }
    if ("status" in body) {
      if (!STATUSES.includes(body.status)) {
        return NextResponse.json(
          { error: "Trạng thái không hợp lệ" },
          { status: 400 }
        );
      }
      data.status = body.status;
    }
    let defaultPrice = existing.defaultPrice;
    if ("defaultPrice" in body) {
      const price = parseMoney(body.defaultPrice);
      if (price === null) {
        return NextResponse.json(
          { error: "Giá áo không hợp lệ" },
          { status: 400 }
        );
      }
      defaultPrice = data.defaultPrice = price;
    }
    let printOnlyPrice = existing.printOnlyPrice;
    if ("printOnlyPrice" in body) {
      const price = parseMoney(body.printOnlyPrice);
      if (!isBlank(body.printOnlyPrice) && price === null) {
        return NextResponse.json(
          { error: "Giá chỉ in không hợp lệ" },
          { status: 400 }
        );
      }
      printOnlyPrice = data.printOnlyPrice = price;
    }

    // A price change re-prices unpaid rows that still follow the order price;
    // paid rows and organizer-set prices keep what they were.
    const updated = await prisma.$transaction(async (tx) => {
      const order = await tx.kitOrder.update({
        where: { id: kitOrderId },
        data,
      });
      if (
        defaultPrice !== existing.defaultPrice ||
        printOnlyPrice !== existing.printOnlyPrice
      ) {
        for (const printOnly of [false, true]) {
          await tx.kitOrderItem.updateMany({
            where: { kitOrderId, paid: false, priceOverridden: false, printOnly },
            data: { amount: priceFor({ defaultPrice, printOnlyPrice }, printOnly) },
          });
        }
      }
      return order;
    });

    return NextResponse.json(updated);
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
    const { kitOrderId } = await context.params;

    const paidCount = await prisma.kitOrderItem.count({
      where: { kitOrderId, paid: true },
    });
    if (paidCount > 0) {
      return NextResponse.json(
        {
          error: `Đã có ${paidCount} áo được thu tiền, không thể xoá đợt này`,
        },
        { status: 409 }
      );
    }

    await prisma.kitOrder.delete({ where: { id: kitOrderId } });
    return NextResponse.json({ success: true });
  } catch (e: unknown) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Lỗi hệ thống" },
      { status: 500 }
    );
  }
}
