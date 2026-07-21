const BASE = '/games/crash'

export const CRASH_ASSETS = {
  uiAtlas: `${BASE}/ui-atlas.png`,
  chipsAtlas: `${BASE}/chips-atlas.webp`,
  graphBg: `${BASE}/graph-bg.png`,
  historyRed: `${BASE}/history-red.png`,
  historyBlue: `${BASE}/history-blue.png`,
  historyPurple: `${BASE}/history-purple.png`,
  guideCharacter: `${BASE}/guide-character.png`,
  rocket: `${BASE}/rocket.png`,
  bangCloud: `${BASE}/bang-cloud.png`,
} as const

export const UI_ATLAS_W = 1024
export const UI_ATLAS_H = 1024

export const UI_SPRITES = {
  toggleOn: { x: 691, y: 694, w: 48, h: 24 },
  toggleOff: { x: 691, y: 748, w: 48, h: 24 },
  toggleBigOn: { x: 512, y: 975, w: 80, h: 40 },
  toggleBigOff: { x: 426, y: 975, w: 80, h: 40 },
  historyLed: { x: 3, y: 1005, w: 15, h: 14 },
  chipsAdd: { x: 3, y: 3, w: 97, h: 33 },
} as const

export function atlasStyle(sprite: { x: number; y: number; w: number; h: number }, displayH: number) {
  const scale = displayH / sprite.h
  const displayW = sprite.w * scale
  return {
    width: displayW,
    height: displayH,
    backgroundImage: `url(${CRASH_ASSETS.uiAtlas})`,
    backgroundSize: `${UI_ATLAS_W * scale}px ${UI_ATLAS_H * scale}px`,
    backgroundPosition: `${-sprite.x * scale}px ${-sprite.y * scale}px`,
    backgroundRepeat: 'no-repeat',
  } as const
}

export function chipsAtlasStyle(sprite: { x: number; y: number; w: number; h: number }, displayH: number) {
  const scale = displayH / sprite.h
  const displayW = sprite.w * scale
  return {
    width: displayW,
    height: displayH,
    backgroundImage: `url(${CRASH_ASSETS.chipsAtlas})`,
    backgroundSize: `${134 * scale}px ${126 * scale}px`,
    backgroundPosition: `${-sprite.x * scale}px ${-sprite.y * scale}px`,
    backgroundRepeat: 'no-repeat',
  } as const
}

export function historyPanelFor(mult: number) {
  if (mult < 2) return CRASH_ASSETS.historyRed
  if (mult < 10) return CRASH_ASSETS.historyBlue
  return CRASH_ASSETS.historyPurple
}
