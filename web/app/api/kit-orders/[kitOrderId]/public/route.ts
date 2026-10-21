import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/src/lib/prisma";
import {
  formatKitPaymentDescription,
  displayName,
  isRegistrationOpen,
  kitImageSelect,
} from "@/src/lib/kit-order";
import { resolvePlayer } from "@/src/lib/player-identity";
import { generatePaymentQR, getBankInfo } from "@/src/lib/qr-payment";

/**
 * Public view of a kit order for the self-registration page.
 * Identifies the player by deviceId or phone (both optional) and returns
 * their shirt plus a VietQR if it is still unpaid.
 */
export async function GET(
  req: NextRequest,
  context: { params: Promise<{ kitOrderId: string }> }
) {
  try {
    const { kitOrderId } = await context.params;
    const order = await prisma.kitOrder.findUnique({
      where: { id: kitOrderId },
      include: {
        // Everyone's shirt for the public list: no money fields here
        items: {
          select: {
            id: true,
            playerId: true,
            guestName: true,
            player: { select: { name: true } },
            size: true,
            sizeNote: true,
            printName: true,
            number: true,
          },
          orderBy: { createdAt: "asc" },
        },
        images: {
          select: kitImageSelect,
          orderBy: [{ position: "asc" }, { createdAt: "asc" }],
        },
      },
    });
    if (!order) {
      return NextResponse.json(
        { error: "Không tìm thấy đợt làm áo" },
        { status: 404 }
      );
    }

    const player = await resolvePlayer({
      deviceId: req.nextUrl.searchParams.get("deviceId"),
      phone: req.nextUrl.searchParams.get("phone"),
    });

    const myItem = player
      ? await prisma.kitOrderItem.findUnique({
          where: { kitOrderId_playerId: { kitOrderId, playerId: player.id } },
          select: {
            id: true,
            size: true,
            sizeNote: true,
            printName: true,
            number: true,
            printOnly: true,
            amount: true,
            paid: true,
            selfReportedAt: true,
          },
        })
      : null;

    let qrCodeUrl: string | null = null;
    if (player && myItem && !myItem.paid && myItem.amount > 0) {
      const bankInfo = getBankInfo();
      if (bankInfo) {
        qrCodeUrl = await generatePaymentQR({
          bankInfo,
          amount: myItem.amount,
          description: formatKitPaymentDescription(order.name, player.name),
        });
      }
    }

    return NextResponse.json({
      order: {
        id: order.id,
        name: order.name,
        description: order.description,
        defaultPrice: order.defaultPrice,
        printOnlyPrice: order.printOnlyPrice,
        deadline: order.deadline,
        status: order.status,
        registrationOpen: isRegistrationOpen(order),
      },
      images: order.images,
      registrations: order.items.map((i) => ({
        id: i.id,
        name: displayName(i),
        size: i.size,
        sizeNote: i.sizeNote,
        printName: i.printName,
        number: i.number,
        mine: player !== null && i.playerId === player.id,
      })),
      player,
      myItem,
      qrCodeUrl,
    });
  } catch (e: unknown) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Lỗi hệ thống" },
      { status: 500 }
    );
  }
}
