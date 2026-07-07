/** Super9 sevenUpDown bundle — sprite atlas + scene art */

const B = '/games/7up-down'

export const UP_DOWN_IMG = {
  roomBg: `${B}/f5_f5ddcea3-21f1-4ea0-a567-6807544eb985.c5915.png`,
  table: `${B}/a3_a3184e79-5732-4e34-b655-69c2837b3b72.4311e.png`,
  zones: `${B}/e4_e4baf956-2193-4a8b-8c40-3ad866b43885.a8c87.png`,
  uiAtlas: `${B}/18_1802d2ef6.e5697.png`,
  gameAtlas: `${B}/1b_1be40e510.c30db.png`,
  miscAtlas: `${B}/12_12ccf0bcb.86cef.png`,
  glowAtlas: `${B}/ff_ffa3cb9e-d93d-4c3f-9088-f9464ec795a2.63419.png`,
} as const

/** Pixel size of each sprite sheet (required for scaled CSS sprites) */
export const ATLAS_SIZE: Record<string, { w: number; h: number }> = {
  [UP_DOWN_IMG.uiAtlas]: { w: 1781, h: 254 },
  [UP_DOWN_IMG.gameAtlas]: { w: 987, h: 993 },
  [UP_DOWN_IMG.miscAtlas]: { w: 453, h: 512 },
}

export const UP_DOWN_HUD = {
  back: `${B}/hud/back.png`,
  menu: `${B}/hud/menu.png`,
  add: `${B}/hud/add.png`,
  promo: `${B}/hud/promo.png`,
  shaker: `${B}/hud/shaker.png`,
  social: `${B}/hud/social.png`,
} as const

export type SpriteRect = [number, number, number, number]

export type AtlasSpriteDef = {
  atlas: string
  rect: SpriteRect
  rotated?: boolean
}

export const UP_DOWN_SPRITES = {
  backBtn: { atlas: UP_DOWN_IMG.uiAtlas, rect: [933, 127, 80, 83] },
  menuBtn: { atlas: UP_DOWN_IMG.uiAtlas, rect: [847, 127, 80, 83] },
  socialBtn: { atlas: UP_DOWN_IMG.uiAtlas, rect: [1019, 127, 80, 81] },
  addBtn: { atlas: UP_DOWN_IMG.uiAtlas, rect: [1624, 3, 179, 83], rotated: true },
  rebetBtn: { atlas: UP_DOWN_IMG.miscAtlas, rect: [175, 276, 166, 68] },
  winnerBadge: { atlas: UP_DOWN_IMG.uiAtlas, rect: [1180, 89, 101, 127] },
  luckyBadge: { atlas: UP_DOWN_IMG.uiAtlas, rect: [1287, 89, 99, 123] },
  histGreen: { atlas: UP_DOWN_IMG.gameAtlas, rect: [885, 191, 38, 39], rotated: true },
  histBlue: { atlas: UP_DOWN_IMG.gameAtlas, rect: [930, 235, 38, 38] },
  histRed: { atlas: UP_DOWN_IMG.gameAtlas, rect: [930, 191, 38, 39], rotated: true },
  histNew: { atlas: UP_DOWN_IMG.gameAtlas, rect: [909, 146, 70, 39] },
  histChart: { atlas: UP_DOWN_IMG.gameAtlas, rect: [909, 3, 88, 75], rotated: true },
  promoPlay: { atlas: UP_DOWN_IMG.uiAtlas, rect: [3, 127, 651, 116] },
  shaker: { atlas: UP_DOWN_IMG.uiAtlas, rect: [759, 127, 82, 82] },
} as const satisfies Record<string, AtlasSpriteDef>

export const CHIP_SELECTOR_VALUES = [10, 50, 100, 500, 1000] as const

export function historySpriteForSum(sum: number): AtlasSpriteDef {
  if (sum === 7) return UP_DOWN_SPRITES.histBlue
  if (sum < 7) return UP_DOWN_SPRITES.histGreen
  return UP_DOWN_SPRITES.histRed
}
