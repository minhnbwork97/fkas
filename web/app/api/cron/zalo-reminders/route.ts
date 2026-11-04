import { NextRequest, NextResponse } from "next/server";
import { zaloEnabled } from "@/src/lib/zalo/api";
import { runDailyReminders } from "@/src/lib/zalo/notify";

/**
 * Daily Zalo reminders (match-day attendance, unpaid fees). Called by
 * Vercel Cron, which sends "Authorization: Bearer $CRON_SECRET".
 */
export async function GET(req: NextRequest) {
  const secret = process.env.CRON_SECRET;
  if (!secret || req.headers.get("authorization") !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (!zaloEnabled()) return NextResponse.json({ skipped: "ZALO_BOT_TOKEN not set" });
  return NextResponse.json(await runDailyReminders());
}
