/**
 * Field-cost split shared by the settlement API and the settlement page,
 * so both always agree on who pays and how much.
 *
 * Everyone who plays is one "head": an attending member, each of their
 * guests, each extra participant and each of their guests. The field cost
 * is split evenly per head (rounded down); a payer is charged for
 * themselves plus their guests. When a member is absent but their guests
 * still played, the member is charged for the guests only, so the total
 * collected always covers every head that was counted.
 */

export type SettlementMember = {
  playerId: string;
  memberAttended: boolean;
  guestsAttended: number;
};

export type SettlementParticipant = {
  /** playerId for an existing player, CustomAttendee id otherwise */
  id: string;
  kind: "player" | "custom";
  guestCount: number;
};

export type SettlementLine = {
  id: string;
  kind: "player" | "custom";
  heads: number;
  amount: number;
};

export type SettlementPlan = {
  totalAttended: number;
  perPersonCost: number;
  remainder: number;
  lines: SettlementLine[];
};

const guestsOf = (n: number) => Math.max(0, Math.floor(n || 0));

/** Members who owe something: present, or absent with guests who played. */
const chargedMembers = (members: SettlementMember[]) =>
  members.filter((m) => m.memberAttended || guestsOf(m.guestsAttended) > 0);

export function planSettlement(
  fieldCost: number,
  members: SettlementMember[],
  participants: SettlementParticipant[]
): SettlementPlan {
  const payers: Array<Omit<SettlementLine, "amount">> = [
    ...chargedMembers(members).map((m) => ({
      id: m.playerId,
      kind: "player" as const,
      heads: (m.memberAttended ? 1 : 0) + guestsOf(m.guestsAttended),
    })),
    ...participants.map((p) => ({
      id: p.id,
      kind: p.kind,
      heads: 1 + guestsOf(p.guestCount),
    })),
  ];

  const totalAttended = payers.reduce((sum, p) => sum + p.heads, 0);
  const perPersonCost =
    totalAttended > 0 ? Math.floor(fieldCost / totalAttended) : 0;
  const remainder = fieldCost - perPersonCost * totalAttended;

  return {
    totalAttended,
    perPersonCost,
    remainder,
    lines: payers.map((p) => ({ ...p, amount: perPersonCost * p.heads })),
  };
}

/** Player ids that would be charged twice (member line + participant line). */
export function findDuplicatePayers(
  members: SettlementMember[],
  participants: SettlementParticipant[]
): string[] {
  const seen = new Set<string>();
  const dupes = new Set<string>();
  const ids = [
    ...chargedMembers(members).map((m) => m.playerId),
    ...participants.filter((p) => p.kind === "player").map((p) => p.id),
  ];
  for (const id of ids) {
    if (seen.has(id)) dupes.add(id);
    seen.add(id);
  }
  return [...dupes];
}
