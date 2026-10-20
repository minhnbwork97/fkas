import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/src/lib/prisma";
import { adminPinError } from "@/src/lib/adminGuard";
import {
  isBlank,
  parseMoney,
  summarizeKitOrder,
} from "@/src/lib/kit-order";

export async function GET(req: NextRequest) {
  try {
    const authError = adminPinError(req.nextUrl.searchParams.get("adminPin"));
    if (authError) {
      return NextResponse.json(
        { error: authError.error },
        { status: authError.status }
      );
    }

    const orders = await prisma.kitOrder.findMany({
      orderBy: { createdAt: "desc" },
      include: {
        items: {
          select: {
            size: true,
            sizeNote: true,
            number: true,
            amount: true,
            paid: true,
            selfReportedAt: true,
          },
        },
      },
    });

    return NextResponse.json({
      kitOrders: orders.map(({ items, ...order }) => ({
        ...order,
        summary: summarizeKitOrder(items),
      })),
    });
  } catch (e: unknown) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Lỗi hệ thống" },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const authError = adminPinError(body?.adminPin);
    if (authError) {
      return NextResponse.json(
        { error: authError.error },
        { status: authError.status }
      );
    }

    const name = typeof body.name === "string" ? body.name.trim() : "";
    if (!name) {
      return NextResponse.json(
        { error: "Tên đợt là bắt buộc" },
        { status: 400 }
      );
    }
    const defaultPrice = parseMoney(body.defaultPrice);
    if (defaultPrice === null) {
      return NextResponse.json({ error: "Giá áo không hợp lệ" }, { status: 400 });
    }
    const printOnlyPrice = parseMoney(body.printOnlyPrice);
    if (!isBlank(body.printOnlyPrice) && printOnlyPrice === null) {
      return NextResponse.json(
        { error: "Giá chỉ in không hợp lệ" },
        { status: 400 }
      );
    }

    const order = await prisma.kitOrder.create({
      data: {
        name,
        description:
          typeof body.description === "string" && body.description.trim()
            ? body.description.trim()
            : null,
        defaultPrice,
        printOnlyPrice,
        deadline: body.deadline ? new Date(body.deadline) : null,
      },
    });

    return NextResponse.json(order, { status: 201 });
  } catch (e: unknown) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Lỗi hệ thống" },
      { status: 500 }
    );
  }
}
