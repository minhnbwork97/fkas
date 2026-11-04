/**
 * Minimal client for the Zalo Bot Platform (https://bot.zapps.me/docs/).
 * Telegram-like: POST https://bot-api.zapps.me/bot<TOKEN>/<method> with JSON.
 *
 * Observed behaviour (tested Nov 2026):
 * - getUpdates returns one update per call (an object, not an array) and
 *   errors with 408 when nothing arrives before the timeout.
 * - In groups the bot only receives messages that @mention it.
 * - The bot can message a private chat or a group first.
 * - sendPhoto needs a PNG/JPG URL (SVG is rejected).
 */

const MAX_TEXT = 2000;

/** The bot is optional: without a token, notifications are simply skipped */
export const zaloEnabled = () => Boolean(process.env.ZALO_BOT_TOKEN);

export type ZaloUpdate = {
  event_name: string;
  message?: {
    message_id: string;
    date: number;
    message_type: string;
    text?: string;
    chat: { id: string; chat_type: "PRIVATE" | "GROUP" };
    from: { id: string; is_bot: boolean; display_name: string };
  };
};

type ZaloResponse<T> = {
  ok: boolean;
  result?: T;
  description?: string;
  error_code: number;
};

export class ZaloApiError extends Error {
  constructor(
    public method: string,
    public code: number,
    description?: string
  ) {
    super(`Zalo ${method} failed (${code}): ${description ?? "unknown"}`);
  }
}

async function call<T>(method: string, body: object = {}): Promise<T> {
  const token = process.env.ZALO_BOT_TOKEN;
  if (!token) throw new Error("ZALO_BOT_TOKEN is not set");
  const res = await fetch(`https://bot-api.zapps.me/bot${token}/${method}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  const data = (await res.json()) as ZaloResponse<T>;
  if (!data.ok) throw new ZaloApiError(method, data.error_code, data.description);
  return data.result as T;
}

/** Split on line breaks where possible so long replies stay readable */
function chunk(text: string): string[] {
  const parts: string[] = [];
  let rest = text.trim();
  while (rest.length > MAX_TEXT) {
    const cut = rest.lastIndexOf("\n", MAX_TEXT);
    const at = cut > MAX_TEXT / 2 ? cut : MAX_TEXT;
    parts.push(rest.slice(0, at));
    rest = rest.slice(at).trim();
  }
  if (rest) parts.push(rest);
  return parts;
}

export async function sendMessage(chatId: string, text: string) {
  for (const part of chunk(text)) {
    await call("sendMessage", { chat_id: chatId, text: part });
  }
}

/** photoUrl must be a public HTTPS PNG/JPG */
export function sendPhoto(chatId: string, photoUrl: string, caption?: string) {
  return call("sendPhoto", {
    chat_id: chatId,
    photo: photoUrl,
    ...(caption && { caption: caption.slice(0, MAX_TEXT) }),
  });
}

/** Shows "typing…" while the bot works on a reply; failures don't matter */
export function sendTyping(chatId: string) {
  return call("sendChatAction", { chat_id: chatId, action: "typing" }).catch(
    () => {}
  );
}

/** Long polling, for local development only (no webhook may be set) */
export async function getUpdate(timeoutSeconds = 30): Promise<ZaloUpdate | null> {
  try {
    return await call<ZaloUpdate>("getUpdates", { timeout: timeoutSeconds });
  } catch (e) {
    if (e instanceof ZaloApiError && e.code === 408) return null;
    throw e;
  }
}

let botName: Promise<string> | null = null;

/** The bot's display name, as it appears in "@<name>" mentions (cached) */
export function getBotName(): Promise<string> {
  botName ??= call<{ display_name: string }>("getMe").then((me) => me.display_name);
  botName.catch(() => (botName = null));
  return botName;
}
