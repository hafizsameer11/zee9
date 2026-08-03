import type { UpDownChoice } from '../engines/dice'

/** Design canvas — matches the shared 896×414 landscape game frame. */
export const DESIGN_W = 896
export const DESIGN_H = 414

/**
 * Table art is 1474×779. It is placed wider than the canvas is tall so the
 * felt fills the play area; the lower rail slides behind the bottom bar.
 */
export const TABLE = {
  left: 28,
  top: 4,
  width: 840,
  height: Math.round((840 * 779) / 1474),
} as const

/** Playable felt inside the table art, as a fraction of the table image. */
const FELT_PCT = { left: 0.1295, top: 0.208, width: 0.741, height: 0.474 }

export const FELT = {
  left: Math.round(TABLE.left + FELT_PCT.left * TABLE.width),
  top: Math.round(TABLE.top + FELT_PCT.top * TABLE.height),
  width: Math.round(FELT_PCT.width * TABLE.width),
  height: Math.round(FELT_PCT.height * TABLE.height),
} as const

/**
 * Zone plate placement as a percentage of the felt box. Measured from the
 * original Super9 overlay so the trapezoids match the table's perspective.
 */
export const ZONE_BOX: Record<UpDownChoice, { left: number; top: number; width: number; height: number }> = {
  down: { left: 0.948, top: 3.161, width: 35.829, height: 93.966 },
  seven: { left: 37.156, top: 19.828, width: 25.687, height: 77.299 },
  up: { left: 63.223, top: 3.161, width: 35.924, height: 93.966 },
}

/** Region inside each plate that stays clear of the trapezoid's sloped edges. */
export const CHIP_AREA: Record<UpDownChoice, { x0: number; x1: number; y0: number; y1: number }> = {
  down: { x0: 22, x1: 80, y0: 30, y1: 88 },
  seven: { x0: 18, x1: 82, y0: 32, y1: 88 },
  up: { x0: 20, x1: 78, y0: 30, y1: 88 },
}

export const ZONES: {
  id: UpDownChoice
  label: string
  range: string
  mult: number
  sums: number[]
}[] = [
  { id: 'down', label: 'DOWN', range: '2 – 6', mult: 2, sums: [2, 3, 4, 5, 6] },
  { id: 'seven', label: 'LUCKY', range: '7', mult: 5, sums: [7] },
  { id: 'up', label: 'UP', range: '8 – 12', mult: 2, sums: [8, 9, 10, 11, 12] },
]

export const CHIP_VALUES = [10, 50, 100, 500, 1000, 2000, 5000, 10000] as const
export type ChipValue = (typeof CHIP_VALUES)[number]

/** Betting window length used for the countdown ring (server is authoritative). */
export const ROUND_SEC = 12

/** Six visible seats around the table, three per side. */
export const SEAT_SLOTS = 6
