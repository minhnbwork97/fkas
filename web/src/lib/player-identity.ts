import { prisma } from "./prisma";

/**
 * Resolve the player behind a public request, the same way the match
 * payment page does: by phone directly, or via the approved device binding.
 */
export async function resolvePlayer(identity: {
  deviceId?: string | null;
  phone?: string | null;
}): Promise<{ id: string; name: string } | null> {
  const phone = identity.phone?.trim();
  if (phone) {
    return prisma.player.findFirst({
      where: { phone },
      select: { id: true, name: true },
    });
  }
  if (identity.deviceId) {
    const approved = await prisma.pendingRosterRequest.findFirst({
      where: { deviceId: identity.deviceId, status: "Approved" },
      orderBy: { createdAt: "desc" },
      select: { name: true, phone: true },
    });
    if (!approved) return null;
    return prisma.player.findFirst({
      where: { name: approved.name, phone: approved.phone },
      select: { id: true, name: true },
    });
  }
  return null;
}
