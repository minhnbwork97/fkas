import { redirect } from "next/navigation";
import { MatchAttendance } from "./match-detail-page";
import { prisma } from "@/src/lib/prisma";

export default async function MatchPage({
  params,
}: {
  params: Promise<{ matchId: string }>;
}) {
  const { matchId } = await params;

  const match = await prisma.match.findUnique({
    where: { id: matchId },
    select: { status: true },
  });
  if (match?.status === "Settled") {
    redirect(`/m/${matchId}/payment`);
  }

  return <MatchAttendance />;
}
