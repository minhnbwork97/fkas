import { Prisma } from "@prisma/client";
import { prisma } from "@/src/lib/prisma";

/** A user may send this many messages per minute before the bot pauses */
export const RATE_LIMIT_PER_MINUTE = 8;
/** Conversation memory: last turns in the same chat, within this window */
const HISTORY_TURNS = 8;
const HISTORY_WINDOW_MS = 3 * 3600 * 1000;

/**
 * Claim a Zalo message for processing. Returns false when it was already
 * handled (Zalo retried, or the poller and webhook both delivered it).
 */
export async function claimTurn(input: {
  messageId: string;
  zaloUserId: string;
  chatId: string;
  chatType: string;
  text: string;
}): Promise<boolean> {
  try {
    await prisma.zaloTurn.create({ data: input });
    return true;
  } catch (e) {
    if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === "P2002") {
      return false;
    }
    throw e;
  }
}

/** Messages from this user in the last minute, including the current one */
export function countRecentTurns(zaloUserId: string): Promise<number> {
  return prisma.zaloTurn.count({
    where: { zaloUserId, createdAt: { gte: new Date(Date.now() - 60_000) } },
  });
}

/** Earlier exchanges in this chat, oldest first, for the model's context */
export async function recentHistory(
  zaloUserId: string,
  chatId: string,
  excludeMessageId: string
) {
  const turns = await prisma.zaloTurn.findMany({
    where: {
      zaloUserId,
      chatId,
      messageId: { not: excludeMessageId },
      reply: { not: null },
      createdAt: { gte: new Date(Date.now() - HISTORY_WINDOW_MS) },
    },
    orderBy: { createdAt: "desc" },
    take: HISTORY_TURNS,
    select: { text: true, reply: true },
  });
  return turns.reverse().flatMap((t) => [
    { role: "user" as const, content: t.text },
    { role: "assistant" as const, content: t.reply! },
  ]);
}

/** Record how the turn went: reply, tools used, tokens, time, error */
export function finishTurn(
  messageId: string,
  result: {
    reply?: string;
    steps?: unknown;
    inputTokens?: number;
    outputTokens?: number;
    durationMs: number;
    error?: string;
  }
) {
  return prisma.zaloTurn
    .update({
      where: { messageId },
      data: {
        reply: result.reply,
        steps: (result.steps ?? undefined) as Prisma.InputJsonValue | undefined,
        inputTokens: result.inputTokens,
        outputTokens: result.outputTokens,
        durationMs: result.durationMs,
        error: result.error,
      },
    })
    .catch((e) => console.error("[zalo] finishTurn", e));
}
