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

  const [accounts, groups, turns, players, lastMessages] = await Promise.all([
    prisma.zaloAccount.findMany({
      orderBy: [{ isAdmin: "desc" }, { linkedAt: "desc" }, { updatedAt: "desc" }],
      include: { player: { select: { id: true, name: true } } },
    }),
    prisma.zaloGroup.findMany({ orderBy: { lastSeenAt: "desc" } }),
    prisma.zaloTurn.findMany({ orderBy: { createdAt: "desc" }, take: 40 }),
    prisma.player.findMany({
      orderBy: { name: "asc" },
      select: { id: true, name: true, phone: true, zaloAccount: { select: { zaloUserId: true } } },
    }),
    // Latest message per account, to help recognise who an unlinked one is
    prisma.zaloTurn.findMany({
      orderBy: { createdAt: "desc" },
      distinct: ["zaloUserId"],
      select: { zaloUserId: true, text: true, chatType: true, createdAt: true },
    }),
  ]);
  const lastByUser = new Map(lastMessages.map((m) => [m.zaloUserId, m]));
  const names = new Map(accounts.map((a) => [a.zaloUserId, a.player?.name ?? a.displayName]));
  return NextResponse.json({
    configured: {
      bot: Boolean(process.env.ZALO_BOT_TOKEN),
      openai: Boolean(process.env.OPENAI_API_KEY),
      jev: Boolean(process.env.TYPESAFE_AI_API_KEY),
      cron: Boolean(process.env.CRON_SECRET),
    },
    accounts: accounts.map((a) => ({ ...a, lastMessage: lastByUser.get(a.zaloUserId) ?? null })),
    players: players.map(({ zaloAccount, ...p }) => ({ ...p, linked: Boolean(zaloAccount) })),
    groups,
    turns: turns.map((t) => ({ ...t, who: names.get(t.zaloUserId) ?? t.zaloUserId })),
  });
}

/** { adminPin, action, ... }: link | setAdmin | unlink | setGroupNotify | runReminders */
export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => ({}));
  const denied = deny(body?.adminPin);
  if (denied) return denied;

  switch (body.action) {
    case "link": {
      // Organizer maps someone who messaged the bot to a team member
      const zaloUserId = String(body.zaloUserId);
      const playerId = String(body.playerId);
      const taken = await prisma.zaloAccount.findUnique({ where: { playerId } });
      if (taken && taken.zaloUserId !== zaloUserId) {
        return NextResponse.json(
          { error: `Cầu thủ này đang liên kết với Zalo "${taken.displayName}", huỷ liên kết đó trước` },
          { status: 409 }
        );
      }
      const player = await prisma.player.findUnique({ where: { id: playerId }, select: { id: true } });
      if (!player) return NextResponse.json({ error: "Không tìm thấy cầu thủ" }, { status: 404 });
      await prisma.zaloAccount.update({
        where: { zaloUserId },
        data: { playerId, linkedAt: new Date() },
      });
      return NextResponse.json({ ok: true });
    }
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
