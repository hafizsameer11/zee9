/** Dragon Tiger configuration — demo-safe, backend-ready. */

export type DragonTigerGameState =
  | 'LOADING'
  | 'BETTING_OPEN'
  | 'BETTING_CLOSING'
  | 'BETTING_CLOSED'
  | 'DEALING'
  | 'REVEALING_DRAGON'
  | 'REVEALING_TIGER'
  | 'SHOWING_WINNER'
  | 'PAYOUT'
  | 'RESETTING'

export type BetSelection = 'dragon' | 'tiger' | 'tie'

export type DragonTigerBet = {
  id: string
  roundId: string
  selection: BetSelection
  chipValue: number
  amount: number
  createdAt: number
}

export type Winner = 'dragon' | 'tiger' | 'tie'

export type Suit = 'S' | 'H' | 'D' | 'C'
export type Rank = 'A' | '2' | '3' | '4' | '5' | '6' | '7' | '8' | '9' | '10' | 'J' | 'Q' | 'K'

export type PlayingCard = {
  rank: Rank
  suit: Suit
  /** Ace=1 … King=13 */
  value: number
  id: string
}

/** Total-return multipliers (stake returned as part of payout). */
export const TOTAL_RETURN: Record<BetSelection, number> = {
  dragon: 2,
  tiger: 2,
  tie: 9,
}

/** Profit-only odds (excluding returned stake). */
export const PROFIT_ODDS: Record<BetSelection, number> = {
  dragon: 1,
  tiger: 1,
  tie: 8,
}

export const CHIP_VALUES = [10, 50, 100, 500, 1000, 2000, 5000, 10000] as const
export type ChipValue = (typeof CHIP_VALUES)[number]

export const BETTING_SECONDS = 9
export const BETTING_CLOSING_SECONDS = 3
export const STOP_BANNER_MS = 850
export const DEAL_MS = 460
export const FLIP_MS = 380
export const WINNER_MS = 2800
export const PAYOUT_HOLD_MS = 1400
export const RESET_HOLD_MS = 450
export const HISTORY_LIMIT = 24
export const TREND_LIMIT = 64

export const DESIGN_W = 850
export const DESIGN_H = 400

export const ASSET = {
  felt: '/games/dragon-tiger/table/felt.webp',
  loadingLite: '/games/dragon-tiger/backgrounds/loading-lite.webp',
  cardBack: '/games/dragon-tiger/cards/back.png',
  card: (rank: Rank, suit: Suit) => `/games/dragon-tiger/cards/${rank}${suit}.png`,
  chip: (v: number, sm = false) =>
    `/games/dragon-tiger/chips/chip-${v}${sm ? '-sm' : ''}.webp`,
  icon: (name: string) => `/games/dragon-tiger/icons/${name}.png`,
} as const

/** Tiny first-paint set — game can start without waiting for heavy character art. */
export const CRITICAL_ASSETS = [
  ASSET.loadingLite,
  ASSET.cardBack,
  ASSET.icon('back'),
  ASSET.icon('sound'),
  ASSET.icon('crown'),
  ASSET.icon('coin'),
  ...CHIP_VALUES.map((v) => ASSET.chip(v)),
  ...CHIP_VALUES.map((v) => ASSET.chip(v, true)),
]

export const ZONE_LABEL: Record<BetSelection, string> = {
  dragon: 'Dragon',
  tiger: 'Tiger',
  tie: 'Tie',
}
