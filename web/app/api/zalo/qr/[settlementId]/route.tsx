import { ImageResponse } from "next/og";
import type { NextRequest } from "next/server";
import { prisma } from "@/src/lib/prisma";
import {
  formatMatchPaymentDescription,
  generatePaymentQR,
  getBankInfo,
} from "@/src/lib/qr-payment";

/**
 * PNG of the VietQR for one settlement, for sending through Zalo (which
 * rejects SVG). The QR itself comes from VietQR exactly as on the payment
 * page; we only rasterise it. The settlement id is an unguessable UUID.
 */
export async function GET(
  _req: NextRequest,
  context: { params: Promise<{ settlementId: string }> }
) {
  const { settlementId } = await context.params;
  const settlement = await prisma.settlement.findUnique({
    where: { id: settlementId },
    include: {
      player: { select: { name: true } },
      match: { select: { id: true, dateTime: true } },
    },
  });
  const bankInfo = getBankInfo();
  if (!settlement || settlement.paid || !bankInfo) {
    return new Response("Not found", { status: 404 });
  }

  const url = await generatePaymentQR({
    bankInfo,
    amount: settlement.amount,
    description: formatMatchPaymentDescription(
      new Date(settlement.match.dateTime),
      settlement.match.id,
      settlement.player?.name
    ),
  });
  // Plain QR (no logos) as SVG, which VietQR serves anyway
  const svgUrl = url?.replace("-compact2.png", "-qr_only.svg");
  const svg = svgUrl ? await fetch(svgUrl).then((r) => (r.ok ? r.text() : null)) : null;
  if (!svg) return new Response("QR unavailable", { status: 502 });

  const size = 640;
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "white",
        }}
      >
        {/* eslint-disable-next-line @next/next/no-img-element, jsx-a11y/alt-text */}
        <img
          src={`data:image/svg+xml;base64,${Buffer.from(svg).toString("base64")}`}
          width={size - 40}
          height={size - 40}
        />
      </div>
    ),
    { width: size, height: size, headers: { "Cache-Control": "private, max-age=300" } }
  );
}
