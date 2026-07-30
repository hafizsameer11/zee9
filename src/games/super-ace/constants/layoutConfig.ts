/**
 * Portrait canvas tuned to Super Ace reference proportions.
 * Dense 5×5 board, compact logo + combo bar, control ring around spin.
 */
export const STAGE_W = 390
export const STAGE_H = 844

export const COLS = 5
export const ROWS = 5

export const BAND = {
  logoY: 10,
  logoH: 40,
  multY: 48,
  multH: 36,
  boardY: 96,
  buyBonusY: 8,
  winY: 0, // computed from board
  ctrlY: 668,
  ctrlH: 110,
  deckY: 630,
  deckH: 150,
} as const

export const MACHINE_W = 368
export const MACHINE_X = Math.round((STAGE_W - MACHINE_W) / 2)
export const FRAME_INSET = 8
export const COL_GAP = 3
export const ROW_GAP = 3

export const REEL_INNER_W = MACHINE_W - FRAME_INSET * 2
export const SYMBOL_W = Math.floor((REEL_INNER_W - COL_GAP * (COLS - 1)) / COLS)
/** Taller cards — fill board like reference. */
export const SYMBOL_H = 90

export const REEL_VIEWPORT_H = ROWS * SYMBOL_H + (ROWS - 1) * ROW_GAP
export const MACHINE_H = REEL_VIEWPORT_H + FRAME_INSET * 2

export const LOGO_W = 200
export const LOGO_H = 40
export const LOGO_X = Math.round((STAGE_W - LOGO_W) / 2)

export const MULT_BAR_W = 268
export const MULT_BAR_H = 32
export const MULT_BAR_X = Math.round((STAGE_W - MULT_BAR_W) / 2)

export const BUY_BONUS_SIZE = 58
export const BUY_BONUS_X = STAGE_W - BUY_BONUS_SIZE - 6

export const SPIN_SIZE = 92
export const CTRL_BTN = 42

export const LEFT_STRIP_X = 4
export const LEFT_STRIP_Y = 220

export function cellIndex(col: number, row: number): number {
  return row * COLS + col
}

export function cellCol(index: number): number {
  return index % COLS
}

export function cellRow(index: number): number {
  return Math.floor(index / COLS)
}
