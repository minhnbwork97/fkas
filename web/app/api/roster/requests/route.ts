import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/src/lib/prisma";
import { assertAdmin } from "@/src/lib/adminGuard";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { name, phone, deviceId } = body ?? {};
    if (!name || typeof name !== "string")
      return NextResponse.json({ error: "Tên là bắt buộc" }, { status: 400 });
    const created = await prisma.pendingRosterRequest.create({
      data: {
        name,
        phone: phone ?? null,
        deviceId: deviceId ?? null,
        status: "Pending",
      },
      select: { id: true },
    });
    return NextResponse.json({ id: created.id }, { status: 201 });
  } catch (e: unknown) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Lỗi hệ thống" },
      { status: 500 }
    );
  }
}

export async function GET(req: NextRequest) {
  try {
    const adminPin = req.nextUrl.searchParams.get("adminPin") ?? undefined;
    assertAdmin(process.env.ADMIN_PIN, adminPin);
    const items = await prisma.pendingRosterRequest.findMany({
      where: { status: "Pending" },
      orderBy: { createdAt: "asc" },
      select: { id: true, name: true, phone: true, createdAt: true },
    });
    return NextResponse.json({ items }, { status: 200 });
  } catch (e: unknown) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Lỗi hệ thống" },
      { status: 500 }
    );
  }
}
