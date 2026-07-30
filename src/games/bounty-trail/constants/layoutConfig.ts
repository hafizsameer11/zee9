/**
 * Fixed 390×844 design canvas — absolute packing, no flex-grow empty gaps.
 * Reels dominate ~14%–58% of height; controls sit on the table deck.
 */
export const STAGE_W = 390
export const STAGE_H = 844

export const COLS = 6
export const VISIBLE_ROWS = 4

/** Absolute band tops / heights (design px). */
export const BAND = {
  menuY: 4,
  menuH: 44,
  logoY: 2,
  logoH: 40,
  multY: 40,
  multH: 64,
  reelY: 96,
  statusY: 514,
  statusH: 36,
  balY: 552,
  balH: 54,
  ctrlY: 608,
  ctrlH: 100,
  /** Foreground / table starts under balance and fills to bottom. */
  foreY: 560,
  deckY: 598,
  deckH: 120,
} as const

/** Machine ~92% canvas width; Feature Buy overlaps the right edge. */
export const MACHINE_W = 358
export const MACHINE_X = Math.round((STAGE_W - MACHINE_W) / 2) - 8
export const FRAME_INSET = 11
export const COL_GAP = 1
export const ROW_GAP = 1

export const REEL_INNER_W = MACHINE_W - FRAME_INSET * 2
export const SYMBOL_W = Math.floor((REEL_INNER_W - COL_GAP * (COLS - 1)) / COLS)
/** Tall cells — characters dominate the viewport (~55×98 at 390 canvas). */
export const SYMBOL_H = 98

export const REEL_VIEWPORT_H =
  VISIBLE_ROWS * SYMBOL_H + (VISIBLE_ROWS - 1) * ROW_GAP

export const MACHINE_H = REEL_VIEWPORT_H + FRAME_INSET * 2

export const FEATURE_W = 78
export const FEATURE_H = 228
export const FEATURE_X = STAGE_W - FEATURE_W - 0
export const FEATURE_Y = BAND.reelY + Math.floor(MACHINE_H * 0.22)

export const SPIN_SIZE = 76
export const CTRL_BTN = 46

export function isDebugTransparency(): boolean {
  try {
    return new URLSearchParams(window.location.search).get('btDebug') === '1'
  } catch {
    return false
  }
}

export function isDebugLayout(): boolean {
  try {
    return new URLSearchParams(window.location.search).get('btLayout') === '1'
  } catch {
    return false
  }
}
