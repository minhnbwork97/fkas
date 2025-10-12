import { NextRequest, NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { prisma } from "@/src/lib/prisma";
import { assertAdmin } from "@/src/lib/adminGuard";

export async function GET(req: NextRequest) {
  try {
    const url = new URL(req.url);
    const adminPin = url.searchParams.get("adminPin");
    const playerIdFilter = url.searchParams.get("playerId");
    const startDate = url.searchParams.get("startDate");
    const endDate = url.searchParams.get("endDate");
    const page = parseInt(url.searchParams.get("page") || "1", 10);
    const pageSize = parseInt(url.searchParams.get("pageSize") || "10", 10);

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

    // Build filter for transactions
    const whereClause: Prisma.TransactionWhereInput = {};
    if (playerIdFilter) {
      whereClause.playerId = playerIdFilter;
    }
    if (startDate || endDate) {
      whereClause.createdAt = {};
      if (startDate) {
        whereClause.createdAt.gte = new Date(startDate);
      }
      if (endDate) {
        whereClause.createdAt.lte = new Date(endDate);
      }
    }

    // Get all players with their balances
    const players = await prisma.player.findMany({
      select: { id: true, name: true, balance: true },
    });

    const playerBalanceMap = new Map(players.map((p) => [p.id, p.balance]));

    // Calculate total fund as sum of all player balances
    const currentBalance = players.reduce((sum, p) => sum + p.balance, 0);

    // Get total count for pagination
    const totalTransactions = await prisma.transaction.count({
      where: whereClause,
    });

    // Calculate pagination
    const totalPages = Math.ceil(totalTransactions / pageSize);
    const skip = (page - 1) * pageSize;

    // Get transactions ordered by oldest first for balance calculation
    // We need all transactions for correct balance calculation
    const allTransactions = await prisma.transaction.findMany({
      where: whereClause,
      orderBy: { createdAt: "asc" },
      include: {
        player: { select: { id: true, name: true } },
        match: { select: { dateTime: true } },
      },
    });

    // Calculate balanceBefore and balanceAfter for each transaction
    const transactionsWithBalance = allTransactions.map((tx) => {
      const currentPlayerBalance = playerBalanceMap.get(tx.playerId) || 0;

      // Calculate balance before this transaction
      // We need to subtract all transactions that happened after this one
      const laterTransactions = allTransactions.filter(
        (t) => t.playerId === tx.playerId && t.createdAt > tx.createdAt
      );
      const laterTransactionsTotal = laterTransactions.reduce(
        (sum, t) => sum + t.amount,
        0
      );

      const balanceBefore =
        currentPlayerBalance - laterTransactionsTotal - tx.amount;
      const balanceAfter = balanceBefore + tx.amount;

      return {
        id: tx.id,
        type: tx.type,
        amount: tx.amount,
        note: tx.note,
        playerId: tx.playerId,
        playerName: tx.player.name,
        matchId: tx.matchId,
        matchDate: tx.match?.dateTime,
        createdAt: tx.createdAt.toISOString(),
        balanceBefore,
        balanceAfter,
      };
    });

    // Reverse to show newest first
    transactionsWithBalance.reverse();

    // Apply pagination to the final results
    const paginatedTransactions = transactionsWithBalance.slice(
      skip,
      skip + pageSize
    );

    const totalIncome = allTransactions
      .filter((t) => t.type === "TopUp")
      .reduce((sum, t) => sum + t.amount, 0);

    const totalExpense = Math.abs(
      allTransactions
        .filter((t) => t.type === "Charge")
        .reduce((sum, t) => sum + t.amount, 0)
    );

    return NextResponse.json(
      {
        summary: {
          currentBalance,
          totalIncome,
          totalExpense,
          transactionCount: totalTransactions,
        },
        transactions: paginatedTransactions,
        pagination: {
          page,
          pageSize,
          totalPages,
          totalCount: totalTransactions,
          hasMore: page < totalPages,
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
    const { adminPin, direction, amount, note, playerId } = body;

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

    // playerId is required - all fund transactions must be associated with a player
    if (!playerId) {
      return NextResponse.json(
        { error: "playerId is required" },
        { status: 400 }
      );
    }

    // Ensure player exists and update balance in a transaction
    {
      // verify player exists
      const player = await prisma.player.findUnique({
        where: { id: playerId },
      });
      if (!player) {
        return NextResponse.json(
          { error: "player not found" },
          { status: 404 }
        );
      }

      // Run in a transaction: create player transaction and update player balance
      const result = await prisma.$transaction(async (tx) => {
        // Create Transaction record for player fund tracking
        const transaction = await tx.transaction.create({
          data: {
            playerId: playerId,
            type: direction === "Income" ? "TopUp" : "Charge",
            amount: direction === "Income" ? amount : -amount,
            note: note || null,
          },
        });

        // Update player balance
        const updatedPlayer = await tx.player.update({
          where: { id: playerId },
          data: {
            balance:
              direction === "Income"
                ? { increment: amount }
                : { decrement: amount },
          },
        });

        return { transaction, updatedPlayer };
      });

      return NextResponse.json(
        {
          success: true,
          transaction: {
            id: result.transaction.id,
            type: result.transaction.type,
            amount: result.transaction.amount,
            note: result.transaction.note,
            createdAt: result.transaction.createdAt.toISOString(),
          },
          player: {
            id: result.updatedPlayer.id,
            balance: result.updatedPlayer.balance,
          },
        },
        { status: 200 }
      );
    }
  } catch (e: unknown) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Lỗi hệ thống" },
      { status: 500 }
    );
  }
}
