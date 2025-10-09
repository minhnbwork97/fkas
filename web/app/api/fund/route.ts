import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/src/lib/prisma";
import { assertAdmin } from "@/src/lib/adminGuard";

export async function GET(req: NextRequest) {
  try {
    const url = new URL(req.url);
    const adminPin = url.searchParams.get("adminPin");

    if (!adminPin) {
      return NextResponse.json(
        { error: "Admin PIN required" },
        { status: 401 }
      );
    }

    // Verify admin PIN
    try {
      assertAdmin(process.env.ADMIN_PIN, adminPin);
    } catch {
      return NextResponse.json({ error: "Invalid admin PIN" }, { status: 403 });
    }

    // Get all fund entries
    const entries = await prisma.teamFundEntry.findMany({
      orderBy: { createdAt: "desc" },
    });

    // Calculate summary
    const totalIncome = entries
      .filter((e) => e.direction === "Income")
      .reduce((sum, e) => sum + e.amount, 0);

    const totalExpense = entries
      .filter((e) => e.direction === "Expense")
      .reduce((sum, e) => sum + e.amount, 0);

    const currentBalance = totalIncome - totalExpense;

    return NextResponse.json(
      {
        entries: entries.map((entry) => ({
          id: entry.id,
          direction: entry.direction,
          amount: entry.amount,
          note: entry.note,
          createdAt: entry.createdAt.toISOString(),
        })),
        summary: {
          currentBalance,
          totalIncome,
          totalExpense,
          entryCount: entries.length,
        },
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

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { adminPin, direction, amount, note } = body;

    if (!adminPin) {
      return NextResponse.json(
        { error: "Admin PIN required" },
        { status: 401 }
      );
    }

    // Verify admin PIN
    try {
      assertAdmin(process.env.ADMIN_PIN, adminPin);
    } catch {
      return NextResponse.json({ error: "Invalid admin PIN" }, { status: 403 });
    }

    if (!direction || !amount || typeof amount !== "number") {
      return NextResponse.json(
        { error: "direction and amount are required" },
        { status: 400 }
      );
    }

    if (direction !== "Income" && direction !== "Expense") {
      return NextResponse.json(
        { error: "direction must be Income or Expense" },
        { status: 400 }
      );
    }

    if (amount <= 0) {
      return NextResponse.json(
        { error: "amount must be positive" },
        { status: 400 }
      );
    }

    // Create fund entry
    const entry = await prisma.teamFundEntry.create({
      data: {
        direction,
        amount,
        note: note || null,
      },
    });

    return NextResponse.json(
      {
        success: true,
        entry: {
          id: entry.id,
          direction: entry.direction,
          amount: entry.amount,
          note: entry.note,
          createdAt: entry.createdAt.toISOString(),
        },
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
