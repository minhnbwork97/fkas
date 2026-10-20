export function assertAdmin(pin: string | undefined, provided: string | undefined): void {
  if (!pin) throw new Error('ADMIN_PIN not configured');
  if (!provided || provided !== pin) throw new Error('Unauthorized');
}

/** Route helper: returns an error response when the PIN is missing or wrong, else null */
export function adminPinError(provided: string | null | undefined): { error: string; status: number } | null {
  if (!provided) return { error: 'Admin PIN required', status: 401 };
  try {
    assertAdmin(process.env.ADMIN_PIN, provided);
  } catch {
    return { error: 'Invalid admin PIN', status: 403 };
  }
  return null;
}
