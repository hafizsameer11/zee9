import type { GemsSymbol } from '../engines/fortuneGems'

const BASE = '/games/fortune-gems'

export const FG_ASSETS = {
  symbols: `${BASE}/symbols.png`,
  bgPlay: `${BASE}/bg-play.png`,
  /** 3-panel tutorial strip (1400×314) */
  bgIntroStrip: `${BASE}/bg-intro.png`,
  uiAtlas: `${BASE}/ui-atlas.png`,
  uiAtlas2: `${BASE}/ui-atlas2.png`,
  frameSlot: `${BASE}/frame-slot.png`,
} as const

export const INTRO_PANEL_COUNT = 3
export const INTRO_STRIP_W = 1400
export const INTRO_STRIP_H = 314

export const DESIGN_CANVAS_W = 896
export const DESIGN_CANVAS_H = 414

/** UI atlas 123fa15c9 */
export const UI_ATLAS_W = 819
export const UI_ATLAS_H = 1009

export const UI_SPRITES = {
  btnGreen: { x: 3, y: 635, w: 208, h: 65 },
  btnSpin: { x: 370, y: 725, w: 131, h: 132 },
  btnAuto: { x: 686, y: 145, w: 128, h: 121 },
  btnTurbo: { x: 686, y: 757, w: 58, h: 56 },
  logo: { x: 245, y: 433, w: 282, h: 59 },
  betPanel: { x: 296, y: 773, w: 131, h: 59 },
  reelPanel: { x: 3, y: 3, w: 344, h: 424 },
  winMultLabel: { x: 507, y: 725, w: 137, h: 48 },
  btnBack: { x: 3, y: 667, w: 80, h: 83 },
  btnMenu: { x: 686, y: 685, w: 65, h: 66 },
  footerBar: { x: 569, y: 3, w: 918, h: 111 },
} as const

/** Reel area inside frame-slot.png (1161×720) — percentages */
export const FG_FRAME = {
  reelLeft: 7.3,
  reelTop: 13.2,
  reelWidth: 50.4,
  reelHeight: 65.3,
  multLeft: 58.2,
  multWidth: 12,
  multTopStart: 14,
  multStep: 11.8,
  multHeight: 9.5,
} as const

export const SYMBOL_ATLAS_W = 512
export const SYMBOL_ATLAS_H = 1024

export const SYMBOL_SPRITES: Record<string, { x: number; y: number; w: number; h: number }> = {
  Symbol_00: { x: 2, y: 532, w: 198, h: 162 },
  Symbol_01: { x: 202, y: 494, w: 198, h: 162 },
  Symbol_02: { x: 2, y: 368, w: 198, h: 162 },
  Symbol_03: { x: 202, y: 330, w: 198, h: 162 },
  Symbol_04: { x: 2, y: 204, w: 198, h: 162 },
  Symbol_05: { x: 228, y: 166, w: 198, h: 162 },
  Symbol_06: { x: 228, y: 2, w: 198, h: 162 },
  Symbol_07: { x: 2, y: 2, w: 224, h: 200 },
  Symbol_08: { x: 286, y: 803, w: 142, h: 141 },
  Symbol_09: { x: 348, y: 658, w: 143, h: 144 },
  Symbol_10: { x: 143, y: 837, w: 142, h: 141 },
  Symbol_11: { x: 2, y: 837, w: 139, h: 143 },
  Symbol_12: { x: 202, y: 658, w: 144, h: 143 },
  Symbol_13: { x: 2, y: 696, w: 143, h: 139 },
}

const SYMBOL_KEY: Record<GemsSymbol, string> = {
  wild: 'Symbol_07',
  green: 'Symbol_03',
  red: 'Symbol_04',
  blue: 'Symbol_05',
  A: 'Symbol_06',
  K: 'Symbol_02',
  Q: 'Symbol_08',
  J: 'Symbol_09',
}

export function spriteForSymbol(symbol: GemsSymbol) {
  return SYMBOL_SPRITES[SYMBOL_KEY[symbol]] ?? SYMBOL_SPRITES.Symbol_07
}

export function spriteStyle(sprite: { x: number; y: number; w: number; h: number }, displayH: number) {
  const scale = displayH / sprite.h
  const displayW = sprite.w * scale
  return {
    width: displayW,
    height: displayH,
    backgroundImage: `url(${FG_ASSETS.symbols})`,
    backgroundSize: `${SYMBOL_ATLAS_W * scale}px ${SYMBOL_ATLAS_H * scale}px`,
    backgroundPosition: `${-sprite.x * scale}px ${-sprite.y * scale}px`,
    backgroundRepeat: 'no-repeat',
  } as const
}

export function uiSpriteStyle(sprite: { x: number; y: number; w: number; h: number }, displayH: number) {
  const scale = displayH / sprite.h
  const displayW = sprite.w * scale
  return {
    width: displayW,
    height: displayH,
    backgroundImage: `url(${FG_ASSETS.uiAtlas})`,
    backgroundSize: `${UI_ATLAS_W * scale}px ${UI_ATLAS_H * scale}px`,
    backgroundPosition: `${-sprite.x * scale}px ${-sprite.y * scale}px`,
    backgroundRepeat: 'no-repeat',
  } as const
}
