export function assertAdmin(pin: string | undefined, provided: string | undefined): void {
  if (!pin) throw new Error('ADMIN_PIN not configured');
  if (!provided || provided !== pin) throw new Error('Unauthorized');
}
