import crypto from 'node:crypto'

/** Pick a slot index biased toward lower house payout when winPct is low. */
export function pickExposureSlot(winPct: number, exposureBySlot: number[]): number {
  const n = exposureBySlot.length
  if (n <= 0) return 0
  const pct = Math.max(0, Math.min(100, winPct))
  const house = 1 - pct / 100
  const maxExp = Math.max(...exposureBySlot, 1)
  const weights = exposureBySlot.map((exp) => {
    const norm = exp / maxExp
    const penalty = norm * (0.12 + house * 1.2)
    return Math.max(0.04, 1 - penalty)
  })
  const total = weights.reduce((a, b) => a + b, 0)
  let r = (crypto.randomInt(0, 10_000) / 10_000) * total
  for (let i = 0; i < n; i++) {
    r -= weights[i]!
    if (r <= 0) return i
  }
  return crypto.randomInt(0, n)
}
