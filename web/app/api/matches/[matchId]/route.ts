import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/src/lib/prisma";
import { assertAdmin } from "@/src/lib/adminGuard";

export async function GET(
  _req: NextRequest,
  context: { params: Promise<{ matchId: string }> }
) {
  try {
    const { matchId } = await context.params;
    const match = await prisma.match.findUnique({
      where: { id: matchId },
      select: {
        id: true,
        link: true,
        dateTime: true,
        type: true,
        fieldCost: true,
        status: true,
      },
    });
    if (!match)
      return NextResponse.json({ error: "Không tìm thấy" }, { status: 404 });
    return NextResponse.json(match, { status: 200 });
  } catch (e: unknown) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Lỗi hệ thống" },
      { status: 500 }
    );
  }
}

export async function PATCH(
  req: NextRequest,
  context: { params: Promise<{ matchId: string }> }
) {
  try {
    const { matchId } = await context.params;
    const body = await req.json();
    const { type, fieldCost, dateTime, adminPin } = body ?? {};
    assertAdmin(process.env.ADMIN_PIN, adminPin);

    const match = await prisma.match.findUnique({ where: { id: matchId } });
    if (!match)
      return NextResponse.json({ error: "Không tìm thấy" }, { status: 404 });

    const updates: Record<string, unknown> = {};
    if (typeof fieldCost === "number") updates.fieldCost = fieldCost;
    if (typeof dateTime === "string") {
      updates.dateTime = new Date(dateTime);
    }
    if (typeof type === "string") {
      updates.type = type;
    }
    if (Object.keys(updates).length === 0) {
      return NextResponse.json({ ok: true }, { status: 200 });
    }
    const updated = await prisma.match.update({
      where: { id: matchId },
      data: updates,
    });
    return NextResponse.json({ id: updated.id }, { status: 200 });
  } catch (e: unknown) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Lỗi hệ thống" },
      { status: 500 }
    );
  }
}
