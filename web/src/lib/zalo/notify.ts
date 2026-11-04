import { Prisma } from "@prisma/client";
import { prisma } from "@/src/lib/prisma";
import { attendanceDeadline } from "@/src/lib/attendance";
import { sendMessage, sendPhoto } from "./api";
import { formatMatchTime, vnDateKey } from "./queries";

/** Public base URL used in links and for Zalo to fetch QR images */
export function siteUrl(): string {
  return (
    process.env.ZALO_PUBLIC_URL ||
    process.env.NEXT_PUBLIC_SITE_URL ||
    "https://fkas.minhnb.com"
  ).replace(/\/$/, "");
}

/** Days after a settlement to remind unpaid players again */
const PAYMENT_REMINDER_DAYS = [1, 3];
const DAY_MS = 24 * 3600 * 1000;
const vnd = (n: number) => `${n.toLocaleString("vi-VN")}đ`;

/**
 * Send at most once per (kind, refId, chatId). The record is written first
 * so concurrent runs can't both send; it is removed if sending fails, so a
 * later run retries.
 */
async function once(
  kind: string,
  refId: string,
  chatId: string,
  send: () => Promise<unknown>
): Promise<boolean> {
  let id: string;
  try {
    ({ id } = await prisma.zaloNotification.create({ data: { kind, refId, chatId } }));
  } catch (e) {
    if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === "P2002") return false;
    throw e;
  }
  try {
    await send();
    return true;
  } catch (e) {
    await prisma.zaloNotification.delete({ where: { id } }).catch(() => {});
    console.error(`[zalo] notify ${kind} ${refId} -> ${chatId}`, e);
    return false;
  }
}

const notifyGroups = () =>
  prisma.zaloGroup.findMany({ where: { notify: true }, select: { chatId: true } });

/** Post a new match to the team groups */
export async function notifyMatchCreated(matchId: string) {
  const match = await prisma.match.findUnique({ where: { id: matchId } });
  if (!match) return 0;
  const text = [
    `⚽ Trận mới: ${formatMatchTime(match.dateTime)}`,
    match.type === "VsTeam" ? "Đấu đội khác" : "Đá nội bộ",
    `Hạn điểm danh: ${formatMatchTime(attendanceDeadline(match.dateTime))}`,
    `Điểm danh: ${siteUrl()}/m/${match.id}`,
    "Hoặc nhắn riêng cho bot, VD: \"tuần này em đi\"",
  ].join("\n");
  let sent = 0;
  for (const { chatId } of await notifyGroups()) {
    if (await once("match_created", matchId, chatId, () => sendMessage(chatId, text))) sent++;
  }
  return sent;
}

/**
 * Ask one player to pay one settlement, in a private chat: amount, link and
 * a QR image. Returns false when the player isn't on Zalo, already paid, or
 * was already sent this kind of message.
 */
export async function sendPaymentRequest(settlementId: string, kind: string) {
  const s = await prisma.settlement.findUnique({
    where: { id: settlementId },
    include: {
      match: { select: { id: true, dateTime: true } },
      player: { select: { name: true, zaloAccount: { select: { zaloUserId: true } } } },
    },
  });
  const chatId = s?.player?.zaloAccount?.zaloUserId;
  if (!s || s.paid || !chatId) return false;

  const intro =
    kind === "settlement"
      ? `💰 Trận ${formatMatchTime(s.match.dateTime)} đã chốt tiền.`
      : `⏰ Nhắc nhẹ: bạn chưa đóng tiền trận ${formatMatchTime(s.match.dateTime)}.`;
  const text = [
    intro,
    `${s.player!.name} cần đóng ${vnd(s.amount)}.`,
    `Thanh toán: ${siteUrl()}/m/${s.match.id}/payment`,
    "Chuyển xong bạn nhắn \"mình đóng rồi\" để BTC kiểm tra nhé.",
  ].join("\n");

  return once(kind, settlementId, chatId, async () => {
    await sendMessage(chatId, text);
    // The QR is a bonus: Zalo must reach our public URL to fetch it
    await sendPhoto(chatId, `${siteUrl()}/api/zalo/qr/${s.id}`, "Quét mã để chuyển khoản").catch(
      (e) => console.warn("[zalo] QR photo not sent", e instanceof Error ? e.message : e)
    );
  });
}

/** After a match is settled: message every unpaid player who is on Zalo */
export async function notifySettlement(matchId: string) {
  const unpaid = await prisma.settlement.findMany({
    where: { matchId, paid: false, playerId: { not: null } },
    select: { id: true },
  });
  let sent = 0;
  for (const { id } of unpaid) if (await sendPaymentRequest(id, "settlement")) sent++;
  return sent;
}

/**
 * Daily job (Vercel Cron):
 * - match day: post who's coming to the team groups, and nudge linked
 *   players who haven't answered yet, while it's before the deadline;
 * - unpaid settlements: remind on the days in PAYMENT_REMINDER_DAYS.
 */
export async function runDailyReminders(now = new Date()) {
  const result = { groupPosts: 0, attendanceNudges: 0, paymentReminders: 0 };

  const today = vnDateKey(now);
  const start = new Date(`${today}T00:00:00+07:00`);
  const matchesToday = await prisma.match.findMany({
    where: {
      status: { not: "Settled" },
      dateTime: { gte: start, lt: new Date(start.getTime() + DAY_MS) },
    },
    include: { intents: { select: { playerId: true, status: true, guestCount: true } } },
  });

  for (const match of matchesToday) {
    const going = match.intents.filter((i) => i.status === "Attending");
    const guests = going.reduce((sum, i) => sum + i.guestCount, 0);
    const deadline = attendanceDeadline(match.dateTime);
    const beforeDeadline = now < deadline;
    const link = `${siteUrl()}/m/${match.id}`;

    const groupText = [
      `📣 Hôm nay đá: ${formatMatchTime(match.dateTime)}`,
      `Đã có ${going.length + guests} người (${going.length} thành viên${guests ? ` + ${guests} khách` : ""}).`,
      beforeDeadline
        ? `Ai chưa điểm danh thì làm trước ${formatMatchTime(deadline)} nhé: ${link}`
        : `Đã qua hạn điểm danh, ai đi muộn báo trên ${link}`,
    ].join("\n");
    for (const { chatId } of await notifyGroups()) {
      if (await once("match_day", match.id, chatId, () => sendMessage(chatId, groupText))) {
        result.groupPosts++;
      }
    }

    if (!beforeDeadline) continue;
    const answered = new Set(match.intents.map((i) => i.playerId));
    const silent = await prisma.zaloAccount.findMany({
      where: { playerId: { not: null, notIn: [...answered] } },
      select: { zaloUserId: true },
    });
    const nudge = [
      `⚽ Hôm nay đá ${formatMatchTime(match.dateTime)}, bạn chưa điểm danh.`,
      `Nhắn "em đi" / "em nghỉ" cho mình, hoặc vào ${link} trước ${formatMatchTime(deadline)}.`,
    ].join("\n");
    for (const { zaloUserId } of silent) {
      if (await once("attendance_nudge", match.id, zaloUserId, () => sendMessage(zaloUserId, nudge))) {
        result.attendanceNudges++;
      }
    }
  }

  const unpaid = await prisma.settlement.findMany({
    where: {
      paid: false,
      playerId: { not: null },
      match: { status: "Settled" },
      player: { zaloAccount: { isNot: null } },
    },
    select: { id: true, createdAt: true },
  });
  for (const s of unpaid) {
    const days = Math.floor((now.getTime() - s.createdAt.getTime()) / DAY_MS);
    // Only the latest reminder that is due, so a missed day doesn't double up
    const due = PAYMENT_REMINDER_DAYS.filter((d) => days >= d).pop();
    if (due !== undefined && (await sendPaymentRequest(s.id, `payment_reminder_${due}`))) {
      result.paymentReminders++;
    }
  }

  return result;
}
