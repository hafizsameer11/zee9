/** Money Coming — client spin helpers (backend later). */

export const MC_NUMBERS = [0, 1, 2, 3, 5, 10] as const
export type McNumber = (typeof MC_NUMBERS)[number]

export const MC_MULTS = ['—', '2x', '5x', '10x', 'RESPIN'] as const
export type McMult = (typeof MC_MULTS)[number]

export const MC_BET_STEPS = [10, 20, 50, 100, 200, 500, 1000, 2000, 5000]

export const WHEEL_VALUES = [50, 100, 150, 200, 300, 500, 1000, 2000]

export function randomNumber(): McNumber {
  return MC_NUMBERS[Math.floor(Math.random() * MC_NUMBERS.length)]!
}

export function randomMult(): McMult {
  const r = Math.random()
  if (r < 0.45) return '—'
  if (r < 0.7) return '2x'
  if (r < 0.88) return '5x'
  if (r < 0.97) return '10x'
  return 'RESPIN'
}

export function multFactor(m: McMult): number {
  if (m === '2x') return 2
  if (m === '5x') return 5
  if (m === '10x') return 10
  return 1
}

/** Simple payout: 3-of-a-kind pays number×bet (0 pays 0.5×), then × multiplier reel. */
export function evaluateSpin(
  reels: [McNumber, McNumber, McNumber],
  mult: McMult,
  bet: number,
): { win: number; kind: 'none' | 'match' | 'respin' } {
  if (mult === 'RESPIN') return { win: 0, kind: 'respin' }
  const [a, b, c] = reels
  if (a === b && b === c) {
    const base = a === 0 ? bet * 0.5 : bet * Math.max(1, a)
    return { win: Math.round(base * multFactor(mult)), kind: 'match' }
  }
  // two match soft pay
  if (a === b || b === c || a === c) {
    const n = a === b ? a : b === c ? b : a
    const base = n === 0 ? bet * 0.1 : bet * 0.25 * Math.max(1, n)
    return { win: Math.round(base * multFactor(mult)), kind: 'match' }
  }
  return { win: 0, kind: 'none' }
}

export function buildReelStrip(len = 24): McNumber[] {
  return Array.from({ length: len }, () => randomNumber())
}

export function buildMultStrip(len = 20): McMult[] {
  return Array.from({ length: len }, () => randomMult())
}
