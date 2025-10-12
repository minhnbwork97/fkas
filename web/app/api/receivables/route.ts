import { NextRequest, NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { prisma } from "@/src/lib/prisma";
import { assertAdmin } from "@/src/lib/adminGuard";

export async function GET(req: NextRequest) {
  try {
    const url = new URL(req.url);
    const adminPin = url.searchParams.get("adminPin");
    const matchIdFilter = url.searchParams.get("matchId");
    const playerIdFilter = url.searchParams.get("playerId");

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

    // Build filter for unpaid settlements
    const whereClause: Prisma.SettlementWhereInput = {
      paid: false, // Only unpaid settlements
      playerId: { not: null }, // Only settlements with actual players (not custom)
    };

    if (matchIdFilter) {
      whereClause.matchId = matchIdFilter;
    }
    if (playerIdFilter) {
      whereClause.playerId = playerIdFilter;
    }

    // Get unpaid settlements
    const unpaidSettlements = await prisma.settlement.findMany({
      where: whereClause,
      orderBy: [
        { match: { dateTime: "desc" } }, // Most recent matches first
        { createdAt: "desc" },
      ],
      include: {
        player: {
          select: {
            id: true,
            name: true,
            phone: true,
            balance: true,
          },
        },
        match: {
          select: {
            id: true,
            dateTime: true,
            type: true,
            fieldCost: true,
          },
        },
      },
    });

    // Calculate summary statistics
    const totalUnpaid = unpaidSettlements.reduce((sum, s) => sum + s.amount, 0);
    const uniquePlayersCount = new Set(unpaidSettlements.map((s) => s.playerId))
      .size;
    const uniqueMatchesCount = new Set(unpaidSettlements.map((s) => s.matchId))
      .size;

    // Format response
    const formattedSettlements = unpaidSettlements.map((settlement) => ({
      id: settlement.id,
      amount: settlement.amount,
      paid: settlement.paid,
      createdAt: settlement.createdAt.toISOString(),
      player: settlement.player
        ? {
            id: settlement.player.id,
            name: settlement.player.name,
            phone: settlement.player.phone,
            balance: settlement.player.balance,
          }
        : null,
      match: {
        id: settlement.match.id,
        dateTime: settlement.match.dateTime.toISOString(),
        type: settlement.match.type,
        fieldCost: settlement.match.fieldCost,
      },
    }));

    return NextResponse.json(
      {
        summary: {
          totalUnpaid,
          settlementCount: unpaidSettlements.length,
          uniquePlayersCount,
          uniqueMatchesCount,
        },
        settlements: formattedSettlements,
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
