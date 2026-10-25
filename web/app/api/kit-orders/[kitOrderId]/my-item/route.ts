import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/src/lib/prisma";
import {
  isRegistrationOpen,
  parseKitItemFields,
  priceFor,
} from "@/src/lib/kit-order";
import { resolvePlayer } from "@/src/lib/player-identity";

type Ctx = { params: Promise<{ kitOrderId: string }> };

/**
 * Resolve the caller and the order, and check the player may still change
 * their registration (until the deadline, paid or not).
 * Each player has at most one shirt per order.
 */
async function loadContext(
  kitOrderId: string,
  identity: { deviceId?: string | null; phone?: string | null }
) {
  const player = await resolvePlayer(identity);
  if (!player) {
    return { error: "Không xác định được cầu thủ", status: 404 } as const;
  }
  const order = await prisma.kitOrder.findUnique({ where: { id: kitOrderId } });
  if (!order) {
    return { error: "Không tìm thấy đợt làm áo", status: 404 } as const;
  }
  if (!isRegistrationOpen(order)) {
    return { error: "Đợt làm áo đã đóng đăng ký", status: 409 } as const;
  }
  const existing = await prisma.kitOrderItem.findUnique({
    where: { kitOrderId_playerId: { kitOrderId, playerId: player.id } },
  });
  return { player, order, existing } as const;
}

/** Create or update the caller's shirt */
export async function PUT(req: NextRequest, context: Ctx) {
  try {
    const body = await req.json();
    const { kitOrderId } = await context.params;

    const ctx = await loadContext(kitOrderId, body);
    if ("error" in ctx) {
      return NextResponse.json({ error: ctx.error }, { status: ctx.status });
    }
    const { player, order, existing } = ctx;

    const parsed = parseKitItemFields(body);
    if ("error" in parsed) {
      return NextResponse.json({ error: parsed.error }, { status: 400 });
    }
    if (parsed.fields.printOnly && order.printOnlyPrice === null) {
      return NextResponse.json(
        { error: "Đợt này không nhận chỉ in" },
        { status: 400 }
      );
    }

    // Paid: size, name and number can change, but not the type, which
    // would change the price of money already collected
    if (existing?.paid && parsed.fields.printOnly !== existing.printOnly) {
      return NextResponse.json(
        { error: "Đã đóng tiền nên không đổi loại áo được, liên hệ BTC" },
        { status: 409 }
      );
    }

    // Keep a paid amount and a price the organizer set by hand
    const amount =
      existing && (existing.paid || existing.priceOverridden)
        ? existing.amount
        : priceFor(order, parsed.fields.printOnly);

    const item = await prisma.kitOrderItem.upsert({
      where: { kitOrderId_playerId: { kitOrderId, playerId: player.id } },
      create: { kitOrderId, playerId: player.id, ...parsed.fields, amount },
      update: { ...parsed.fields, amount },
    });
    return NextResponse.json(item, { status: existing ? 200 : 201 });
  } catch (e: unknown) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Lỗi hệ thống" },
      { status: 500 }
    );
  }
}

/** Cancel the caller's registration */
export async function DELETE(req: NextRequest, context: Ctx) {
  try {
    const { kitOrderId } = await context.params;
    const ctx = await loadContext(kitOrderId, {
      deviceId: req.nextUrl.searchParams.get("deviceId"),
      phone: req.nextUrl.searchParams.get("phone"),
    });
    if ("error" in ctx) {
      return NextResponse.json({ error: ctx.error }, { status: ctx.status });
    }
    if (!ctx.existing) {
      return NextResponse.json({ error: "Bạn chưa đăng ký áo" }, { status: 404 });
    }
    if (ctx.existing.paid) {
      return NextResponse.json(
        { error: "Đã đóng tiền, liên hệ BTC để huỷ và hoàn tiền" },
        { status: 409 }
      );
    }

    await prisma.kitOrderItem.delete({ where: { id: ctx.existing.id } });
    return NextResponse.json({ success: true });
  } catch (e: unknown) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Lỗi hệ thống" },
      { status: 500 }
    );
  }
}
