/** Portrait 390×844 — wedding stage hierarchy matching reference. */
export const STAGE_W = 390
export const STAGE_H = 844

export const COLS = 5
export const VISIBLE_ROWS = 3

/** Absolute bands (design px). */
export const BAND = {
  heroY: 0,
  heroH: 280,
  bannerY: 274,
  bannerH: 40,
  reelY: 314,
  infoY: 628,
  infoH: 34,
  ctrlY: 660,
  ctrlH: 108,
  deckY: 652,
  deckH: 192,
} as const

export const MACHINE_W = 368
export const MACHINE_X = Math.round((STAGE_W - MACHINE_W) / 2)
export const FRAME_INSET = 10
export const COL_GAP = 2
export const ROW_GAP = 2

export const REEL_INNER_W = MACHINE_W - FRAME_INSET * 2
export const SYMBOL_W = Math.floor((REEL_INNER_W - COL_GAP * (COLS - 1)) / COLS)
export const SYMBOL_H = 92

export const REEL_VIEWPORT_H = VISIBLE_ROWS * SYMBOL_H + (VISIBLE_ROWS - 1) * ROW_GAP
export const MACHINE_H = REEL_VIEWPORT_H + FRAME_INSET * 2

/** Dual reel board during free spins (slightly compacted). */
export const FS_SYMBOL_H = 52
export const FS_MACHINE_H = VISIBLE_ROWS * FS_SYMBOL_H + (VISIBLE_ROWS - 1) * ROW_GAP + FRAME_INSET * 2

export const SPIN_SIZE = 84
export const CTRL_BTN = 48
