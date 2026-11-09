import { prisma } from "@/src/lib/prisma";
import { ATTENDANCE_DEADLINE_HOURS } from "@/src/lib/attendance";
import { getBotName, sendMessage, sendTyping, type ZaloUpdate } from "./api";
import { runAgent } from "./llm";
import { classifyConfirmation } from "./decide";
import { clearPendingAction, takePendingAction } from "./confirm";
import { buildTools, executePending, type ToolContext } from "./tools";
import { findPlayerByPhone, formatMatchTime } from "./queries";
import {
  RATE_LIMIT_PER_MINUTE,
  claimTurn,
  finishTurn,
  countRecentTurns,
  recentHistory,
} from "./turns";

// A phone number, to link an account (formats vary: 0901 234 567, +84...)
const PHONE_LIKE = /(?:\+?84|0)[\d\s.-]{8,13}/;

/** Group messages arrive as "@<bot name> text": drop the mention */
async function stripMention(text: string): Promise<string> {
  return text.replace(`@${await getBotName()}`, "").trim();
}

export async function handleUpdate(update: ZaloUpdate): Promise<void> {
  const msg = update.message;
  if (update.event_name !== "message.text.received" || !msg?.text || msg.from.is_bot) return;

  const chatId = msg.chat.id;
  const isGroup = msg.chat.chat_type === "GROUP";
  const text = isGroup ? await stripMention(msg.text) : msg.text.trim();

  // Each Zalo message is handled once, even if delivered twice
  const claimed = await claimTurn({
    messageId: msg.message_id,
    zaloUserId: msg.from.id,
    chatId,
    chatType: msg.chat.chat_type,
    text,
  });
  if (!claimed) return;

  const started = Date.now();
  const reply = async (out: string, extra: Omit<Parameters<typeof finishTurn>[1], "durationMs"> = {}) => {
    await sendMessage(chatId, out);
    await finishTurn(msg.message_id, { ...extra, reply: out, durationMs: Date.now() - started });
  };

  try {
    if (isGroup) {
      await prisma.zaloGroup.upsert({
        where: { chatId },
        create: { chatId },
        update: { lastSeenAt: new Date() },
      });
    }

    const recent = await countRecentTurns(msg.from.id);
    if (recent > RATE_LIMIT_PER_MINUTE) {
      // Say it once, then stay quiet until they slow down
      if (recent === RATE_LIMIT_PER_MINUTE + 1) {
        await reply("Từ từ thôi, nhắn như ra đòn phản công thế này mình đỡ không kịp 😵 Nghỉ 1 phút rồi nhắn tiếp nha.");
      } else {
        await finishTurn(msg.message_id, { durationMs: 0, error: "rate_limited" });
      }
      return;
    }

    const account = await prisma.zaloAccount.upsert({
      where: { zaloUserId: msg.from.id },
      create: { zaloUserId: msg.from.id, displayName: msg.from.display_name },
      update: { displayName: msg.from.display_name },
      include: { player: { select: { id: true, name: true } } },
    });

    if (!account.player) {
      await reply(
        isGroup
          ? `${msg.from.display_name} ơi, mình chưa biết bạn là cầu thủ nào 🧐 Nhắn riêng cho mình số điện thoại đã đăng ký với đội để mình check thẻ cầu thủ nhé.`
          : await linkAccount(msg.from.id, text)
      );
      return;
    }

    const ctx: ToolContext = {
      zaloUserId: msg.from.id,
      chatId,
      isGroup,
      isAdmin: account.isAdmin,
      player: account.player,
    };

    // A reply to "xác nhận không?" is decided here, outside the agent
    const pending = await takePendingAction(msg.from.id, chatId);
    if (pending) {
      const decision = await classifyConfirmation(pending.summary, text);
      if (decision === "confirm") {
        await clearPendingAction(msg.from.id, chatId);
        await reply(await executePending(pending, ctx), {
          steps: [{ confirmed: pending.kind, payload: pending.payload }],
        });
        return;
      }
      if (decision === "cancel") {
        await clearPendingAction(msg.from.id, chatId);
        await reply("Ok huỷ kèo, coi như mình chưa thấy gì 🙈");
        return;
      }
      if (decision === "unsure") {
        await reply(`Câu này mình đọc như xem VAR vẫn chưa ra 🤔 ${pending.summary}: bạn đồng ý hay huỷ?`);
        return;
      }
      // Something else: drop the proposal and handle the message normally
      await clearPendingAction(msg.from.id, chatId);
    }

    await sendTyping(chatId);
    const result = await runAgent({
      system: systemPrompt(ctx),
      history: await recentHistory(msg.from.id, chatId, msg.message_id),
      user: text,
      tools: buildTools(ctx),
    });
    await reply(result.text || "Pha này mình xử lý hỏng rồi 😅 Bạn nói lại kiểu khác giúp mình nhé.", {
      steps: result.steps,
      inputTokens: result.inputTokens,
      outputTokens: result.outputTokens,
      error: result.text ? undefined : "empty_reply",
    });
  } catch (e) {
    console.error("[zalo] handleUpdate", e);
    await sendMessage(chatId, "Mình đang bị chuột rút, vài phút nữa bạn thử lại nhé 🤕").catch(() => {});
    await finishTurn(msg.message_id, {
      durationMs: Date.now() - started,
      error: e instanceof Error ? e.message : String(e),
    });
  }
}

/** Private chat with an unlinked account: ask for, then check, the phone */
async function linkAccount(zaloUserId: string, text: string): Promise<string> {
  const phone = text.match(PHONE_LIKE)?.[0];
  if (!phone) {
    return "Hế lô 👋 Mình là bot của FC Không Giải Tán, chuyên điểm danh, đòi nợ tiền sân và tám chuyện.\nNhắn mình số điện thoại bạn đã đăng ký với đội để mình nhận mặt nha.";
  }
  const player = await findPlayerByPhone(phone);
  if (!player) {
    return "Số này không có trong đội hình 🤨 Bạn kiểm tra lại số, hoặc nhờ BTC đăng ký cho bạn trước nhé.";
  }
  const taken = await prisma.zaloAccount.findUnique({ where: { playerId: player.id } });
  if (taken && taken.zaloUserId !== zaloUserId) {
    return "Số này có người khác nhận rồi 👀 Nếu không phải bạn thì báo BTC kiểm tra giúp nhé.";
  }
  await prisma.zaloAccount.update({
    where: { zaloUserId },
    data: { playerId: player.id, linkedAt: new Date() },
  });
  return `À ${player.name} đây rồi ✅ Từ giờ cứ nhắn thoải mái như nói chuyện với anh em, ví dụ:\n- Tuần này em đi, thêm 1 bạn\n- Tuần này bao nhiêu người đi?\n- Mình còn nợ bao nhiêu?`;
}

/** Exported for the evaluation script, so it tests the real prompt */
export function systemPrompt(ctx: ToolContext): string {
  return [
    "Bạn là bot Zalo của đội bóng phủi FC Không Giải Tán. Tính cách: cợt nhả, lầy, hay trêu như một thằng bạn trong đội, thích chêm chuyện bóng đá (thẻ đỏ, VAR, việt vị, ngồi dự bị, chấn thương giả...) và emoji. Luôn xưng 'mình' và gọi người dùng là 'bạn': 'mình' chỉ bao giờ là bot, nói về người đang hỏi (VD họ đi kèm mấy bạn) thì dùng 'bạn'.",
    "Đổi kiểu đùa liên tục, đừng lặp lại cùng một hình ảnh (VD không câu nào cũng nhắc VAR); xem lịch sử hội thoại để tránh trùng. Không phải câu trả lời nào cũng cần đùa.",
    "Đùa ở giọng văn, không đùa ở dữ liệu: ngày giờ, số tiền, ai đi ai không, đã ghi gì phải đúng và rõ ràng. Mỗi câu trả lời chỉ một hai câu đùa, ngắn gọn, đừng để trò đùa che mất thông tin.",
    "Trêu nhẹ nhàng thân thiện: không thô tục, không xúc phạm ngoại hình hay cá nhân, không chế giễu ai vì nợ tiền trước mặt người khác. Khi hỏi xác nhận thao tác về tiền thì hỏi nghiêm túc, rõ ràng.",
    "QUAN TRỌNG: chỉ nói đã ghi/đã làm/đã ghi nhận khi một công cụ trong lượt này trả về thành công. Nếu chưa gọi công cụ hoặc công cụ báo lỗi thì không được nói là đã làm.",
    `Người đang nhắn: ${ctx.player.name}${ctx.isAdmin ? " (BTC/admin)" : ""}. Bây giờ là ${formatMatchTime(new Date())} giờ Việt Nam.`,
    ctx.isGroup
      ? "Đang trong nhóm chat: không nêu thông tin tiền nong cá nhân, nếu được hỏi thì bảo nhắn riêng cho bot."
      : "Đang chat riêng.",
    "Chỉ trả lời và hành động qua công cụ; không bịa số liệu. Không biết thì nói không biết.",
    "'Tuần này', 'trận tới', 'hôm nay' = trận sắp tới: gọi công cụ không kèm matchId. Chỉ dùng list_matches khi người dùng nêu ngày cụ thể hoặc 'trận trước', 'tuần sau'.",
    `Hạn điểm danh là ${ATTENDANCE_DEADLINE_HOURS} tiếng trước giờ đá; sau hạn vẫn ghi nhận nhưng bị tính là điểm danh muộn.`,
    "Điểm danh xong thì nhắc lại ngắn gọn đã ghi gì (trận nào, đi/không, mấy bạn đi cùng).",
    "Công cụ trả về needsConfirmation nghĩa là CHƯA làm gì: nhắc lại nội dung và hỏi người dùng có đồng ý không. Đừng nói là đã xong.",
    "Không đoán người: nếu tên khớp nhiều người thì liệt kê và hỏi lại.",
    "Thiếu thông tin thì tự tra bằng công cụ trước khi hỏi lại (VD muốn QR/báo đã chuyển: gọi get_my_debts; chỉ có một khoản thì dùng luôn khoản đó).",
    "Không nhắc tên trường kỹ thuật, id hay JSON trong câu trả lời.",
    "Zalo không hiển thị markdown: không dùng **, #, bảng. Dùng xuống dòng và gạch đầu dòng '-'.",
    "Tiền viết dạng 45.000đ. Danh sách dài thì nêu số lượng và vài tên, trừ khi được hỏi cụ thể.",
  ].join("\n");
}
