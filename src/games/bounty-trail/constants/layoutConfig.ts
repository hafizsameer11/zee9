/**
 * Scene-based layout — reels overlay the dark window in gameplay-scene.jpg (390×844).
 * All chrome (frame, multiplier bar, feature buy, table) is baked into the scene art.
 */
export const STAGE_W = 390
export const STAGE_H = 844

/** Top-left lobby / back control (matches reference video). */
export const BACK_X = 10
export const BACK_Y = 10
export const BACK_SIZE = 42

export const COLS = 6
export const VISIBLE_ROWS = 4

/** Reel window cut-out inside the illustrated frame. */
export const REEL_X = 54
export const REEL_Y = 276
export const COL_GAP = 1
export const ROW_GAP = 1
export const REEL_W = 282
export const SYMBOL_W = Math.floor((REEL_W - COL_GAP * (COLS - 1)) / COLS)
export const SYMBOL_H = 76
export const REEL_H = VISIBLE_ROWS * SYMBOL_H + (VISIBLE_ROWS - 1) * ROW_GAP

/** Multiplier chip centers on the scene's wooden sign (y≈118). */
export const MULT_Y = 108
export const MULT_H = 44
export const MULT_POSITIONS = [72, 130, 195, 260, 322] as const

/** Clickable feature-buy plaque baked into scene art. */
export const FEATURE_X = 302
export const FEATURE_Y = 348
export const FEATURE_W = 72
export const FEATURE_H = 175

export const WIN_Y = 598
export const WIN_H = 48

export const BAL_Y = 662
export const BAL_H = 46

export const CTRL_Y = 738
export const CTRL_H = 88
export const SPIN_SIZE = 80
export const CTRL_BTN = 50

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
