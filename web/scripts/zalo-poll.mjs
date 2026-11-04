// Local development only: long-poll Zalo for updates and forward each one
// to the local webhook, so the same code path runs as in production.
// Requires that no webhook is set on the bot (deleteWebhook).
//
//   npm run dev          (in one terminal)
//   npm run zalo:poll    (in another)

const token = process.env.ZALO_BOT_TOKEN;
const secret = process.env.ZALO_WEBHOOK_SECRET;
const target = process.env.ZALO_POLL_TARGET ?? "http://localhost:3000/api/zalo/webhook";
if (!token || !secret) {
  console.error("ZALO_BOT_TOKEN and ZALO_WEBHOOK_SECRET must be set in .env");
  process.exit(1);
}

console.log(`Polling Zalo, forwarding to ${target} (Ctrl+C to stop)`);
for (;;) {
  try {
    const res = await fetch(`https://bot-api.zapps.me/bot${token}/getUpdates`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ timeout: 30 }),
    });
    const data = await res.json();
    if (!data.ok) {
      if (data.error_code !== 408) console.error("getUpdates:", data.description);
      continue;
    }
    const m = data.result.message;
    console.log(`<- [${m?.chat.chat_type}] ${m?.from.display_name}: ${m?.text ?? data.result.event_name}`);
    const fwd = await fetch(target, {
      method: "POST",
      headers: { "Content-Type": "application/json", "X-Bot-Api-Secret-Token": secret },
      body: JSON.stringify(data.result),
    });
    if (!fwd.ok) console.error(`webhook responded ${fwd.status}`);
  } catch (e) {
    console.error("poll error:", e.message);
    await new Promise((r) => setTimeout(r, 3000));
  }
}
