import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/src/lib/prisma";
import { assertAdmin } from "@/src/lib/adminGuard";

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

export async function POST(
  req: NextRequest,
  context: { params: Promise<{ matchId: string }> }
) {
  try {
    const { matchId } = await context.params;
    const body = await req.json();
    const {
      adminPin,
      actualAttendees,
      fieldCost,
      attendanceData,
      customParticipants,
      totalAttended: totalAttendedFromClient,
    } = body;

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

    if (!actualAttendees || !Array.isArray(actualAttendees)) {
      return NextResponse.json(
        { error: "actualAttendees array required" },
        { status: 400 }
      );
    }

    // Get match
    const match = await prisma.match.findUnique({
      where: { id: matchId },
    });

    if (!match) {
      return NextResponse.json({ error: "Không tìm thấy" }, { status: 404 });
    }

    // Load previous actual attendance BEFORE upserting to detect changes
    const previousAttendance = await prisma.attendanceActual.findMany({
      where: { matchId },
      select: { playerId: true, memberAttended: true, guestsAttended: true },
    });

    // Save actual attendance data
    if (attendanceData && Array.isArray(attendanceData)) {
      for (const attendance of attendanceData) {
        await prisma.attendanceActual.upsert({
          where: {
            matchId_playerId: {
              matchId: matchId,
              playerId: attendance.playerId,
            },
          },
          update: {
            memberAttended: attendance.memberAttended,
            guestsAttended: attendance.guestsAttended,
          },
          create: {
            matchId: matchId,
            playerId: attendance.playerId,
            memberAttended: attendance.memberAttended,
            guestsAttended: attendance.guestsAttended,
          },
        });
      }
    }

    // Ensure custom participants exist per match in CustomAttendee
    const customRecords: Array<{
      id: string;
      name: string;
      guestCount: number;
    }> = [];
    if (Array.isArray(customParticipants) && customParticipants.length > 0) {
      for (const cp of customParticipants as Array<{
        tempId: string;
        name: string;
        guestCount: number;
      }>) {
        let rec = await prisma.customAttendee.findFirst({
          where: { matchId, name: cp.name },
        });
        if (!rec) {
          rec = await prisma.customAttendee.create({
            data: { matchId, name: cp.name, guestCount: cp.guestCount || 0 },
          });
        } else if ((rec.guestCount || 0) !== (cp.guestCount || 0)) {
          rec = await prisma.customAttendee.update({
            where: { id: rec.id },
            data: { guestCount: cp.guestCount || 0 },
          });
        }
        customRecords.push({
          id: rec.id,
          name: rec.name,
          guestCount: rec.guestCount,
        });
      }
    }

    // Get player details for actual attendees (members only)
    const attendees = await prisma.player.findMany({
      where: { id: { in: actualAttendees } },
    });

    if (attendees.length !== actualAttendees.length) {
      return NextResponse.json(
        { error: "Một số cầu thủ không tồn tại" },
        { status: 400 }
      );
    }

    // Detect if actual attendance changed vs previous
    let attendanceChanged = true;
    if (attendanceData && Array.isArray(attendanceData)) {
      const prevMap = new Map(previousAttendance.map((a) => [a.playerId, a]));
      const newMap = new Map(
        (
          attendanceData as Array<{
            playerId: string;
            memberAttended: boolean;
            guestsAttended: number;
          }>
        ).map((a) => [a.playerId, a])
      );
      if (prevMap.size === newMap.size) {
        attendanceChanged = false;
        for (const [playerId, prev] of prevMap) {
          const curr = newMap.get(playerId);
          if (
            !curr ||
            curr.memberAttended !== prev.memberAttended ||
            curr.guestsAttended !== prev.guestsAttended
          ) {
            attendanceChanged = true;
            break;
          }
        }
      }
    }

    // Build guest map for attendees (from latest attendanceData)
    const guestsByPlayer = new Map<string, number>();
    if (attendanceData && Array.isArray(attendanceData)) {
      for (const a of attendanceData as Array<{
        playerId: string;
        memberAttended: boolean;
        guestsAttended: number;
      }>) {
        if (a.memberAttended) {
          guestsByPlayer.set(a.playerId, Math.max(0, a.guestsAttended || 0));
        }
      }
    }

    // Calculate counts for summary (prefer client total which includes guests/custom)
    const customGuests = (customRecords || []).reduce(
      (sum: number, p: { guestCount: number }) => sum + (p.guestCount || 0),
      0
    );
    const computedWithGuests =
      attendees.length +
      Array.from(guestsByPlayer.values()).reduce((s, n) => s + n, 0) +
      customGuests;
    const totalAttended = Math.max(
      totalAttendedFromClient ?? computedWithGuests,
      1
    );
    const perPersonCost = Math.floor(fieldCost / totalAttended);
    const remainder = fieldCost - perPersonCost * totalAttended;

    let settlements: Array<{
      playerId: string;
      playerName: string;
      amount: number;
      paid: boolean;
    }>;
    if (attendanceChanged) {
      // Remove all and recreate
      await prisma.settlement.deleteMany({ where: { matchId } });

      settlements = [];
      for (const player of attendees) {
        const guestCount = guestsByPlayer.get(player.id) ?? 0;
        const settlement = await prisma.settlement.create({
          data: {
            matchId: matchId,
            playerId: player.id,
            amount: perPersonCost * (1 + guestCount),
            paid: false,
          },
        });

        settlements.push({
          playerId: player.id,
          playerName: player.name,
          amount: perPersonCost * (1 + guestCount),
          paid: settlement.paid,
        });
      }
      // Create settlements for custom attendees
      for (const ca of customRecords) {
        const settlement = await prisma.settlement.create({
          data: {
            matchId,
            customId: ca.id,
            amount: perPersonCost * (1 + (ca.guestCount || 0)),
            paid: false,
          },
        });
        settlements.push({
          playerId: ca.id,
          playerName: ca.name,
          amount: perPersonCost * (1 + (ca.guestCount || 0)),
          paid: settlement.paid,
        });
      }
    } else {
      // Keep existing settlements if no attendance change, unless we must rebuild
      const existing = await prisma.settlement.findMany({
        where: { matchId },
        include: {
          player: { select: { name: true } },
          custom: { select: { name: true } },
        },
        orderBy: { createdAt: "asc" },
      });

      // Detect per-person change via GCD
      const gcd = (a: number, b: number): number =>
        b === 0 ? a : gcd(b, a % b);
      let base = 0;
      for (const s of existing)
        base = base === 0 ? s.amount : gcd(base, s.amount);
      const perChanged = base > 0 && base !== perPersonCost;

      // Rebuild if no settlements yet, or per-person changed, or custom count changed
      const existingCustomCount = existing.filter(
        (e) => e.customId != null
      ).length;
      const needRebuild =
        existing.length === 0 ||
        perChanged ||
        existingCustomCount !== customRecords.length;

      if (needRebuild) {
        await prisma.settlement.deleteMany({ where: { matchId } });

        settlements = [];
        for (const player of attendees) {
          const guestCount = guestsByPlayer.get(player.id) ?? 0;
          const settlement = await prisma.settlement.create({
            data: {
              matchId: matchId,
              playerId: player.id,
              amount: perPersonCost * (1 + guestCount),
              paid: false,
            },
          });
          settlements.push({
            playerId: player.id,
            playerName: player.name,
            amount: perPersonCost * (1 + guestCount),
            paid: settlement.paid,
          });
        }

        for (const ca of customRecords) {
          const settlement = await prisma.settlement.create({
            data: {
              matchId,
              customId: ca.id,
              amount: perPersonCost * (1 + (ca.guestCount || 0)),
              paid: false,
            },
          });
          settlements.push({
            playerId: ca.id,
            playerName: ca.name,
            amount: perPersonCost * (1 + (ca.guestCount || 0)),
            paid: settlement.paid,
          });
        }
      } else {
        settlements = existing.map((s) => ({
          playerId: (s.playerId ?? s.customId)!,
          playerName: s.player?.name ?? s.custom?.name ?? "",
          amount: s.amount,
          paid: s.paid,
        }));
      }
    }

    // Handle remainder - add to team fund if available
    if (remainder > 0) {
      await prisma.teamFundEntry.create({
        data: {
          direction: "Income",
          amount: remainder,
          note: `Số dư từ trận đấu ${new Date(
            match.dateTime
          ).toLocaleDateString("vi-VN")}`,
        },
      });
    }

    // Note: Match status is NOT automatically set to "Settled" here
    // The organizer must explicitly confirm settlement via separate API call

    return NextResponse.json(
      {
        success: true,
        summary: {
          totalAttended,
          fieldCost,
          perPersonCost,
          remainder,
          transactions: settlements,
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
