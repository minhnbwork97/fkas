import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/src/lib/prisma";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { dateTime, type, fieldCost } = body ?? {};
    if (!dateTime || !type) {
      return NextResponse.json(
        { error: "Ngày giờ và loại trận là bắt buộc" },
        { status: 400 }
      );
    }
    const match = await prisma.match.create({
      data: {
        dateTime: new Date(dateTime),
        type,
        status: "Collecting",
        fieldCost: typeof fieldCost === "number" ? fieldCost : undefined,
        link: "", // will be updated after create
        qrCodeRef: "",
      },
    });
    // update link with actual match id
    const updated = await prisma.match.update({
      where: { id: match.id },
      data: { link: `/m/${match.id}` },
      select: { id: true, link: true },
    });
    return NextResponse.json(
      { id: updated.id, link: updated.link },
      { status: 201 }
    );
  } catch (e: unknown) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Lỗi hệ thống" },
      { status: 500 }
    );
  }
}

export async function GET() {
  try {
    const matches = await prisma.match.findMany({
      orderBy: { dateTime: "desc" },
      take: 50,
      select: {
        id: true,
        dateTime: true,
        type: true,
        fieldCost: true,
        status: true,
        link: true,
      },
    });
    return NextResponse.json({ matches }, { status: 200 });
  } catch (e: unknown) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Lỗi hệ thống" },
      { status: 500 }
    );
  }
}
