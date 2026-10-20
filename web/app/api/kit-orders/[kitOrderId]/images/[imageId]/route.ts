import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/src/lib/prisma";
import { adminPinError } from "@/src/lib/adminGuard";

type Ctx = { params: Promise<{ kitOrderId: string; imageId: string }> };

/** Public: serves the image bytes. Images never change, so cache forever. */
export async function GET(_req: NextRequest, context: Ctx) {
  const { kitOrderId, imageId } = await context.params;
  const image = await prisma.kitOrderImage.findFirst({
    where: { id: imageId, kitOrderId },
    select: { data: true, mimeType: true },
  });
  if (!image) {
    return NextResponse.json({ error: "Không tìm thấy ảnh" }, { status: 404 });
  }
  return new NextResponse(Buffer.from(image.data), {
    headers: {
      "Content-Type": image.mimeType,
      "Cache-Control": "public, max-age=31536000, immutable",
    },
  });
}

export async function DELETE(req: NextRequest, context: Ctx) {
  try {
    const authError = adminPinError(req.nextUrl.searchParams.get("adminPin"));
    if (authError) {
      return NextResponse.json(
        { error: authError.error },
        { status: authError.status }
      );
    }
    const { kitOrderId, imageId } = await context.params;

    const { count } = await prisma.kitOrderImage.deleteMany({
      where: { id: imageId, kitOrderId },
    });
    if (count === 0) {
      return NextResponse.json({ error: "Không tìm thấy ảnh" }, { status: 404 });
    }
    return NextResponse.json({ success: true });
  } catch (e: unknown) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Lỗi hệ thống" },
      { status: 500 }
    );
  }
}
