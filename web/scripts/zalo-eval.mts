// Dry-run evaluation of the Zalo bot: runs sample messages through the
// real model and tools against the local database, with every write
// replaced by a report of what it would do. Nothing is sent to Zalo.
//
//   npm run zalo:eval                       (first linked player)
//   ZALO_EVAL_PHONE=0901234567 npm run zalo:eval

import { prisma } from "@/src/lib/prisma";
import { runAgent } from "@/src/lib/zalo/llm";
import { buildTools, type ToolContext } from "@/src/lib/zalo/tools";
import { classifyConfirmation } from "@/src/lib/zalo/decide";
import { findPlayerByPhone } from "@/src/lib/zalo/queries";
import { systemPrompt } from "@/src/lib/zalo/handler";

type Case = { say: string; expectTool: string; group?: boolean; admin?: boolean };

const CASES: Case[] = [
  { say: "tuần này bao nhiêu người đi?", expectTool: "get_match" },
  { say: "tuần này em đi nhé, mang thêm 2 bạn", expectTool: "set_my_attendance" },
  { say: "tuần này em bận rồi không đá được", expectTool: "set_my_attendance" },
  { say: "mình còn nợ bao nhiêu", expectTool: "get_my_debts" },
  { say: "quỹ của mình còn bao nhiêu", expectTool: "get_my_fund" },
  { say: "gửi mình mã QR để chuyển khoản", expectTool: "send_my_payment_qr" },
  { say: "mình chuyển khoản rồi nhé", expectTool: "report_my_payment" },
  { say: "tuần này ai đi thế", expectTool: "get_match", group: true },
  { say: "mình còn nợ bao nhiêu", expectTool: "get_my_debts", group: true },
  { say: "ai chưa đóng tiền?", expectTool: "list_unpaid", admin: true },
  { say: "trận gần nhất còn ai chưa đóng tiền", expectTool: "list_matches", admin: true },
];

const CONFIRMATIONS: [summary: string, reply: string, expected: string[]][] = [
  ["Đánh dấu An ĐÃ ĐÓNG 45.000đ trận Thứ 7 31/10", "ok", ["confirm"]],
  ["Đánh dấu An ĐÃ ĐÓNG 45.000đ trận Thứ 7 31/10", "ừ đúng rồi làm đi", ["confirm"]],
  ["Đánh dấu An ĐÃ ĐÓNG 45.000đ trận Thứ 7 31/10", "thôi khỏi", ["cancel"]],
  ["Đánh dấu An ĐÃ ĐÓNG 45.000đ trận Thứ 7 31/10", "khoan, nhầm người rồi, là Bình cơ", ["other", "cancel"]],
  ["Ghi nhận bạn đã chuyển 45.000đ tiền sân trận Thứ 7 31/10", "chuẩn", ["confirm"]],
  ["Ghi nhận bạn đã chuyển 45.000đ tiền sân trận Thứ 7 31/10", "tuần này bao nhiêu người đi?", ["other"]],
];

async function pickPlayer() {
  if (process.env.ZALO_EVAL_PHONE) return findPlayerByPhone(process.env.ZALO_EVAL_PHONE);
  const linked = await prisma.zaloAccount.findFirst({
    where: { playerId: { not: null } },
    include: { player: { select: { id: true, name: true } } },
  });
  return linked?.player ?? prisma.player.findFirst({ select: { id: true, name: true } });
}

const player = await pickPlayer();
if (!player) throw new Error("No player found to run as");
console.log(`Running as ${player.name}\n`);

let failures = 0;
for (const c of CASES) {
  const ctx: ToolContext = {
    zaloUserId: "eval",
    chatId: c.group ? "eval-group" : "eval",
    isGroup: Boolean(c.group),
    isAdmin: Boolean(c.admin),
    player,
    dryRun: true,
  };
  const started = Date.now();
  const r = await runAgent({
    system: systemPrompt(ctx),
    history: [],
    user: c.say,
    tools: buildTools(ctx),
  });
  const used = r.steps.flatMap((s) => s.tools.map((t) => t.name));
  const ok = used.includes(c.expectTool);
  if (!ok) failures++;
  console.log(`${ok ? "PASS" : "FAIL"} [${c.group ? "nhóm" : "riêng"}${c.admin ? ",admin" : ""}] "${c.say}"`);
  console.log(`     tools: ${used.join(" → ") || "(none)"}  (${Date.now() - started}ms)`);
  console.log(`     bot:   ${r.text.replace(/\n/g, " / ").slice(0, 160)}`);
}

console.log(`\nConfirmation decisions (${process.env.TYPESAFE_AI_API_KEY ? "Jev" : "OpenAI fallback"}):`);
for (const [summary, reply, expected] of CONFIRMATIONS) {
  const got = await classifyConfirmation(summary, reply);
  const ok = expected.includes(got);
  if (!ok) failures++;
  console.log(`${ok ? "PASS" : "FAIL"} "${reply}" -> ${got} (expected ${expected.join("/")})`);
}

console.log(failures ? `\n${failures} FAILED` : "\nAll passed");
await prisma.$disconnect();
process.exit(failures ? 1 : 0);
