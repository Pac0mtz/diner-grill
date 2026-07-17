export function formatCents(cents: number): string {
  return "$" + (cents / 100).toFixed(2);
}

/** "10.75" | 10.75 → 1075. Returns null when unparseable. */
export function dollarsToCents(value: string | number): number | null {
  const n = typeof value === "string" ? parseFloat(value.replace(/^\$/, "").trim()) : value;
  if (!Number.isFinite(n) || n < 0) return null;
  return Math.round(n * 100);
}

/** Chicago combined restaurant tax rate — mirrors server/db.js TAX_RATE. */
export const TAX_RATE = 0.1025;
