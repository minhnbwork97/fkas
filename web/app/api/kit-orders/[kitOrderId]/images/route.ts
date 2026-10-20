import { NextRequest, NextResponse } from "next/server";
import { KitImageKind } from "@prisma/client";
import { prisma } from "@/src/lib/prisma";
import { adminPinError } from "@/src/lib/adminGuard";
import {
  MAX_KIT_IMAGE_BYTES,
  MAX_KIT_PREVIEW_IMAGES,
  kitImageSelect,
} from "@/src/lib/kit-order";

const ALLOWED_TYPES = ["image/jpeg", "image/png", "image/webp"];
const KINDS: KitImageKind[] = ["Preview", "SizeChart"];

/**
 * Organizer uploads one image (multipart: adminPin, kind, file).
 * The browser resizes it first; a new size chart replaces the old one.
 */
export async function POST(
  req: NextRequest,
  context: { params: Promise<{ kitOrderId: string }> }
) {
  try {
    const form = await req.formData();
    const authError = adminPinError(form.get("adminPin") as string | null);
    if (authError) {
      return NextResponse.json(
        { error: authError.error },
        { status: authError.status }
      );
    }
    const { kitOrderId } = await context.params;

    const kind = form.get("kind") as KitImageKind;
    if (!KINDS.includes(kind)) {
      return NextResponse.json({ error: "Loại ảnh không hợp lệ" }, { status: 400 });
    }
    const file = form.get("file");
    if (!(file instanceof File) || !ALLOWED_TYPES.includes(file.type)) {
      return NextResponse.json(
        { error: "Chỉ nhận ảnh JPG, PNG hoặc WebP" },
        { status: 400 }
      );
    }
    if (file.size > MAX_KIT_IMAGE_BYTES) {
      return NextResponse.json({ error: "Ảnh quá lớn" }, { status: 400 });
    }

    const order = await prisma.kitOrder.findUnique({
      where: { id: kitOrderId },
      select: { id: true },
    });
    if (!order) {
      return NextResponse.json(
        { error: "Không tìm thấy đợt làm áo" },
        { status: 404 }
      );
    }
    if (kind === "Preview") {
      const count = await prisma.kitOrderImage.count({
        where: { kitOrderId, kind },
      });
      if (count >= MAX_KIT_PREVIEW_IMAGES) {
        return NextResponse.json(
          { error: `Tối đa ${MAX_KIT_PREVIEW_IMAGES} ảnh minh hoạ` },
          { status: 400 }
        );
      }
    }

    const data = new Uint8Array(await file.arrayBuffer());
    const image = await prisma.$transaction(async (tx) => {
      if (kind === "SizeChart") {
        await tx.kitOrderImage.deleteMany({ where: { kitOrderId, kind } });
      }
      // New photos go to the end of the gallery
      const last = await tx.kitOrderImage.aggregate({
        where: { kitOrderId, kind },
        _max: { position: true },
      });
      const position = (last._max.position ?? -1) + 1;
      return tx.kitOrderImage.create({
        data: { kitOrderId, kind, mimeType: file.type, data, position },
        select: kitImageSelect,
      });
    });

    return NextResponse.json(image, { status: 201 });
  } catch (e: unknown) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Lỗi hệ thống" },
      { status: 500 }
    );
  }
}

/** Organizer reorders the preview photos: body { adminPin, ids } in display order */
export async function PUT(
  req: NextRequest,
  context: { params: Promise<{ kitOrderId: string }> }
) {
  try {
    const body = await req.json();
    const authError = adminPinError(body?.adminPin);
    if (authError) {
      return NextResponse.json(
        { error: authError.error },
        { status: authError.status }
      );
    }
    const { kitOrderId } = await context.params;

    const ids: unknown = body.ids;
    if (!Array.isArray(ids) || !ids.every((id) => typeof id === "string")) {
      return NextResponse.json({ error: "ids không hợp lệ" }, { status: 400 });
    }
    const existing = await prisma.kitOrderImage.findMany({
      where: { kitOrderId, kind: "Preview" },
      select: { id: true },
    });
    const known = new Set(existing.map((i) => i.id));
    if (ids.length !== known.size || !ids.every((id) => known.has(id))) {
      return NextResponse.json(
        { error: "Danh sách ảnh đã thay đổi, tải lại trang rồi thử lại" },
        { status: 409 }
      );
    }

    await prisma.$transaction(
      ids.map((id, position) =>
        prisma.kitOrderImage.update({ where: { id }, data: { position } })
      )
    );
    return NextResponse.json({ success: true });
  } catch (e: unknown) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Lỗi hệ thống" },
      { status: 500 }
    );
  }
}
