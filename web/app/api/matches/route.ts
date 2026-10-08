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

const MATCH_LIST_SELECT = {
  id: true,
  dateTime: true,
  type: true,
  fieldCost: true,
  status: true,
  link: true,
} as const;

const DEFAULT_PAGE_SIZE = 10;
const MAX_PAGE_SIZE = 50;

export async function GET(req: NextRequest) {
  try {
    const params = req.nextUrl.searchParams;

    // Without ?page the response keeps its original shape (latest 50),
    // which the receivables filter relies on.
    if (!params.has("page")) {
      const matches = await prisma.match.findMany({
        orderBy: { dateTime: "desc" },
        take: 50,
        select: MATCH_LIST_SELECT,
      });
      return NextResponse.json({ matches }, { status: 200 });
    }

    const page = Math.max(1, parseInt(params.get("page") ?? "1", 10) || 1);
    const pageSize = Math.min(
      MAX_PAGE_SIZE,
      Math.max(
        1,
        parseInt(params.get("pageSize") ?? "", 10) || DEFAULT_PAGE_SIZE
      )
    );

    const [matches, total] = await Promise.all([
      prisma.match.findMany({
        orderBy: { dateTime: "desc" },
        skip: (page - 1) * pageSize,
        take: pageSize,
        select: MATCH_LIST_SELECT,
      }),
      prisma.match.count(),
    ]);

    return NextResponse.json(
      {
        matches,
        page,
        pageSize,
        total,
        totalPages: Math.max(1, Math.ceil(total / pageSize)),
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
