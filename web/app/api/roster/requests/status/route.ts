import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/src/lib/prisma";

export async function GET(req: NextRequest) {
  try {
    const deviceId = req.nextUrl.searchParams.get("deviceId");

    if (!deviceId) {
      return NextResponse.json(
        { error: "Device ID required" },
        { status: 400 }
      );
    }

    // Find the most recent request for this device
    const request = await prisma.pendingRosterRequest.findFirst({
      where: { deviceId },
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        name: true,
        phone: true,
        status: true,
        createdAt: true,
      },
    });

    if (!request) {
      return NextResponse.json(
        { status: "not_found", message: "Không tìm thấy yêu cầu" },
        { status: 200 }
      );
    }

    return NextResponse.json(
      {
        status: request.status,
        name: request.name,
        phone: request.phone,
        createdAt: request.createdAt.toISOString(),
        message: getStatusMessage(request.status),
      },
      { status: 200 }
    );
  } catch (e: unknown) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Lỗi hệ thống" },
      { status: 500 }
    );
  }
}

function getStatusMessage(status: string): string {
  switch (status) {
    case "Pending":
      return "Yêu cầu của bạn đang chờ duyệt. Vui lòng chờ quản lý xem xét.";
    case "Approved":
      return "Yêu cầu của bạn đã được duyệt! Bạn có thể tham gia các trận đấu.";
    case "Rejected":
      return "Yêu cầu của bạn đã bị từ chối. Vui lòng liên hệ quản lý để biết thêm chi tiết.";
    default:
      return "Trạng thái không xác định.";
  }
}
