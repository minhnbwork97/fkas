import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/src/lib/prisma";
import { adminPinError } from "@/src/lib/adminGuard";
import { runDailyReminders } from "@/src/lib/zalo/notify";

const deny = (pin: string | null | undefined) => {
  const err = adminPinError(pin);
  return err ? NextResponse.json({ error: err.error }, { status: err.status }) : null;
};

/** Organizer view of the Zalo bot: accounts, groups, recent turns */
export async function GET(req: NextRequest) {
  const denied = deny(req.nextUrl.searchParams.get("adminPin"));
  if (denied) return denied;

  const [accounts, groups, turns] = await Promise.all([
    prisma.zaloAccount.findMany({
      orderBy: [{ isAdmin: "desc" }, { linkedAt: "desc" }],
      include: { player: { select: { id: true, name: true } } },
    }),
    prisma.zaloGroup.findMany({ orderBy: { lastSeenAt: "desc" } }),
    prisma.zaloTurn.findMany({ orderBy: { createdAt: "desc" }, take: 40 }),
  ]);
  const names = new Map(accounts.map((a) => [a.zaloUserId, a.player?.name ?? a.displayName]));
  return NextResponse.json({
    configured: {
      bot: Boolean(process.env.ZALO_BOT_TOKEN),
      openai: Boolean(process.env.OPENAI_API_KEY),
      jev: Boolean(process.env.TYPESAFE_AI_API_KEY),
      cron: Boolean(process.env.CRON_SECRET),
    },
    accounts,
    groups,
    turns: turns.map((t) => ({ ...t, who: names.get(t.zaloUserId) ?? t.zaloUserId })),
  });
}

/** { adminPin, action, ... }: setAdmin | unlink | setGroupNotify | runReminders */
export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => ({}));
  const denied = deny(body?.adminPin);
  if (denied) return denied;

  switch (body.action) {
    case "setAdmin":
      await prisma.zaloAccount.update({
        where: { zaloUserId: String(body.zaloUserId) },
        data: { isAdmin: Boolean(body.isAdmin) },
      });
      return NextResponse.json({ ok: true });
    case "unlink":
      await prisma.zaloAccount.update({
        where: { zaloUserId: String(body.zaloUserId) },
        data: { playerId: null, linkedAt: null, isAdmin: false },
      });
      return NextResponse.json({ ok: true });
    case "setGroupNotify":
      await prisma.zaloGroup.update({
        where: { chatId: String(body.chatId) },
        data: { notify: Boolean(body.notify) },
      });
      return NextResponse.json({ ok: true });
    case "runReminders":
      return NextResponse.json(await runDailyReminders());
    default:
      return NextResponse.json({ error: "Unknown action" }, { status: 400 });
  }
}
