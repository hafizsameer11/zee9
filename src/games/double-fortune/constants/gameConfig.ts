import { S9_CURRENCY_SYMBOL, formatS9Amount } from '../../../data/s9Games'
import { STAGE_H, STAGE_W } from './layoutConfig'

export const DESIGN_W = STAGE_W
export const DESIGN_H = STAGE_H

export const COLS = 5
export const ROWS = 3

export const BASE = '/games/double-fortune'
export const ASSET_V = 'v2'

export const LINES = 30

export const BET_AMOUNTS = [5, 10, 20, 50, 70, 100, 200, 500, 1000, 2000, 5000] as const

export const DEFAULT_BET = 10
export const AUTO_SPIN_OPTIONS = [10, 30, 50, 80, 1000] as const

export const FREE_SPIN_COUNT = 8
export const FREE_SPIN_MULT = 8

export const SPIN_MS = 1600
export const TURBO_SPIN_MS = 520
export const REEL_STOP_STAGGER = 120
export const TURBO_STOP_STAGGER = 48

export const CURRENCY = S9_CURRENCY_SYMBOL

export function formatMoney(n: number): string {
  return formatS9Amount(Number.isFinite(n) ? n : 0)
}

export const STATUS_MESSAGES = [
  'DOUBLE SET OF REELS DURING FREE SPINS!',
  '3 SCATTERS TRIGGER 8 FREE SPINS',
  'WIN UP TO 10 OF A KIND',
  'FREE SPINS WITH X8 MULTIPLIER',
  'DOUBLE FORTUNE AWAITS',
  'WILD SUBSTITUTES FOR ALL EXCEPT SCATTER',
] as const

export const ASSET = {
  stage: `${BASE}/backgrounds/stage.webp?${ASSET_V}`,
  stageFallback: `${BASE}/backgrounds/stage.png?${ASSET_V}`,
  loadingBg: `${BASE}/loading/bg.webp?${ASSET_V}`,
  loadingBgFallback: `${BASE}/loading/bg.png?${ASSET_V}`,
  studio: `${BASE}/loading/studio.png?${ASSET_V}`,
  couple: `${BASE}/characters/couple.png?${ASSET_V}`,
  lantern: `${BASE}/environment/lantern.png?${ASSET_V}`,
  curtainL: `${BASE}/environment/curtain-left.webp?${ASSET_V}`,
  curtainR: `${BASE}/environment/curtain-right.webp?${ASSET_V}`,
  logo: `${BASE}/ui/logo.png?${ASSET_V}`,
  getStarted: `${BASE}/ui/get-started.png?${ASSET_V}`,
  x8: `${BASE}/ui/x8.png?${ASSET_V}`,
  bigWin: `${BASE}/ui/big-win.png?${ASSET_V}`,
  megaWin: `${BASE}/ui/mega-win.png?${ASSET_V}`,
  freeSpins: `${BASE}/ui/free-spins.png?${ASSET_V}`,
  banner: `${BASE}/frames/banner.png?${ASSET_V}`,
  reelFrame: `${BASE}/frames/reel-frame.png?${ASSET_V}`,
  reelPlate: `${BASE}/frames/reel-plate.png?${ASSET_V}`,
  infoStrip: `${BASE}/frames/info-strip.png?${ASSET_V}`,
  controlDeck: `${BASE}/frames/control-deck.webp?${ASSET_V}`,
  spin: `${BASE}/controls/spin.png?${ASSET_V}`,
  minus: `${BASE}/controls/minus.png?${ASSET_V}`,
  plus: `${BASE}/controls/plus.png?${ASSET_V}`,
  auto: `${BASE}/controls/auto.png?${ASSET_V}`,
  turbo: `${BASE}/controls/turbo.png?${ASSET_V}`,
  settings: `${BASE}/controls/settings.png?${ASSET_V}`,
  sound: `${BASE}/controls/sound.png?${ASSET_V}`,
  info: `${BASE}/controls/info.png?${ASSET_V}`,
  lobby: `${BASE}/controls/lobby.png?${ASSET_V}`,
  coin: `${BASE}/particles/coin.png?${ASSET_V}`,
  spark: `${BASE}/particles/spark.png?${ASSET_V}`,
  petal: `${BASE}/particles/petal.png?${ASSET_V}`,
  dust: `${BASE}/particles/dust.png?${ASSET_V}`,
}
