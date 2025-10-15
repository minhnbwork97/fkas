import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/src/lib/prisma";

export async function GET(req: NextRequest) {
  try {
    const phone = req.nextUrl.searchParams.get("phone");
    if (!phone) {
      return NextResponse.json(
        { error: "Thiếu số điện thoại" },
        { status: 400 }
      );
    }

    const player = await prisma.player.findFirst({
      where: { phone },
      select: { id: true, name: true, phone: true },
    });

    if (!player) {
      return NextResponse.json({ found: false }, { status: 404 });
    }

    return NextResponse.json({ found: true, player }, { status: 200 });
  } catch (e: unknown) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Lỗi hệ thống" },
      { status: 500 }
    );
  }
}
