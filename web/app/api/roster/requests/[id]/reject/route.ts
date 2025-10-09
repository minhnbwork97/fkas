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

    // Check if request exists
    const reqItem = await prisma.pendingRosterRequest.findUnique({
      where: { id },
    });

    if (!reqItem) {
      return NextResponse.json({ error: "Không tìm thấy" }, { status: 404 });
    }

    // Update status to rejected
    await prisma.pendingRosterRequest.update({
      where: { id },
      data: { status: "Rejected" },
    });

    return NextResponse.json(
      { success: true, message: "Đã từ chối yêu cầu" },
      { status: 200 }
    );
  } catch (e: unknown) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Lỗi hệ thống" },
      { status: 500 }
    );
  }
}
