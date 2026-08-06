import crypto from 'node:crypto'

/**
 * Given natural expected return EV (as a fraction of bet, e.g. 1.8 = 180%)
 * and target winPct (0–100), return the probability of forcing a guaranteed
 * loss so realized RTP converges to winPct while every paid win is genuine.
 */
export function clampWinPct(winPct: number): number {
  return Math.max(0, Math.min(100, winPct))
}

export function targetRtpFraction(winPct: number): number {
  return clampWinPct(winPct) / 100
}

export function lossBias(naturalEv: number, winPct: number): number {
  const target = targetRtpFraction(winPct)
  if (naturalEv <= 0) return 1
  if (target >= naturalEv) return 0
  return Math.max(0, Math.min(1, 1 - target / naturalEv))
}

/** Forced-loss rate; at 100% admin winPct slots never force a dead spin. */
export function forcedLossRate(naturalEv: number, winPct: number): number {
  if (clampWinPct(winPct) >= 100) return 0
  return lossBias(naturalEv, winPct)
}

/**
 * At high admin winPct, replace zero-pay spins with a small win so the slider
 * feels like "players win more often", not just long-run RTP.
 */
export function highWinPctInjectRate(winPct: number): number {
  const pct = clampWinPct(winPct)
  if (pct >= 100) return 1
  if (pct < 90) return 0
  return (pct - 90) / 10
}

export function guaranteedSmallWinPayout(betRupees: number, winPct: number): number {
  const target = targetRtpFraction(winPct)
  return Math.round(betRupees * Math.max(0.1, target) * 100) / 100
}

/** Uniform [0, 1). */
export function unitRand(): number {
  return crypto.randomInt(0, 10_000_000) / 10_000_000
}

/** True with probability `p`. */
export function chance(p: number): boolean {
  return unitRand() < p
}

/** Inclusive integer in [min, max). */
export function randInt(min: number, max: number): number {
  if (max <= min) return min
  return crypto.randomInt(min, max)
}

export function pickWeighted<T>(items: readonly T[], weights: readonly number[]): T {
  const total = weights.reduce((a, w) => a + w, 0)
  let r = unitRand() * total
  for (let i = 0; i < items.length; i++) {
    r -= weights[i]!
    if (r <= 0) return items[i]!
  }
  return items[items.length - 1]!
}
