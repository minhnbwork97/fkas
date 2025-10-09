import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/src/lib/prisma";
import { computeTotals } from "@/src/lib/readiness";

export async function GET(
  _req: NextRequest,
  context: { params: Promise<{ matchId: string }> }
) {
  try {
    const { matchId } = await context.params;
    const match = await prisma.match.findUnique({
      where: { id: matchId },
      select: { id: true, type: true },
    });
    if (!match)
      return NextResponse.json({ error: "Không tìm thấy" }, { status: 404 });
    const intents = await prisma.attendanceIntent.findMany({
      where: { matchId, status: "Attending" },
      select: { guestCount: true },
    });
    const guestCounts = intents.map((i) => i.guestCount ?? 0);
    const totals = computeTotals({
      type: match.type as "Internal" | "VsTeam",
      confirmedPlayers: intents.length,
      guestCounts,
    });
    return NextResponse.json(totals, { status: 200 });
  } catch (e: unknown) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Lỗi hệ thống" },
      { status: 500 }
    );
  }
}
