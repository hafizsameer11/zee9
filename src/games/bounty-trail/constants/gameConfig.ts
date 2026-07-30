import { S9_CURRENCY_SYMBOL, formatS9Amount } from '../../../data/s9Games'
import { STAGE_H, STAGE_W } from './layoutConfig'

/** Portrait mobile canvas — fills phone screens without landscape rotate. */
export const DESIGN_W = STAGE_W
export const DESIGN_H = STAGE_H

export const COLS = 6
export const ROWS = 4

export const BASE = '/games/bounty-trail'

export const BET_AMOUNTS = [5, 10, 20, 50, 100, 200, 500, 700, 1000, 2000, 5000] as const

export const DEFAULT_BET = 10

export const AUTO_SPIN_OPTIONS = [10, 30, 50, 80, 100, 1000] as const

export const FEATURE_BUY_MULT = 80
export const FREE_SPIN_COUNT = 10
export const FREE_SPIN_EXTRA = 5

export const MULTIPLIER_TRACK = [1, 2, 4, 8, 16, 32, 64, 128, 256, 512, 1024] as const

export const SPIN_MS = 1700
export const TURBO_SPIN_MS = 560
export const REEL_STOP_STAGGER = 110
export const TURBO_STOP_STAGGER = 45

export const CURRENCY = S9_CURRENCY_SYMBOL

export function formatMoney(n: number): string {
  return formatS9Amount(Number.isFinite(n) ? n : 0)
}

export function featureBuyCost(bet: number): number {
  return Math.round(bet * FEATURE_BUY_MULT * 100) / 100
}

export const STATUS_MESSAGES = [
  'WIN UP TO 3600 WAYS!',
  '3 OR MORE SCATTERS TRIGGER FREE SPINS',
  'GOLD SYMBOLS CAN INCREASE MULTIPLIERS',
  'FEATURE MULTIPLIERS MAY PERSIST',
  '10 OR MORE FREE SPINS AVAILABLE',
  'LAND GOLD FRAMES FOR HIGH NOON PAYOUTS',
] as const

export const ASSET = {
  bg: `${BASE}/backgrounds/saloon.webp`,
  bgFallback: `${BASE}/backgrounds/saloon.png`,
  loadingHero: `${BASE}/loading/hero.webp`,
  loadingHeroFallback: `${BASE}/loading/hero.png`,
  logo: `${BASE}/ui/logo.png`,
  multiplierBoard: `${BASE}/frames/multiplier-board.png`,
  statusBoard: `${BASE}/frames/status-board.png`,
  reelFrame: `${BASE}/frames/reel-frame.png`,
  goldFrame: `${BASE}/frames/gold-frame.png`,
  featureBuy: `${BASE}/controls/feature-buy.png`,
  spin: `${BASE}/controls/spin.png`,
  minus: `${BASE}/controls/minus.png`,
  plus: `${BASE}/controls/plus.png`,
  auto: `${BASE}/controls/auto.png`,
  turbo: `${BASE}/controls/turbo.png`,
  coin: `${BASE}/particles/coin.png`,
  smoke: `${BASE}/particles/smoke.png`,
  dust: `${BASE}/particles/dust.png`,
  spark: `${BASE}/particles/spark.png`,
  bigWin: `${BASE}/ui/bigwin-banner.png`,
  freeSpins: `${BASE}/ui/freespins.png`,
  featurePurchase: `${BASE}/ui/feature-purchase.png`,
  foreground: `${BASE}/backgrounds/foreground.png`,
  controlDeck: `${BASE}/frames/control-deck.png`,
  icons: {
    wallet: `${BASE}/ui/icon-wallet.png`,
    bet: `${BASE}/ui/icon-bet.png`,
    win: `${BASE}/ui/icon-win.png`,
    menu: `${BASE}/ui/icon-menu.png`,
    sound: `${BASE}/ui/icon-sound.png`,
    soundOff: `${BASE}/ui/icon-sound-off.png`,
    quit: `${BASE}/ui/icon-quit.png`,
    paytable: `${BASE}/ui/icon-paytable.png`,
    rules: `${BASE}/ui/icon-rules.png`,
    history: `${BASE}/ui/icon-history.png`,
    lobby: `${BASE}/controls/lobby.png`,
  },
} as const
