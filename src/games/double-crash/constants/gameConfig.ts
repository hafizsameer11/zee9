/** Double Crash — premium dual-bet space crash. */

export const BASE = '/games/double-crash'
export const ASSET_VER = 'v1-dc'

export const DESIGN_W = 896
export const DESIGN_H = 414

/** Layout — match S9 density: compact chrome, open flight stage. */
export const HEADER_H = 38
export const HISTORY_H = 22
export const BET_PANEL_H = 118
export const SIDEBAR_W = 158
export const ARENA_H = DESIGN_H - HEADER_H - HISTORY_H - BET_PANEL_H

/** Compact rocket like S9 (~42–50px wide). */
export const ROCKET_DISPLAY = 46

export const MIN_BET = 10
export const MAX_BET = 10000
export const BET_STEPS = [10, 20, 50, 100, 500, 700, 1000, 2000, 5000, 10000] as const
export const QUICK_BETS = BET_STEPS

export const WAIT_MS = 5000
export const RESULT_HOLD_MS = 2800
export const LAUNCH_MS = 850

export const CRASH_GROWTH = 0.00006

/** History pills shown at once (avoid overcrowding). */
export const HISTORY_VISIBLE = 9

export type RoundPhase = 'loading' | 'waiting' | 'launching' | 'flying' | 'flewAway'

export type SlotPhase = 'idle' | 'pending' | 'active' | 'cashed' | 'lost'

export type RocketPose =
  | 'idle'
  | 'prep'
  | 'ignition'
  | 'takeoff'
  | 'fly'
  | 'accel'
  | 'away'

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

/** Match reference: low=pink, mid=cyan, high=violet, exceptional=gold */
export function historyTone(m: number): 'pink' | 'cyan' | 'violet' | 'gold' {
  if (m < 2) return 'pink'
  if (m < 5) return 'cyan'
  if (m < 10) return 'violet'
  return 'gold'
}

export function formatRs(n: number, digits = 2) {
  return `Rs${n.toLocaleString('en-PK', {
    minimumFractionDigits: digits,
    maximumFractionDigits: digits,
  })}`
}

export function formatNum(n: number, digits = 0) {
  return n.toLocaleString('en-PK', {
    minimumFractionDigits: digits,
    maximumFractionDigits: digits,
  })
}

export const FAKE_NAMES = [
  'NovaKid',
  'OrbitRex',
  'CyanFox',
  'VioletAce',
  'StarMint',
  'Nebula9',
  'QuarkLee',
  'AstroJin',
  'PulseKai',
  'LunaDex',
  'CometAri',
  'ZephyrX',
] as const
