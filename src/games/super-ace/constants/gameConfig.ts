import { S9_CURRENCY_SYMBOL, formatS9Amount } from '../../../data/s9Games'

/** Portrait mobile canvas — fills phone screens (matches bounty-trail). */
export const DESIGN_W = 390
export const DESIGN_H = 844

export const COLS = 5
export const ROWS = 5
export const CELL_COUNT = COLS * ROWS

export const BASE = '/games/super-ace'
/** Cache-bust after visual rebuild */
export const ASSET_V = 'v4'

export const BET_AMOUNTS = [10, 20, 50, 100, 500, 700, 1000, 2000, 5000, 10000] as const
export const DEFAULT_BET = 10

export const AUTO_SPIN_OPTIONS = [10, 20, 50, 100, 500] as const

/** Combo multipliers advance one step per consecutive cascade win; reset on new spin. */
export const COMBO = [1, 2, 3, 5] as const

export const FEATURE_BUY_MULT = 75
export const FREE_SPIN_COUNT = 10
export const GOLDEN_CHANCE = 0.12
export const MIN_MATCH = 5

export const SPIN_MS = 920
export const TURBO_SPIN_MS = 360
export const CASCADE_DROP_MS = 520
export const TURBO_CASCADE_MS = 200
export const WIN_HOLD_MS = 640
export const TURBO_WIN_HOLD_MS = 240
export const SUPER_WIN_MS = 3400
export const TURBO_SUPER_WIN_MS = 1600

/** Win ≥ this multiple of bet triggers SUPER WIN presentation. */
export const SUPER_WIN_MULT = 20

export const CURRENCY = S9_CURRENCY_SYMBOL

const v = (path: string) => `${path}?${ASSET_V}`

export const ASSET = {
  felt: v(`${BASE}/backgrounds/felt.png`),
  wallpaper: v(`${BASE}/backgrounds/wallpaper.png`),
  woodTop: v(`${BASE}/frames/wood-top.png`),
  woodBottom: v(`${BASE}/frames/wood-bottom.png`),
  board: v(`${BASE}/frames/board.png`),
  logo: v(`${BASE}/ui/logo.png`),
  multiplierBar: v(`${BASE}/ui/multiplier-bar.png`),
  multActive0: v(`${BASE}/ui/mult-active-0.png`),
  multActive1: v(`${BASE}/ui/mult-active-1.png`),
  multActive2: v(`${BASE}/ui/mult-active-2.png`),
  multActive3: v(`${BASE}/ui/mult-active-3.png`),
  superWin: v(`${BASE}/ui/super-win.png`),
  playBtn: v(`${BASE}/ui/play-btn.png`),
  spin: v(`${BASE}/controls/spin.png`),
  buyBonus: v(`${BASE}/controls/buy-bonus.png`),
  turbo: v(`${BASE}/controls/turbo.png`),
  auto: v(`${BASE}/controls/auto.png`),
  settings: v(`${BASE}/controls/settings.png`),
  plus: v(`${BASE}/controls/plus.png`),
  minus: v(`${BASE}/controls/minus.png`),
  menu: v(`${BASE}/controls/menu.png`),
  sound: v(`${BASE}/controls/sound.png`),
  info: v(`${BASE}/controls/info.png`),
  loadingBg: v(`${BASE}/loading/bg.png`),
  studio: v(`${BASE}/loading/studio.png`),
  coin0: v(`${BASE}/particles/coin-0.png`),
  coin1: v(`${BASE}/particles/coin-1.png`),
  coin2: v(`${BASE}/particles/coin-2.png`),
  coin3: v(`${BASE}/particles/coin-3.png`),
  coin4: v(`${BASE}/particles/coin-4.png`),
  coin5: v(`${BASE}/particles/coin-5.png`),
} as const

export const SYMBOL_IDS = [
  'spade',
  'heart',
  'diamond',
  'club',
  'jack',
  'queen',
  'king',
  'ace',
  'wild',
  'scatter',
] as const

export type SymbolAssetId = (typeof SYMBOL_IDS)[number]

export function symbolSrc(id: SymbolAssetId, golden = false): string {
  if (id === 'wild') return v(`${BASE}/symbols/card-wild-tight.png`)
  if (id === 'scatter') return v(`${BASE}/symbols/card-scatter.png`)
  return v(`${BASE}/symbols/card-${id}${golden ? '-gold' : ''}.png`)
}

export const MULT_ACTIVE = [
  ASSET.multActive0,
  ASSET.multActive1,
  ASSET.multActive2,
  ASSET.multActive3,
] as const

export const COIN_FRAMES = [
  ASSET.coin0,
  ASSET.coin1,
  ASSET.coin2,
  ASSET.coin3,
  ASSET.coin4,
  ASSET.coin5,
] as const

export function formatMoney(n: number): string {
  return formatS9Amount(Number.isFinite(n) ? n : 0)
}

export function featureBuyCost(bet: number): number {
  return Math.round(bet * FEATURE_BUY_MULT * 100) / 100
}

export const STATUS_MESSAGES = [
  'MATCH 5+ CARDS TO WIN',
  'GOLDEN CARDS TRANSFORM INTO WILDS',
  '3 SCATTERS AWARD 10 FREE SPINS',
  'COMBOS BUILD ×1 → ×2 → ×3 → ×5',
  'BUY BONUS FOR INSTANT FREE SPINS',
  'WILDS SUBSTITUTE FOR ALL BUT SCATTER',
] as const
