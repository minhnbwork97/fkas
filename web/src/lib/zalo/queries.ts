import { prisma } from "@/src/lib/prisma";

const VN_TZ = "Asia/Ho_Chi_Minh";

/** "Thứ 7 31/10/2026 19:00" in Vietnam time, whatever the server timezone */
export function formatMatchTime(date: Date): string {
  const p = Object.fromEntries(
    new Intl.DateTimeFormat("en-GB", {
      timeZone: VN_TZ,
      weekday: "short",
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
      hourCycle: "h23",
    })
      .formatToParts(date)
      .map((x) => [x.type, x.value])
  );
  const weekday: Record<string, string> = {
    Mon: "Thứ 2", Tue: "Thứ 3", Wed: "Thứ 4", Thu: "Thứ 5",
    Fri: "Thứ 6", Sat: "Thứ 7", Sun: "Chủ nhật",
  };
  return `${weekday[p.weekday] ?? p.weekday} ${p.day}/${p.month}/${p.year} ${p.hour}:${p.minute}`;
}

/** "2026-10-31" for a date in Vietnam time */
export function vnDateKey(date: Date): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone: VN_TZ }).format(date);
}

/** Phone as digits with a leading 0: "+84 901-234-567" -> "0901234567" */
export function normalizePhone(raw: string): string {
  const digits = raw.replace(/\D/g, "");
  if (digits.startsWith("84") && digits.length >= 11) return `0${digits.slice(2)}`;
  return digits;
}

/** Find a player whose stored phone matches, ignoring formatting */
export async function findPlayerByPhone(raw: string) {
  const wanted = normalizePhone(raw);
  if (wanted.length < 9) return null;
  const players = await prisma.player.findMany({
    where: { phone: { not: null } },
    select: { id: true, name: true, phone: true },
  });
  return players.find((p) => normalizePhone(p.phone!) === wanted) ?? null;
}

const MATCH_TYPE_LABEL = { Internal: "Đá nội bộ", VsTeam: "Đấu đội khác" } as const;
const STATUS_LABEL = {
  Attending: "đi",
  Tentative: "chưa chắc",
  NotGoing: "không đi",
} as const;

/**
 * The match people mean by "this week": the earliest one not yet settled
 * from today on. Falls back to the most recent match.
 */
export async function findUpcomingMatch() {
  const startOfToday = new Date(`${vnDateKey(new Date())}T00:00:00+07:00`);
  return (
    (await prisma.match.findFirst({
      where: { status: { not: "Settled" }, dateTime: { gte: startOfToday } },
      orderBy: { dateTime: "asc" },
    })) ??
    (await prisma.match.findFirst({ orderBy: { dateTime: "desc" } }))
  );
}

/** Match on a given Vietnam calendar day ("2026-10-31") */
export async function findMatchOnDate(day: string) {
  const start = new Date(`${day}T00:00:00+07:00`);
  if (Number.isNaN(start.getTime())) return null;
  const end = new Date(start.getTime() + 24 * 3600 * 1000);
  return prisma.match.findFirst({
    where: { dateTime: { gte: start, lt: end } },
    orderBy: { dateTime: "asc" },
  });
}

/** Who is coming, as on the public attendance page (current-attendance) */
export async function describeMatch(
  match: { id: string; dateTime: Date; type: "Internal" | "VsTeam"; status: string; fieldCost: number },
  playerId: string
) {
  const intents = await prisma.attendanceIntent.findMany({
    where: { matchId: match.id },
    include: { player: { select: { id: true, name: true } } },
    orderBy: { createdAt: "asc" },
  });
  const going = intents.filter((i) => i.status === "Attending");
  const guests = going.reduce((sum, i) => sum + i.guestCount, 0);
  const mine = intents.find((i) => i.player.id === playerId);
  const name = (i: (typeof intents)[number]) =>
    `${i.player.name}${i.guestCount ? ` (+${i.guestCount})` : ""}${i.isLate ? " (đến muộn)" : ""}`;

  return {
    matchId: match.id,
    time: formatMatchTime(match.dateTime),
    type: MATCH_TYPE_LABEL[match.type],
    settled: match.status === "Settled",
    fieldCost: match.fieldCost,
    totalComing: going.length + guests,
    members: going.length,
    guests,
    going: going.map(name),
    tentative: intents.filter((i) => i.status === "Tentative").map(name),
    notGoing: intents.filter((i) => i.status === "NotGoing").map((i) => i.player.name),
    myStatus: mine
      ? { status: STATUS_LABEL[mine.status], guests: mine.guestCount, late: mine.isLate }
      : "chưa điểm danh",
    link: `/m/${match.id}`,
  };
}

/** Unpaid match fees for one player */
export async function playerDebts(playerId: string) {
  const unpaid = await prisma.settlement.findMany({
    where: { playerId, paid: false },
    include: { match: { select: { id: true, dateTime: true } } },
    orderBy: { match: { dateTime: "asc" } },
  });
  return {
    total: unpaid.reduce((sum, s) => sum + s.amount, 0),
    matches: unpaid.map((s) => ({
      settlementId: s.id,
      match: formatMatchTime(s.match.dateTime),
      amount: s.amount,
      payLink: `/m/${s.match.id}/payment`,
    })),
  };
}

export async function playerFund(playerId: string) {
  const player = await prisma.player.findUnique({
    where: { id: playerId },
    select: { balance: true },
  });
  const recent = await prisma.transaction.findMany({
    where: { playerId },
    orderBy: { createdAt: "desc" },
    take: 5,
    select: { type: true, amount: true, note: true, createdAt: true },
  });
  return {
    balance: player?.balance ?? 0,
    recent: recent.map((t) => ({
      type: { TopUp: "nạp quỹ", Charge: "trừ quỹ", Refund: "hoàn tiền" }[t.type],
      amount: t.amount,
      note: t.note,
      date: formatMatchTime(t.createdAt).split(" ").slice(0, 3).join(" "),
    })),
  };
}

/** Recent matches for picking one by date or order (ids for other tools) */
export async function recentMatches(limit = 8) {
  const matches = await prisma.match.findMany({
    orderBy: { dateTime: "desc" },
    take: limit,
    select: { id: true, dateTime: true, type: true, status: true },
  });
  return matches.map((m) => ({
    matchId: m.id,
    time: formatMatchTime(m.dateTime),
    type: MATCH_TYPE_LABEL[m.type],
    settled: m.status === "Settled",
  }));
}

/** Settlements of a match (organizer view), with ids for mark_paid */
export async function matchSettlements(matchId: string) {
  const match = await prisma.match.findUnique({
    where: { id: matchId },
    select: { dateTime: true, status: true },
  });
  if (!match) return null;
  const settlements = await prisma.settlement.findMany({
    where: { matchId },
    include: {
      player: { select: { name: true, zaloAccount: { select: { zaloUserId: true } } } },
      custom: { select: { name: true } },
    },
    orderBy: [{ paid: "asc" }, { createdAt: "asc" }],
  });
  const unpaid = settlements.filter((s) => !s.paid);
  return {
    match: formatMatchTime(match.dateTime),
    settled: match.status === "Settled",
    totalUnpaid: unpaid.reduce((sum, s) => sum + s.amount, 0),
    unpaidCount: unpaid.length,
    settlements: settlements.map((s) => ({
      settlementId: s.id,
      name: s.player?.name ?? s.custom?.name ?? "?",
      amount: s.amount,
      paid: s.paid,
      onZalo: Boolean(s.player?.zaloAccount),
    })),
  };
}

/** Every unpaid settlement across matches, grouped by match (organizer) */
export async function allUnpaid() {
  const unpaid = await prisma.settlement.findMany({
    where: { paid: false },
    include: {
      player: { select: { name: true } },
      custom: { select: { name: true } },
      match: { select: { id: true, dateTime: true } },
    },
    orderBy: { match: { dateTime: "desc" } },
  });
  const byMatch = new Map<string, { matchId: string; match: string; people: string[]; total: number }>();
  for (const s of unpaid) {
    const entry = byMatch.get(s.matchId) ?? {
      matchId: s.matchId,
      match: formatMatchTime(s.match.dateTime),
      people: [],
      total: 0,
    };
    entry.people.push(`${s.player?.name ?? s.custom?.name ?? "?"} ${s.amount}`);
    entry.total += s.amount;
    byMatch.set(s.matchId, entry);
  }
  return {
    total: unpaid.reduce((sum, s) => sum + s.amount, 0),
    matches: [...byMatch.values()],
  };
}
