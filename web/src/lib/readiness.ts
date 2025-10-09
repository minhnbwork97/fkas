export type ReadinessInput = {
  type: "Internal" | "VsTeam";
  confirmedPlayers: number;
  guestCounts: number[]; // guests per player
};

export function computeTotals(input: ReadinessInput): {
  confirmed: number;
  guests: number;
  totalConfirmed: number;
  minRequired: number;
  ready: boolean;
} {
  const guests = input.guestCounts.reduce((a, b) => a + b, 0);
  const totalConfirmed = input.confirmedPlayers + guests;
  const minRequired = input.type === "Internal" ? 14 : 7;
  return {
    confirmed: input.confirmedPlayers,
    guests: guests,
    totalConfirmed,
    minRequired,
    ready: totalConfirmed >= minRequired,
  };
}
