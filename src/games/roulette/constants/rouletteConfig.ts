/** European roulette configuration — demo-safe, backend-ready. */

export const EUROPEAN_WHEEL_ORDER = [
  0, 32, 15, 19, 4, 21, 2, 25, 17, 34, 6, 27, 13, 36, 11, 30, 8, 23, 10, 5, 24,
  16, 33, 1, 20, 14, 31, 9, 22, 18, 29, 7, 28, 12, 35, 3, 26,
] as const

export const RED_NUMBERS = new Set([
  1, 3, 5, 7, 9, 12, 14, 16, 18, 19, 21, 23, 25, 27, 30, 32, 34, 36,
])

export const BLACK_NUMBERS = new Set([
  2, 4, 6, 8, 10, 11, 13, 15, 17, 20, 22, 24, 26, 28, 29, 31, 33, 35,
])

export const POCKET_COUNT = 37
export const POCKET_ANGLE = 360 / POCKET_COUNT

/** Degrees from wheel top (pointer) clockwise to pocket center for a number at rest (rotor=0). */
export function pocketCenterAngle(number: number): number {
  const idx = (EUROPEAN_WHEEL_ORDER as readonly number[]).indexOf(number)
  if (idx < 0) return 0
  return idx * POCKET_ANGLE + POCKET_ANGLE / 2
}

export type RouletteGameState =
  | 'LOADING'
  | 'BETTING_OPEN'
  | 'BETTING_CLOSING'
  | 'SPINNING'
  | 'RESULT'
  | 'PAYOUT'
  | 'RESETTING'

export type BetType =
  | 'straight'
  | 'red'
  | 'black'
  | 'odd'
  | 'even'
  | 'low'
  | 'high'
  | 'dozen'
  | 'column'

export type BetSelection = number | 'red' | 'black' | 'odd' | 'even' | 'low' | 'high' | 1 | 2 | 3

export type RouletteBet = {
  id: string
  type: BetType
  selection: BetSelection
  /** Board cell key used for stacking UI */
  cellKey: string
  amount: number
  chipValue: number
  createdAt: number
}

/** Net odds — stake is returned on top of this when winning. */
export const PAYOUT_MULTIPLIERS: Record<BetType, number> = {
  straight: 35,
  red: 1,
  black: 1,
  odd: 1,
  even: 1,
  low: 1,
  high: 1,
  dozen: 2,
  column: 2,
}

export const CHIP_VALUES = [50, 100, 500, 1000, 2000, 5000, 10000] as const
export type ChipValue = (typeof CHIP_VALUES)[number]

export const BETTING_SECONDS = 15
export const BETTING_CLOSING_SECONDS = 3
export const RESULT_HOLD_MS = 2200
export const PAYOUT_HOLD_MS = 1800
export const RESET_HOLD_MS = 600
export const SPIN_DURATION_MS = 7200

export const HISTORY_LIMIT = 14

export const ASSET = {
  casing: '/games/roulette/wheel/casing-premium.png',
  casingLegacy: '/games/roulette/wheel/casing.png',
  rotor: '/games/roulette/wheel/rotor.png',
  spindle: '/games/roulette/wheel/spindle.png',
  ball: '/games/roulette/wheel/ball.png',
  pointer: '/games/roulette/wheel/pointer.png',
  emblem: '/games/roulette/wheel/emblem.png',
  felt: '/games/roulette/backgrounds/felt-premium.jpg',
  spotlight: '/games/roulette/effects/spotlight.png',
  vignette: '/games/roulette/effects/vignette.png',
  goldGleam: '/games/roulette/effects/gold-gleam.png',
  winFrame: '/games/roulette/effects/win-frame.png',
  particleGold: '/games/roulette/effects/particle-gold.png',
  particleLight: '/games/roulette/effects/particle-light.png',
  divider: '/games/roulette/effects/divider.png',
  chip: (v: number, sm = false) => `/games/roulette/chips/chip-${v}${sm ? '-sm' : ''}.png`,
  icon: (name: string) => `/games/roulette/icons/${name}.png`,
} as const

export const CRITICAL_ASSETS = [
  ASSET.casing,
  ASSET.spindle,
  ASSET.ball,
  ASSET.pointer,
  ASSET.felt,
  ASSET.spotlight,
  ASSET.emblem,
  ...CHIP_VALUES.map((v) => ASSET.chip(v)),
  ...CHIP_VALUES.map((v) => ASSET.chip(v, true)),
]
