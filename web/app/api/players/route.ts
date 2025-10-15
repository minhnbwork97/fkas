import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/src/lib/prisma";
import { assertAdmin } from "@/src/lib/adminGuard";

export async function GET(req: NextRequest) {
  try {
    const adminPin = req.nextUrl.searchParams.get("adminPin");
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

    // Get all registered players
    const players = await prisma.player.findMany({
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        name: true,
        phone: true,
        balance: true,
        createdAt: true,
      },
    });

    // Format the response
    const formattedPlayers = players.map((player) => ({
      id: player.id,
      name: player.name,
      phone: player.phone,
      balance: player.balance,
      createdAt: player.createdAt.toISOString(),
    }));

    return NextResponse.json({ players: formattedPlayers }, { status: 200 });
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
    const name = (body?.name ?? "").trim();
    const phone = (body?.phone ?? null) as string | null;

    if (!name) {
      return NextResponse.json({ error: "Tên là bắt buộc" }, { status: 400 });
    }

    const player = await prisma.player.create({
      data: {
        name,
        phone: phone && phone.length > 0 ? phone : null,
        balance: 0,
      },
      select: { id: true, name: true, phone: true },
    });

    return NextResponse.json({ player }, { status: 201 });
  } catch (e: unknown) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Lỗi hệ thống" },
      { status: 500 }
    );
  }
}
