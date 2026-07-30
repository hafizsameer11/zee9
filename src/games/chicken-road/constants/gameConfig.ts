/** Chicken Road — design canvas, difficulties, bets, asset path helpers. */

export const BASE = '/games/chicken-road'
/** Cache-bust when swapping premium art packs. */
export const ASSET_VER = 'v4'

export const DESIGN_W = 896
export const DESIGN_H = 414

export const TOP_BAR_H = 40
export const CONTROL_BAR_H = 96
export const SCENE_H = DESIGN_H - TOP_BAR_H - CONTROL_BAR_H

/**
 * How many lane widths fit in the visible road strip.
 * Lower = longer scrollable path (more of the run stays off-screen).
 */
/** Fewer slots = longer road; ~3 lanes on screen, rest scrolled into view. */
export const VISIBLE_LANE_SLOTS = 3.0
/** Keep the chicken around this fraction of the screen width while scrolling. */
export const CAMERA_FOCUS_X = 0.26

/** Consistent on-screen sizes — never animate Pixi scale after setting width. */
export const CHICKEN_DISPLAY = 78
export const MARKER_DISPLAY = 48
export const VEHICLE_SCALE = 0.88
/** Soft squash/pulse only — applied on wrapper containers, never raw sprite scale. */
export const CHICKEN_SCALE_MIN = 0.96
export const CHICKEN_SCALE_MAX = 1.06
export const MARKER_PULSE_MAX = 1.18

export const MIN_BET = 10
export const MAX_BET = 5000
/** Full set for max-bet / menus. Bottom bar shows BAR_QUICK_BETS only (one row). */
export const QUICK_BETS = [
  10, 20, 30, 50, 100, 200, 300, 500, 700, 1000, 1500, 2000, 3000, 5000,
] as const
export const BAR_QUICK_BETS = [10, 20, 50, 100] as const
export type QuickBet = (typeof QUICK_BETS)[number]

export type DifficultyId = 'easy' | 'medium' | 'hard' | 'hardcore'

export type ChickenRoadGameState =
  | 'LOADING'
  | 'READY'
  | 'BETTING'
  | 'ROUND_STARTING'
  | 'WAITING_FOR_MOVE'
  | 'CHICKEN_MOVING'
  | 'LANE_CHECKING'
  | 'STEP_SUCCESS'
  | 'CASHING_OUT'
  | 'COLLISION'
  | 'WIN'
  | 'LOSS'
  | 'RESETTING'

export type DifficultyConfig = {
  id: DifficultyId
  label: string
  vehicleSpeed: number
  spawnInterval: number
  laneCount: number
  /** Base collision chance per step (rises with step index). */
  hazardRate: number
  multipliers: number[]
  icon: string
}

export const DIFFICULTIES: Record<DifficultyId, DifficultyConfig> = {
  easy: {
    id: 'easy',
    label: 'Easy',
    vehicleSpeed: 1.0,
    spawnInterval: 1.35,
    laneCount: 8,
    hazardRate: 0.07,
    multipliers: [1.02, 1.08, 1.18, 1.32, 1.52, 1.8, 2.2, 2.8],
    icon: `${BASE}/icons/difficulty-easy.png`,
  },
  medium: {
    id: 'medium',
    label: 'Medium',
    vehicleSpeed: 1.35,
    spawnInterval: 1.05,
    laneCount: 7,
    hazardRate: 0.12,
    multipliers: [1.05, 1.2, 1.45, 1.85, 2.5, 3.5, 5.0],
    icon: `${BASE}/icons/difficulty-medium.png`,
  },
  hard: {
    id: 'hard',
    label: 'Hard',
    vehicleSpeed: 1.75,
    spawnInterval: 0.82,
    laneCount: 6,
    hazardRate: 0.18,
    multipliers: [1.12, 1.4, 1.9, 2.8, 4.5, 8.0],
    icon: `${BASE}/icons/difficulty-hard.png`,
  },
  hardcore: {
    id: 'hardcore',
    label: 'Hardcore',
    vehicleSpeed: 2.2,
    spawnInterval: 0.62,
    laneCount: 5,
    hazardRate: 0.28,
    multipliers: [1.25, 1.8, 3.0, 6.0, 15.0],
    icon: `${BASE}/icons/difficulty-hardcore.png`,
  },
}

export const DIFFICULTY_ORDER: DifficultyId[] = ['easy', 'medium', 'hard', 'hardcore']

export const CHICKEN_FRAMES = [
  'idle',
  'idle2',
  'blink',
  'nervous',
  'nervous2',
  'prep',
  'jump',
  'jump2',
  'land',
  'success',
  'celebrate',
  'celebrate2',
  'hit',
  'dizzy',
] as const
export type ChickenFrame = (typeof CHICKEN_FRAMES)[number]

export const VEHICLE_KINDS = [
  'compact',
  'sedan',
  'taxi',
  'sports',
  'van',
  'pickup',
  'bus',
  'truck',
  'emergency',
  'luxury',
] as const
export type VehicleKind = (typeof VEHICLE_KINDS)[number]

/**
 * Texture facing: true = nose toward bottom of PNG (travel +Y with rotation 0).
 * Sports/taxi/pickup/luxury art points the other way.
 */
export const VEHICLE_FACE_DOWN: Record<VehicleKind, boolean> = {
  compact: true,
  sedan: true,
  taxi: false,
  sports: false,
  van: true,
  pickup: false,
  bus: true,
  truck: true,
  emergency: true,
  luxury: false,
}

/** Prefer these for ambient traffic — cleaner art / proportions. */
export const VEHICLE_TRAFFIC_POOL: VehicleKind[] = [
  'sedan',
  'compact',
  'taxi',
  'sports',
  'van',
  'pickup',
  'bus',
  'truck',
]

export const MOVE_ANIM_MS = 680
export const COLLISION_ANIM_MS = 1400
export const STEP_SUCCESS_HOLD_MS = 420
export const WIN_HOLD_MS = 2800
export const LOSS_HOLD_MS = 2400
export const RESET_HOLD_MS = 600

export const ASSET = {
  base: BASE,
  chicken: (frame: ChickenFrame | 'shadow') => `${BASE}/chicken/${frame}.png?${ASSET_VER}`,
  vehicle: (kind: VehicleKind, alt = false) =>
    `${BASE}/vehicles/${kind}${alt ? '-alt' : ''}.png?${ASSET_VER}`,
  road: (name: 'asphalt' | 'edge' | 'lane-mark' | 'pavement') =>
    `${BASE}/road/${name}.png?${ASSET_VER}`,
  env: (name: string) => `${BASE}/environment/${name}.png?${ASSET_VER}`,
  effect: (name: string) => `${BASE}/effects/${name}.png?${ASSET_VER}`,
  multiplier: (state: 'locked' | 'upcoming' | 'current' | 'completed' | 'failed') =>
    `${BASE}/multipliers/${state}.png?${ASSET_VER}`,
  control: (name: 'play-btn' | 'play-btn-disabled' | 'cashout-btn') =>
    `${BASE}/controls/${name}.png?${ASSET_VER}`,
  icon: (name: string) => `${BASE}/icons/${name}.png?${ASSET_VER}`,
  loading: (name: string) => `${BASE}/loading/${name}.png?${ASSET_VER}`,
  sound: (name: string) => `${BASE}/sounds/${name}.wav?${ASSET_VER}`,
} as const

export function clampBet(value: number, balance = Infinity): number {
  const n = Math.round(Number(value) || 0)
  const capped = Math.max(MIN_BET, Math.min(MAX_BET, Math.min(balance, n)))
  let best: number = QUICK_BETS[0]!
  let bestDist = Math.abs(best - capped)
  for (const step of QUICK_BETS) {
    if (step > balance) break
    const d = Math.abs(step - capped)
    if (d < bestDist) {
      best = step
      bestDist = d
    }
  }
  return best
}

export function stepBet(current: number, dir: 1 | -1): number {
  const idx = QUICK_BETS.findIndex((s) => s >= current)
  const i = idx === -1 ? QUICK_BETS.length - 1 : idx
  if (dir > 0) {
    if (QUICK_BETS[i]! > current) return QUICK_BETS[i]!
    return QUICK_BETS[Math.min(QUICK_BETS.length - 1, i + 1)]!
  }
  if (QUICK_BETS[i]! > current) return QUICK_BETS[Math.max(0, i - 1)]!
  return QUICK_BETS[Math.max(0, i - 1)]!
}

export function formatMoney(n: number): string {
  if (!Number.isFinite(n)) return '0'
  return (Math.round(n * 100) / 100).toLocaleString(undefined, {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  })
}

export function formatMult(n: number): string {
  if (!Number.isFinite(n) || n <= 0) return '1.00x'
  return `${n.toFixed(n >= 10 ? 1 : 2)}x`
}
