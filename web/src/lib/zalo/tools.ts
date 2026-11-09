import { tool, type ToolSet } from "ai";
import type { Prisma } from "@prisma/client";
import { z } from "zod";
import { prisma } from "@/src/lib/prisma";
import { attendanceDeadline, upsertAttendance } from "@/src/lib/attendance";
import { setSettlementPaid } from "@/src/lib/settlement-payment";
import { proposeAction } from "./confirm";
import { sendPhoto } from "./api";
import { notifyMatchCreated, sendPaymentRequest, siteUrl } from "./notify";
import {
  allUnpaid,
  describeMatch,
  findUpcomingMatch,
  formatMatchTime,
  matchSettlements,
  playerDebts,
  playerFund,
  recentMatches,
  vnDateKey,
} from "./queries";

/**
 * Tools the model may use for one message. The caller's identity, chat and
 * admin flag are bound here, so a tool can never act for someone else.
 * Ids passed between tools come from earlier tool results; each write
 * re-checks them. Risky writes only *propose* (see confirm.ts).
 */
export type ToolContext = {
  zaloUserId: string;
  chatId: string;
  isGroup: boolean;
  isAdmin: boolean;
  player: { id: string; name: string };
  /** Evaluation runs: writes report what they would do instead */
  dryRun?: boolean;
};

const vnd = (n: number) => `${n.toLocaleString("vi-VN")}đ`;
const PRIVATE_ONLY = {
  error: "Thông tin tiền nong chỉ xem trong chat riêng với bot, hãy nhắn riêng cho bot.",
};

const matchIdInput = z
  .string()
  .optional()
  .describe("matchId lấy từ list_matches/get_match; bỏ trống = trận sắp tới");

async function resolveMatch(matchId?: string) {
  return matchId
    ? prisma.match.findUnique({ where: { id: matchId } })
    : findUpcomingMatch();
}

/**
 * The caller's unpaid settlement to act on: the given one, or the only one.
 * With several and none given, returns the choices to ask about.
 */
async function pickMyDebt(playerId: string, settlementId?: string) {
  const unpaid = await prisma.settlement.findMany({
    where: { playerId, paid: false, ...(settlementId && { id: settlementId }) },
    include: { match: { select: { id: true, dateTime: true } } },
    orderBy: { match: { dateTime: "asc" } },
  });
  const [only] = unpaid;
  if (unpaid.length === 1 && only) return { debt: only };
  if (unpaid.length === 0) {
    return { error: settlementId ? "Không tìm thấy khoản nợ này của bạn" : "Bạn không còn khoản nợ nào" };
  }
  return {
    choose: unpaid.map((s) => ({
      settlementId: s.id,
      match: formatMatchTime(s.match.dateTime),
      amount: s.amount,
    })),
    instruction: "Có nhiều khoản nợ: hỏi người dùng khoản nào rồi gọi lại với settlementId.",
  };
}

export function buildTools(ctx: ToolContext): ToolSet {
  const propose = async (kind: string, payload: Prisma.InputJsonObject, summary: string) => {
    // Dry runs answer exactly like real ones, so evaluations see the same flow
    if (!ctx.dryRun) {
      await proposeAction({ zaloUserId: ctx.zaloUserId, chatId: ctx.chatId, kind, payload, summary });
    }
    return {
      needsConfirmation: true,
      summary,
      instruction: `Chưa có gì được thực hiện. Hỏi lại dạng: "${summary}, đúng không? Bạn trả lời đồng ý hoặc huỷ nhé." Không dùng các từ "đã ghi nhận", "đã ghi".`,
    };
  };

  const playerTools: ToolSet = {
    list_matches: tool({
      description:
        "Các trận gần đây (mới nhất trước) kèm matchId, dùng khi người dùng nói tới một trận theo ngày hoặc 'trận trước', 'tuần sau'.",
      inputSchema: z.object({}),
      execute: () => recentMatches(),
    }),

    get_match: tool({
      description:
        "Chi tiết một trận: giờ đá, ai đi/chưa chắc/không đi, tổng số người, trạng thái điểm danh của người hỏi, link điểm danh.",
      inputSchema: z.object({ matchId: matchIdInput }),
      execute: async ({ matchId }) => {
        const match = await resolveMatch(matchId);
        if (!match) return { error: "Không tìm thấy trận" };
        const info = await describeMatch(match, ctx.player.id);
        return { ...info, link: `${siteUrl()}${info.link}` };
      },
    }),

    set_my_attendance: tool({
      description:
        "Điểm danh cho chính người hỏi. Ghi đè lần điểm danh trước của họ cho trận đó.",
      inputSchema: z.object({
        matchId: matchIdInput,
        status: z
          .enum(["Attending", "Tentative", "NotGoing"])
          .describe("Attending = đi, Tentative = chưa chắc, NotGoing = không đi"),
        guestCount: z
          .number()
          .int()
          .min(0)
          .max(10)
          .default(0)
          .describe("Số bạn đi cùng, chỉ khi người hỏi cũng đi (Attending)"),
        isLate: z.boolean().default(false).describe("Đi nhưng đến muộn"),
        note: z
          .string()
          .max(200)
          .optional()
          .describe("Ghi chú cho BTC, VD 'có 1 bạn đi thay' khi người hỏi không đi"),
      }),
      execute: async ({ matchId, status, guestCount, isLate, note }) => {
        // The team only counts friends who come along with a member
        if (status !== "Attending" && guestCount > 0) {
          return {
            error:
              "Chỉ tính bạn đi cùng khi người hỏi cũng đi. Nếu người hỏi không đi mà có bạn đi thay, gọi lại với guestCount 0 và ghi vào note.",
          };
        }
        const match = await resolveMatch(matchId);
        if (!match) return { error: "Không tìm thấy trận" };
        if (match.status === "Settled") return { error: "Trận này đã chốt tiền, không điểm danh được nữa" };
        if (new Date() >= match.dateTime) return { error: "Trận đã bắt đầu, không điểm danh được nữa" };

        const pastDeadline = new Date() > attendanceDeadline(match.dateTime);
        const record = { match: formatMatchTime(match.dateTime), status, guestCount, isLate, note };
        // Dry runs answer exactly like real ones, so evaluations see the same flow
        if (!ctx.dryRun) await upsertAttendance({
          matchId: match.id,
          playerId: ctx.player.id,
          status,
          guestCount,
          isLate: status === "Attending" && isLate,
          note,
        });
        return {
          saved: record,
          pastDeadline,
          deadline: formatMatchTime(attendanceDeadline(match.dateTime)),
          note: pastDeadline ? "Đã qua hạn điểm danh nên BTC sẽ thấy đây là điểm danh muộn." : undefined,
        };
      },
    }),

    get_my_debts: tool({
      description: "Các trận người hỏi chưa đóng tiền sân (kèm settlementId) và tổng tiền còn nợ.",
      inputSchema: z.object({}),
      execute: async () => {
        if (ctx.isGroup) return PRIVATE_ONLY;
        const debts = await playerDebts(ctx.player.id);
        return {
          ...debts,
          matches: debts.matches.map((m) => ({ ...m, payLink: `${siteUrl()}${m.payLink}` })),
        };
      },
    }),

    get_my_fund: tool({
      description: "Số dư quỹ cá nhân của người hỏi (có thể âm) và vài giao dịch gần nhất.",
      inputSchema: z.object({}),
      execute: async () => (ctx.isGroup ? PRIVATE_ONLY : playerFund(ctx.player.id)),
    }),

    send_my_payment_qr: tool({
      description:
        "Gửi ảnh mã QR chuyển khoản tiền sân của người hỏi vào chat riêng. Bỏ trống settlementId nếu chỉ có một khoản.",
      inputSchema: z.object({ settlementId: z.string().optional() }),
      execute: async ({ settlementId }) => {
        if (ctx.isGroup) return PRIVATE_ONLY;
        const picked = await pickMyDebt(ctx.player.id, settlementId);
        const s = picked.debt;
        if (!s) return picked;
        if (ctx.dryRun) return { dryRun: true, sent: true, amount: s.amount };
        try {
          await sendPhoto(ctx.chatId, `${siteUrl()}/api/zalo/qr/${s.id}`, `Chuyển khoản ${vnd(s.amount)}`);
          return { sent: true, amount: s.amount, match: formatMatchTime(s.match.dateTime) };
        } catch {
          return { sent: false, payLink: `${siteUrl()}/m/${s.matchId}/payment` };
        }
      },
    }),

    report_my_payment: tool({
      description:
        "Người hỏi báo đã chuyển khoản tiền sân. Gọi ngay khi họ nói đã chuyển/đã đóng; bỏ trống settlementId nếu chỉ có một khoản. Chỉ tạo đề xuất, người dùng phải xác nhận mới được ghi nhận.",
      inputSchema: z.object({ settlementId: z.string().optional() }),
      execute: async ({ settlementId }) => {
        if (ctx.isGroup) return PRIVATE_ONLY;
        const picked = await pickMyDebt(ctx.player.id, settlementId);
        const s = picked.debt;
        if (!s) return picked;
        return propose(
          "self_paid",
          { settlementId: s.id },
          `Bạn đã chuyển ${vnd(s.amount)} tiền sân trận ${formatMatchTime(s.match.dateTime)}`
        );
      },
    }),
  };

  if (!ctx.isAdmin) return playerTools;

  const adminTools: ToolSet = {
    list_unpaid: tool({
      description:
        "(Admin) Ai chưa đóng tiền: một trận cụ thể (kèm settlementId từng người) hoặc tất cả các trận.",
      inputSchema: z.object({ matchId: z.string().optional() }),
      execute: async ({ matchId }) =>
        matchId ? (await matchSettlements(matchId)) ?? { error: "Không tìm thấy trận" } : allUnpaid(),
    }),

    mark_paid: tool({
      description:
        "(Admin) Đánh dấu một người đã đóng hoặc chưa đóng tiền một trận. Chỉ đề xuất, cần admin xác nhận.",
      inputSchema: z.object({
        settlementId: z.string().describe("Lấy từ list_unpaid với matchId"),
        paid: z.boolean().default(true),
      }),
      execute: async ({ settlementId, paid }) => {
        const s = await prisma.settlement.findUnique({
          where: { id: settlementId },
          include: {
            player: { select: { name: true } },
            custom: { select: { name: true } },
            match: { select: { dateTime: true } },
          },
        });
        if (!s) return { error: "Không tìm thấy khoản này" };
        if (s.paid === paid) return { error: paid ? "Người này đã đóng rồi" : "Người này đang là chưa đóng" };
        const who = s.player?.name ?? s.custom?.name ?? "?";
        return propose(
          "set_paid",
          { settlementId, paid },
          `Đánh dấu ${who} ${paid ? "ĐÃ ĐÓNG" : "CHƯA ĐÓNG"} ${vnd(s.amount)} trận ${formatMatchTime(s.match.dateTime)}`
        );
      },
    }),

    remind_unpaid: tool({
      description:
        "(Admin) Nhắn riêng nhắc tất cả người chưa đóng tiền của một trận (chỉ ai đã liên kết Zalo). Cần xác nhận.",
      inputSchema: z.object({ matchId: z.string() }),
      execute: async ({ matchId }) => {
        const info = await matchSettlements(matchId);
        if (!info) return { error: "Không tìm thấy trận" };
        const targets = info.settlements.filter((s) => !s.paid && s.onZalo);
        if (targets.length === 0) return { error: "Không có ai chưa đóng mà đã liên kết Zalo" };
        return propose(
          "remind_unpaid",
          { matchId },
          `Nhắn nhắc ${targets.length} người chưa đóng tiền trận ${info.match}: ${targets.map((t) => t.name).join(", ")}`
        );
      },
    }),

    announce_match: tool({
      description: "(Admin) Đăng thông báo một trận (giờ, link điểm danh) vào các nhóm nhận thông báo.",
      inputSchema: z.object({ matchId: matchIdInput }),
      execute: async ({ matchId }) => {
        const match = await resolveMatch(matchId);
        if (!match) return { error: "Không tìm thấy trận" };
        if (ctx.dryRun) return { dryRun: true, wouldAnnounce: match.id };
        const sent = await notifyMatchCreated(match.id);
        return sent > 0 ? { sentToGroups: sent } : { sentToGroups: 0, note: "Đã thông báo trước đó hoặc chưa có nhóm nhận thông báo" };
      },
    }),

    set_group_notify: tool({
      description:
        "(Admin, chỉ trong nhóm) Bật/tắt nhận thông báo trận mới và nhắc điểm danh cho nhóm hiện tại.",
      inputSchema: z.object({ enabled: z.boolean() }),
      execute: async ({ enabled }) => {
        if (!ctx.isGroup) return { error: "Lệnh này phải dùng trong nhóm" };
        if (ctx.dryRun) return { dryRun: true, wouldSetNotify: enabled };
        await prisma.zaloGroup.upsert({
          where: { chatId: ctx.chatId },
          create: { chatId: ctx.chatId, notify: enabled },
          update: { notify: enabled },
        });
        return { notify: enabled };
      },
    }),
  };

  return { ...playerTools, ...adminTools };
}

/**
 * Carry out a pending action the user has just confirmed. Re-checks
 * everything, since data may have changed while it was waiting.
 */
export async function executePending(
  pending: { kind: string; payload: unknown },
  ctx: Pick<ToolContext, "isAdmin" | "player">
): Promise<string> {
  const payload = pending.payload as Record<string, unknown>;

  if (pending.kind === "self_paid" || pending.kind === "set_paid") {
    const paid = pending.kind === "self_paid" ? true : Boolean(payload.paid);
    if (pending.kind === "set_paid" && !ctx.isAdmin) return "Bạn không có quyền làm việc này.";
    const s = await prisma.settlement.findUnique({ where: { id: String(payload.settlementId) } });
    if (!s) return "Không tìm thấy khoản này nữa.";
    if (pending.kind === "self_paid" && s.playerId !== ctx.player.id) return "Khoản này không phải của bạn.";
    if (s.paid === paid) return paid ? "Khoản này đã được ghi nhận là đã đóng rồi." : "Khoản này đang là chưa đóng.";
    const result = await setSettlementPaid(s, s.matchId, paid);
    const who =
      pending.kind === "self_paid" ? "bạn" : result.player?.name ?? result.custom?.name ?? "";
    return [
      `✅ Đã ghi nhận ${who} ${paid ? "đã đóng" : "chưa đóng"} ${vnd(result.amount)}.`,
      result.chargedToFund ? `Số tiền đã được trừ vào quỹ của ${who}.` : "",
    ]
      .filter(Boolean)
      .join("\n");
  }

  if (pending.kind === "remind_unpaid") {
    if (!ctx.isAdmin) return "Bạn không có quyền làm việc này.";
    const info = await matchSettlements(String(payload.matchId));
    if (!info) return "Không tìm thấy trận nữa.";
    // One manual reminder per person per day
    const kind = `manual_reminder_${vnDateKey(new Date())}`;
    let sent = 0;
    for (const s of info.settlements.filter((x) => !x.paid && x.onZalo)) {
      if (await sendPaymentRequest(s.settlementId, kind)) sent++;
    }
    return sent > 0
      ? `✅ Đã nhắn nhắc ${sent} người.`
      : "Không gửi thêm ai (đã nhắc hôm nay rồi hoặc mọi người đã đóng).";
  }

  return "Thao tác này không còn hỗ trợ.";
}
