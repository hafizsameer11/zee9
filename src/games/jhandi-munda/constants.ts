import type { JhandiSymbol } from '../engines/dice'

/** Portrait canvas — reference 478×850 scaled to Bounty Trail shell. */
export const DESIGN_W = 390
export const DESIGN_H = 844

/**
 * Gold-framed felt table — measured from reference video (478×850 → 390×844).
 */
export const TABLE = {
  left: 10,
  top: 137,
  width: 370,
  height: 577,
} as const

/** Title band inside table top. */
export const TITLE = { top: 4, height: 34 } as const

/** Dice cup centered on upper felt. */
export const CUP = { top: 66, width: 68, height: 88 } as const

/** Player avatar row below cup. */
export const AVATAR_ROW = { top: 139, height: 48, pad: 8 } as const

/** 2×3 betting grid on lower felt (percent of TABLE box). */
export const BET_GRID = {
  left: 2,
  top: 34.3,
  width: 95,
  height: 58.4,
  gap: 5,
  cols: 3,
  rows: 2,
} as const

/** Where thrown dice land — upper felt between cup and grid. */
export const DICE_LAND = {
  left: 38,
  top: 248,
  width: 294,
  height: 90,
  cols: 3,
  rows: 2,
} as const

/** Reference dealer above table frame. */
export const DEALER = { left: 95, top: 0, width: 200 } as const

/** Alarm-clock timer overlapping frame left edge. */
export const TIMER = { left: 14, top: 146, size: 48 } as const

export const SYMBOL_ORDER: JhandiSymbol[] = ['club', 'crown', 'spade', 'diamond', 'flag', 'heart']

export const ZONE_BOX: Record<JhandiSymbol, { col: number; row: number }> = {
  club: { col: 0, row: 0 },
  crown: { col: 1, row: 0 },
  spade: { col: 2, row: 0 },
  diamond: { col: 0, row: 1 },
  flag: { col: 1, row: 1 },
  heart: { col: 2, row: 1 },
}

export const CHIP_AREA: Record<JhandiSymbol, { x0: number; x1: number; y0: number; y1: number }> = {
  club: { x0: 18, x1: 82, y0: 26, y1: 78 },
  crown: { x0: 18, x1: 82, y0: 26, y1: 78 },
  spade: { x0: 18, x1: 82, y0: 26, y1: 78 },
  diamond: { x0: 18, x1: 82, y0: 26, y1: 78 },
  flag: { x0: 18, x1: 82, y0: 26, y1: 78 },
  heart: { x0: 18, x1: 82, y0: 26, y1: 78 },
}

export const CHIP_VALUES = [10, 20, 50, 100, 200, 500, 1000] as const
export type ChipValue = (typeof CHIP_VALUES)[number]

export const ROUND_SEC = 15

export const PAYOUT_TABLE = [
  { matches: 1, mult: 2 },
  { matches: 2, mult: 3 },
  { matches: 3, mult: 4 },
  { matches: 4, mult: 5 },
  { matches: 5, mult: 6 },
  { matches: 6, mult: 7 },
] as const
