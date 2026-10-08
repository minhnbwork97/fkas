import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/src/lib/prisma";
import { assertAdmin } from "@/src/lib/adminGuard";
import { executeTransaction } from "@/src/lib/transaction";
import {
  findDuplicatePayers,
  planSettlement,
  type SettlementMember,
  type SettlementParticipant,
} from "@/src/lib/settlement";

export async function GET(
  req: NextRequest,
  context: { params: Promise<{ matchId: string }> }
) {
  try {
    const { matchId } = await context.params;
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

    // Get settlement data (include player or custom attendee)
    const settlements = await prisma.settlement.findMany({
      where: { matchId },
      include: {
        player: { select: { id: true, name: true } },
        custom: { select: { id: true, name: true } },
      },
    });

    return NextResponse.json({ settlements }, { status: 200 });
  } catch (e: unknown) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Lỗi hệ thống" },
      { status: 500 }
    );
  }
}

type IncomingMember = {
  playerId: string;
  memberAttended: boolean;
  guestsAttended: number;
};

type IncomingParticipant = {
  tempId: string;
  name: string;
  guestCount: number;
  isExistingPlayer?: boolean;
  playerId?: string;
};

export async function POST(
  req: NextRequest,
  context: { params: Promise<{ matchId: string }> }
) {
  try {
    const { matchId } = await context.params;
    const body = await req.json();
    // totalAttended from the client is ignored: the split is computed here.
    const { adminPin, fieldCost, attendanceData, customParticipants } = body;

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

    if (!Array.isArray(attendanceData)) {
      return NextResponse.json(
        { error: "attendanceData array required" },
        { status: 400 }
      );
    }

    const match = await prisma.match.findUnique({ where: { id: matchId } });
    if (!match) {
      return NextResponse.json({ error: "Không tìm thấy" }, { status: 404 });
    }
    if (match.status === "Settled") {
      return NextResponse.json(
        { error: "Trận đấu đã được xác nhận thanh toán, không thể tính lại" },
        { status: 400 }
      );
    }

    const cost =
      typeof fieldCost === "number" && fieldCost > 0
        ? fieldCost
        : match.fieldCost;

    const members: SettlementMember[] = (
      attendanceData as IncomingMember[]
    ).map((a) => ({
      playerId: a.playerId,
      memberAttended: !!a.memberAttended,
      guestsAttended: Math.max(0, Math.floor(a.guestsAttended || 0)),
    }));
    const incoming: IncomingParticipant[] = Array.isArray(customParticipants)
      ? customParticipants
      : [];

    // Every referenced player must exist
    const referencedPlayerIds = [
      ...new Set([
        ...members.map((m) => m.playerId),
        ...incoming
          .filter((p) => p.isExistingPlayer && p.playerId)
          .map((p) => p.playerId as string),
      ]),
    ];
    const players = await prisma.player.findMany({
      where: { id: { in: referencedPlayerIds } },
      select: { id: true, name: true },
    });
    if (players.length !== referencedPlayerIds.length) {
      return NextResponse.json(
        { error: "Một số cầu thủ không tồn tại" },
        { status: 400 }
      );
    }
    const playerName = new Map(players.map((p) => [p.id, p.name]));

    // A player can't be both an attending member and an extra participant
    const duplicates = findDuplicatePayers(
      members,
      incoming
        .filter((p) => p.isExistingPlayer && p.playerId)
        .map((p) => ({
          id: p.playerId as string,
          kind: "player" as const,
          guestCount: p.guestCount,
        }))
    );
    if (duplicates.length > 0) {
      const names = duplicates.map((id) => playerName.get(id) ?? id).join(", ");
      return NextResponse.json(
        {
          error: `${names} đã có trong danh sách điểm danh. Hãy đánh dấu có mặt ở danh sách thay vì thêm lại.`,
        },
        { status: 400 }
      );
    }

    const result = await executeTransaction(async (tx) => {
      // 1. Save actual attendance
      for (const m of members) {
        await tx.attendanceActual.upsert({
          where: { matchId_playerId: { matchId, playerId: m.playerId } },
          update: {
            memberAttended: m.memberAttended,
            guestsAttended: m.guestsAttended,
          },
          create: {
            matchId,
            playerId: m.playerId,
            memberAttended: m.memberAttended,
            guestsAttended: m.guestsAttended,
          },
        });
      }

      // 2. Sync extra participants with the submitted list
      const existingCustom = await tx.customAttendee.findMany({
        where: { matchId },
      });
      const keptCustomIds = new Set<string>();
      const participants: SettlementParticipant[] = [];
      const customName = new Map<string, string>();

      for (const p of incoming) {
        const guestCount = Math.max(0, Math.floor(p.guestCount || 0));
        const linkedPlayerId = p.isExistingPlayer ? p.playerId : undefined;
        const rec =
          existingCustom.find((c) => c.id === p.tempId) ??
          existingCustom.find((c) =>
            linkedPlayerId
              ? c.playerId === linkedPlayerId
              : !c.playerId && c.name === p.name && !keptCustomIds.has(c.id)
          );

        let id: string;
        if (rec) {
          id = rec.id;
          if (rec.guestCount !== guestCount) {
            await tx.customAttendee.update({
              where: { id },
              data: { guestCount },
            });
          }
        } else {
          const created = await tx.customAttendee.create({
            data: {
              matchId,
              name: p.name,
              guestCount,
              playerId: linkedPlayerId ?? null,
            },
          });
          id = created.id;
        }
        keptCustomIds.add(id);

        if (linkedPlayerId) {
          participants.push({ id: linkedPlayerId, kind: "player", guestCount });
        } else {
          participants.push({ id, kind: "custom", guestCount });
          customName.set(id, p.name);
        }
      }

      // 3. Rebuild settlements, keeping each payer's paid status
      const plan = planSettlement(cost, members, participants);

      const previous = await tx.settlement.findMany({ where: { matchId } });
      const keyOf = (kind: string, id: string) => `${kind}:${id}`;
      const previousByKey = new Map(
        previous.map((s) => [
          s.playerId ? keyOf("player", s.playerId) : keyOf("custom", s.customId!),
          s,
        ])
      );

      await tx.settlement.deleteMany({ where: { matchId } });
      // Participants removed from the list must not come back on reload
      await tx.customAttendee.deleteMany({
        where: { matchId, id: { notIn: [...keptCustomIds] } },
      });

      const paidAmountChanged: Array<{
        name: string;
        paidAmount: number;
        newAmount: number;
      }> = [];
      const lines = plan.lines.map((line) => {
        const prev = previousByKey.get(keyOf(line.kind, line.id));
        const paid = prev?.paid ?? false;
        const name =
          line.kind === "player"
            ? playerName.get(line.id) ?? ""
            : customName.get(line.id) ?? "";
        if (paid && prev && prev.amount !== line.amount) {
          paidAmountChanged.push({
            name,
            paidAmount: prev.amount,
            newAmount: line.amount,
          });
        }
        return { ...line, paid, name };
      });

      if (lines.length > 0) {
        await tx.settlement.createMany({
          data: lines.map((l) => ({
            matchId,
            playerId: l.kind === "player" ? l.id : null,
            customId: l.kind === "custom" ? l.id : null,
            amount: l.amount,
            paid: l.paid,
          })),
        });
      }

      return { plan, lines, paidAmountChanged };
    });

    // Note: Match status is NOT automatically set to "Settled" here
    // The organizer must explicitly confirm settlement via separate API call
    return NextResponse.json(
      {
        success: true,
        summary: {
          totalAttended: result.plan.totalAttended,
          fieldCost: cost,
          perPersonCost: result.plan.perPersonCost,
          remainder: result.plan.remainder,
          transactions: result.lines.map((l) => ({
            playerId: l.id,
            playerName: l.name,
            amount: l.amount,
            paid: l.paid,
            isCustom: l.kind === "custom",
          })),
        },
        paidAmountChanged: result.paidAmountChanged,
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
