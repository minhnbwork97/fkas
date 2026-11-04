import { prisma } from "./prisma";
import { executeTransaction } from "./transaction";

/**
 * Mark one settlement paid or unpaid (shared by the organizer API and the
 * Zalo bot). When marking paid a player who has used the fund before
 * (any TopUp/Charge), the amount is also charged to their fund balance.
 * Callers check `paid` first if they must not charge twice.
 */
export async function setSettlementPaid(
  existing: { id: string; playerId: string | null },
  matchId: string,
  paid: boolean
) {
  // Check if player has any previous transactions (indicating they've contributed to the fund)
  const hasContributedToFund = existing.playerId
    ? await prisma.transaction.count({
        where: {
          playerId: existing.playerId,
          type: { in: ["TopUp", "Charge"] },
        },
      })
    : 0;

  // Use transaction to ensure atomicity when deducting from fund
  return executeTransaction(async (tx) => {
    const settlement = await tx.settlement.update({
      where: { id: existing.id },
      data: { paid },
      include: {
        player: { select: { id: true, name: true, balance: true } },
        custom: { select: { id: true, name: true } },
        match: { select: { dateTime: true } },
      },
    });

    // If marking as paid and player exists, deduct from fund only if they've contributed before
    if (
      paid &&
      settlement.playerId &&
      settlement.player &&
      hasContributedToFund > 0
    ) {
      // Deduct the full settlement amount from player fund
      const deductAmount = settlement.amount;

      // Format match date as "dd/MM/yyyy"
      const matchDate = new Date(settlement.match.dateTime);
      const day = matchDate.getDate().toString().padStart(2, "0");
      const month = (matchDate.getMonth() + 1).toString().padStart(2, "0");
      const year = matchDate.getFullYear();
      const formattedDate = `${day}/${month}/${year}`;

      // Create charge transaction
      await tx.transaction.create({
        data: {
          playerId: settlement.playerId,
          matchId: matchId,
          type: "Charge",
          amount: -deductAmount, // negative for deduction
          note: `Trừ tiền sân ${formattedDate}`,
        },
      });

      // Update player balance (allow negative)
      await tx.player.update({
        where: { id: settlement.playerId },
        data: { balance: { decrement: deductAmount } },
      });
    }

    return { ...settlement, chargedToFund: paid && hasContributedToFund > 0 };
  });
}
