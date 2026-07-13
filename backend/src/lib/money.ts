/**
 * Money is stored as BIGINT minor units (paisa). 100.00 PKR === 10000n.
 * Never use floating point for money math.
 */

export const PAISA = 100n

/** Convert a rupee number (from API input) to paisa bigint. */
export function toPaisa(rupees: number | string): bigint {
  const n = typeof rupees === 'string' ? Number(rupees) : rupees
  if (!Number.isFinite(n)) throw new Error('Invalid amount')
  // round to 2 decimals to avoid float dust, then to paisa
  return BigInt(Math.round(n * 100))
}

/** Convert paisa bigint to a rupee number for API output. */
export function toRupees(paisa: bigint): number {
  return Number(paisa) / 100
}

/** Apply a basis-point rate (e.g. 3000 bps = 30%) to a paisa amount. */
export function applyBps(amount: bigint, bps: number): bigint {
  return (amount * BigInt(Math.round(bps))) / 10000n
}

/** Apply a percentage (e.g. 20 = 20%) to a paisa amount. */
export function applyPct(amount: bigint, pct: number): bigint {
  return (amount * BigInt(Math.round(pct * 100))) / 10000n
}

/** JSON-safe serialization: turn bigints into numbers (rupees stay paisa here — caller decides). */
export function serializeBigInts<T>(value: T): T {
  return JSON.parse(JSON.stringify(value, (_k, v) => (typeof v === 'bigint' ? Number(v) : v)))
}
