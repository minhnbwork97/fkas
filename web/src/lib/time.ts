// Asia/Ho_Chi_Minh helpers
export function nowInVietnam(): Date {
  return new Date();
}

export function isBeforeCutoff(date: Date, cutoffHour: number, cutoffMinute: number): boolean {
  const d = new Date(date);
  d.setHours(cutoffHour, cutoffMinute, 0, 0);
  return new Date() < d;
}
