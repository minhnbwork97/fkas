import type { Prisma } from "@prisma/client";
import { prisma } from "@/src/lib/prisma";

/**
 * Two-step writes: a tool only *proposes* a risky change; the user must
 * agree in the same chat within a few minutes. Whether they agreed is
 * decided by classifyConfirmation (decide.ts), outside the agent loop, so
 * the agent itself can never confirm its own proposal.
 */
const TTL_MS = 10 * 60 * 1000;

export async function proposeAction(input: {
  zaloUserId: string;
  chatId: string;
  kind: string;
  payload: Prisma.InputJsonValue;
  summary: string;
}) {
  const data = { ...input, expiresAt: new Date(Date.now() + TTL_MS) };
  await prisma.zaloPendingAction.upsert({
    where: { zaloUserId_chatId: { zaloUserId: input.zaloUserId, chatId: input.chatId } },
    create: data,
    update: data,
  });
}

/** The live pending action for this user in this chat, if any */
export async function takePendingAction(zaloUserId: string, chatId: string) {
  const pending = await prisma.zaloPendingAction.findUnique({
    where: { zaloUserId_chatId: { zaloUserId, chatId } },
  });
  if (!pending) return null;
  if (pending.expiresAt < new Date()) {
    await clearPendingAction(zaloUserId, chatId);
    return null;
  }
  return pending;
}

export function clearPendingAction(zaloUserId: string, chatId: string) {
  return prisma.zaloPendingAction
    .deleteMany({ where: { zaloUserId, chatId } })
    .then(() => undefined);
}
