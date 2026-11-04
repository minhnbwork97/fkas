import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/src/lib/prisma";
import { assertAdmin } from "@/src/lib/adminGuard";
import { setSettlementPaid } from "@/src/lib/settlement-payment";

async function handlePayment(
  req: NextRequest,
  context: { params: Promise<{ matchId: string }> }
) {
  try {
    const { matchId } = await context.params;
    const body = await req.json();
    const { adminPin, playerId, customId, paid } = body;

    if (!adminPin) {
      return NextResponse.json(
        { error: "Admin PIN required" },
        { status: 401 }
      );
    }

    // Verify admin PIN
    try {
      assertAdmin(process.env.ADMIN_PIN, adminPin);
    } catch {
      return NextResponse.json({ error: "Invalid admin PIN" }, { status: 403 });
    }

    if ((!playerId && !customId) || typeof paid !== "boolean") {
      return NextResponse.json(
        { error: "playerId/customId and paid status required" },
        { status: 400 }
      );
    }

    // Update payment status (return 404 if not found instead of throwing)
    const existing = await prisma.settlement.findFirst({
      where: {
        matchId: matchId,
        OR: [
          playerId ? { playerId } : undefined,
          customId ? { customId } : undefined,
        ].filter(
          (
            condition
          ): condition is { playerId: string } | { customId: string } =>
            Boolean(condition)
        ),
      },
      include: {
        player: { select: { id: true, name: true } },
        custom: { select: { id: true, name: true } },
      },
    });

    if (!existing) {
      return NextResponse.json(
        { error: "Không tìm thấy bản ghi thanh toán" },
        { status: 404 }
      );
    }

    const result = await setSettlementPaid(existing, matchId, paid);

    return NextResponse.json(
      {
        success: true,
        settlement: {
          playerId: result.playerId ?? result.customId,
          playerName: result.player?.name ?? result.custom?.name ?? "",
          amount: result.amount,
          paid: result.paid,
        },
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

// Export both PATCH and PUT methods
export async function PATCH(
  req: NextRequest,
  context: { params: Promise<{ matchId: string }> }
) {
  return handlePayment(req, context);
}

export async function PUT(
  req: NextRequest,
  context: { params: Promise<{ matchId: string }> }
) {
  return handlePayment(req, context);
}
