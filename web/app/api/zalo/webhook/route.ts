import { after, NextRequest, NextResponse } from "next/server";
import { timingSafeEqual } from "node:crypto";
import { handleUpdate } from "@/src/lib/zalo/handler";
import type { ZaloUpdate } from "@/src/lib/zalo/api";

function validSecret(received: string | null): boolean {
  const expected = process.env.ZALO_WEBHOOK_SECRET;
  if (!expected || !received) return false;
  const a = Buffer.from(received);
  const b = Buffer.from(expected);
  return a.length === b.length && timingSafeEqual(a, b);
}

/**
 * Zalo Bot webhook. Answers right away and handles the message after the
 * response, so a slow model call never makes Zalo retry.
 */
export async function POST(req: NextRequest) {
  if (!validSecret(req.headers.get("x-bot-api-secret-token"))) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const body = await req.json().catch(() => null);
  // Same shape as getUpdates' result; tolerate it being wrapped
  const update: ZaloUpdate | undefined = body?.result ?? body;
  if (update?.message) {
    after(() =>
      handleUpdate(update).catch((e) => console.error("[zalo] handleUpdate", e))
    );
  }
  return NextResponse.json({ ok: true });
}
