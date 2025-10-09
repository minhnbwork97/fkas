import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/src/lib/prisma";
import { assertAdmin } from "@/src/lib/adminGuard";

export async function POST(
  req: NextRequest,
  context: { params: Promise<{ matchId: string }> }
) {
  try {
    const { matchId } = await context.params;
    const body = await req.json();
    const { adminPin } = body;

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

    // Get match to verify it exists and current status
    const match = await prisma.match.findUnique({
      where: { id: matchId },
      select: { id: true, status: true, dateTime: true },
    });

    if (!match) {
      return NextResponse.json(
        { error: "Không tìm thấy trận đấu" },
        { status: 404 }
      );
    }

    if (match.status === "Settled") {
      return NextResponse.json(
        { error: "Trận đấu đã được xác nhận thanh toán rồi" },
        { status: 400 }
      );
    }

    // Check if there are any settlements for this match
    const settlementsCount = await prisma.settlement.count({
      where: { matchId },
    });

    if (settlementsCount === 0) {
      return NextResponse.json(
        {
          error:
            "Chưa có tính toán thanh toán nào. Vui lòng tính toán trước khi xác nhận.",
        },
        { status: 400 }
      );
    }

    // Update match status to settled
    await prisma.match.update({
      where: { id: matchId },
      data: { status: "Settled" },
    });

    return NextResponse.json(
      {
        success: true,
        message: "Đã xác nhận thanh toán trận đấu thành công",
        matchId,
        status: "Settled",
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
