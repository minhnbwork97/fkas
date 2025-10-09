export type LogEvent = {
  action: string;
  matchId?: string;
  playerId?: string;
  outcome?: 'ok' | 'error';
  latencyMs?: number;
  note?: string;
};

export function log(event: LogEvent): void {
  // Minimal structured log to stdout
  console.log(JSON.stringify({ ts: new Date().toISOString(), ...event }));
}
