import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/src/lib/prisma";
import { adminPinError } from "@/src/lib/adminGuard";

const DEFAULT_PAGE_SIZE = 15;
const MAX_PAGE_SIZE = 50;

/** Bot conversation log for the organizer page, newest first, paginated */
export async function GET(req: NextRequest) {
  const params = req.nextUrl.searchParams;
  const err = adminPinError(params.get("adminPin"));
  if (err) return NextResponse.json({ error: err.error }, { status: err.status });

  const pageSize = Math.min(
    Math.max(1, Number(params.get("pageSize")) || DEFAULT_PAGE_SIZE),
    MAX_PAGE_SIZE
  );
  const total = await prisma.zaloTurn.count();
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const page = Math.min(Math.max(1, Number(params.get("page")) || 1), totalPages);

  const turns = await prisma.zaloTurn.findMany({
    orderBy: { createdAt: "desc" },
    skip: (page - 1) * pageSize,
    take: pageSize,
  });
  const accounts = await prisma.zaloAccount.findMany({
    where: { zaloUserId: { in: [...new Set(turns.map((t) => t.zaloUserId))] } },
    select: { zaloUserId: true, displayName: true, player: { select: { name: true } } },
  });
  const names = new Map(accounts.map((a) => [a.zaloUserId, a.player?.name ?? a.displayName]));

  return NextResponse.json({
    page,
    totalPages,
    total,
    turns: turns.map((t) => ({ ...t, who: names.get(t.zaloUserId) ?? "?" })),
  });
}
