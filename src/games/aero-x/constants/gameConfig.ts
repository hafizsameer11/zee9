/** AeroX — original premium crash prototype config. */

export const BASE = '/games/aero-x'
export const ASSET_VER = 'v4-flyx'

export const DESIGN_W = 896
export const DESIGN_H = 414

export const HEADER_H = 34
export const HISTORY_H = 26
export const BET_PANEL_H = 130
export const ARENA_H = DESIGN_H - HEADER_H - HISTORY_H - BET_PANEL_H

/** On-screen character display size (design px). */
export const CHAR_DISPLAY = 100

export const MIN_BET = 10
export const MAX_BET = 10000
export const BET_STEPS = [10, 20, 50, 100, 200, 500, 1000, 2000, 5000, 10000] as const
export const QUICK_BETS = BET_STEPS

export const WAIT_MS = 5200
export const RESULT_HOLD_MS = 2800
export const LAUNCH_MS = 700

export const CRASH_GROWTH = 0.00006

export type RoundPhase = 'loading' | 'waiting' | 'launching' | 'flying' | 'flewAway'

export type SlotPhase = 'idle' | 'pending' | 'active' | 'cashed' | 'lost'

export type CharPose = 'idle' | 'prep' | 'run' | 'fly' | 'accel' | 'away'

export function asset(path: string) {
  return `${BASE}/${path}?v=${ASSET_VER}`
}

export function clampBet(n: number) {
  const v = Math.round(n)
  const idx = BET_STEPS.findIndex((s) => s >= v)
  if (idx === -1) return MAX_BET
  if (BET_STEPS[idx] === v) return v
  if (idx === 0) return MIN_BET
  const lo = BET_STEPS[idx - 1]
  const hi = BET_STEPS[idx]
  return v - lo <= hi - v ? lo : hi
}

export function stepBet(current: number, delta: number) {
  const idx = BET_STEPS.findIndex((s) => s >= current)
  const i = idx === -1 ? BET_STEPS.length - 1 : idx
  if (delta > 0) {
    if (BET_STEPS[i] > current) return BET_STEPS[i]
    return BET_STEPS[Math.min(BET_STEPS.length - 1, i + 1)]
  }
  if (BET_STEPS[i] > current) return BET_STEPS[Math.max(0, i - 1)]
  return BET_STEPS[Math.max(0, i - 1)]
}

export function generateCrashPoint(): number {
  const r = Math.random()
  // Soft floor so rounds rarely die at exactly 1.00x during the takeoff beat
  if (r < 0.04) return Math.floor((1.05 + Math.random() * 0.2) * 100) / 100
  if (r < 0.42) return Math.floor((1.25 + Math.random() * 1.6) * 100) / 100
  if (r < 0.72) return Math.floor((2 + Math.random() * 4) * 100) / 100
  if (r < 0.9) return Math.floor((5 + Math.random() * 12) * 100) / 100
  const point = 0.99 / (1 - Math.random() * 0.96)
  return Math.min(Math.max(1.1, Math.floor(point * 100) / 100), 80)
}

export function multAt(elapsedMs: number, growth = CRASH_GROWTH): number {
  return Math.exp(growth * Math.max(0, elapsedMs))
}

export function multDiscrete(elapsedMs: number, growth = CRASH_GROWTH): number {
  return Math.floor(multAt(elapsedMs, growth) * 100) / 100
}

export function historyTone(m: number): 'cyan' | 'violet' | 'pink' | 'accent' {
  if (m < 2) return 'cyan'
  if (m < 5) return 'violet'
  if (m < 20) return 'pink'
  return 'accent'
}

export function formatRs(n: number, digits = 2) {
  return `Rs${n.toLocaleString('en-PK', {
    minimumFractionDigits: digits,
    maximumFractionDigits: digits,
  })}`
}
