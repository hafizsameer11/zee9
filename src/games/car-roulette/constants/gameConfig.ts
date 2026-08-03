/** Car Roulette — original fictional-marque roulette. Demo-safe, backend-ready. */

export type BrandId =
  | 'zephyra'
  | 'kavaro'
  | 'nordheim'
  | 'ashlyne'
  | 'taurion'
  | 'regalis'
  | 'scudera'
  | 'vornik'

export type Brand = {
  id: BrandId
  name: string
  klass: string
  /** Total return on a winning bet, stake included. */
  mult: number
  /** How many of the 32 track tiles carry this marque. */
  tiles: number
  /** Brand identity colour, used for zone lighting and chip trails. */
  hue: string
  hueSoft: string
  /** Long side of the hero render relative to the board width during the pass. */
  carScale: number
}

/**
 * Tile counts are the probability model: every tile is equally likely, so a
 * zone pays tiles/32 x mult. Each marque is tuned to 30/32 = 93.75% RTP.
 */
export const BRANDS: Brand[] = [
  { id: 'zephyra', name: 'ZEPHYRA', klass: 'Exotic Roadster', mult: 5, tiles: 8, hue: '#2ee0d0', hueSoft: '#0d5f5c', carScale: 0.62 },
  { id: 'kavaro', name: 'KAVARO', klass: 'Sports Crossover', mult: 5, tiles: 8, hue: '#9b6cff', hueSoft: '#3a2470', carScale: 0.58 },
  { id: 'nordheim', name: 'NORDHEIM', klass: 'Performance Coupe', mult: 40, tiles: 1, hue: '#c8d6e8', hueSoft: '#3d4a5e', carScale: 0.6 },
  { id: 'ashlyne', name: 'ASHLYNE', klass: 'Grand Tourer', mult: 5, tiles: 7, hue: '#4bd07a', hueSoft: '#16452c', carScale: 0.6 },
  { id: 'taurion', name: 'TAURION', klass: 'Performance SUV', mult: 10, tiles: 3, hue: '#e0964a', hueSoft: '#5e3a15', carScale: 0.56 },
  { id: 'regalis', name: 'REGALIS', klass: 'Luxury Sedan', mult: 15, tiles: 2, hue: '#5b9dff', hueSoft: '#182f5e', carScale: 0.62 },
  { id: 'scudera', name: 'SCUDERA', klass: 'Italian Supercar', mult: 15, tiles: 2, hue: '#ff4d4d', hueSoft: '#5e1414', carScale: 0.64 },
  { id: 'vornik', name: 'VORNIK', klass: 'Hypercar', mult: 30, tiles: 1, hue: '#ffc94a', hueSoft: '#5c4208', carScale: 0.66 },
]

export const BRAND_BY_ID = new Map(BRANDS.map((b) => [b.id, b]))

/** Betting grid, 3 columns x 3 rows. The bottom-centre slot holds the timer. */
export const ZONE_GRID: (BrandId | null)[] = [
  'vornik', 'scudera', 'regalis',
  'taurion', 'ashlyne', 'nordheim',
  'kavaro', null, 'zephyra',
]

/**
 * The 32-tile ring, laid out clockwise from the top-left corner. Rare marques
 * are spaced so no two neighbours repeat and the chase reads evenly.
 */
export const TRACK: BrandId[] = [
  'vornik', 'zephyra', 'kavaro', 'nordheim',
  'taurion', 'ashlyne', 'zephyra', 'kavaro',
  'regalis', 'ashlyne', 'ashlyne', 'zephyra',
  'taurion', 'kavaro', 'zephyra', 'ashlyne',
  'scudera', 'zephyra', 'kavaro', 'kavaro',
  'regalis', 'ashlyne', 'zephyra', 'kavaro',
  'taurion', 'zephyra', 'ashlyne', 'zephyra',
  'scudera', 'kavaro', 'ashlyne', 'ashlyne',
]

export const TRACK_COLS = 12
export const TRACK_ROWS = 6

export const CHIP_VALUES = [10, 50, 100, 500, 1000] as const
export type ChipValue = (typeof CHIP_VALUES)[number]

export type GameState =
  | 'LOADING'
  | 'NEW_ROUND'
  | 'BETTING'
  | 'CLOSING'
  | 'SPINNING'
  | 'RESULT'
  | 'PAYOUT'
  | 'RESETTING'

export const BETTING_SECONDS = 15
export const WARNING_SECONDS = 3
export const START_BANNER_MS = 1500
export const STOP_BANNER_MS = 1250
export const SPIN_MS = 5600
/** Hero pass begins this long before the chase settles. */
export const CAR_LEAD_MS = 1500
export const CAR_PASS_MS = 1150
export const RESULT_MS = 2400
export const PAYOUT_MS = 2400
export const RESET_MS = 900
export const HISTORY_LIMIT = 12

export const DESIGN_W = 896
export const DESIGN_H = 414

/**
 * Board geometry on the design canvas. `bezel` is the rendered thickness of the
 * chassis border-image; the track ring starts immediately inside it.
 */
/** Matches board/bezel.webp (1024x667) sliced at 47/54/92/53, scaled ~0.42. */
const BEZEL = { t: 20, r: 23, b: 39, l: 22 }
export const BEZEL_SLICE = '47 54 92 53'
const BOARD_W = 690
const BOARD_H = 348
const INNER_W = BOARD_W - BEZEL.l - BEZEL.r
const INNER_H = BOARD_H - BEZEL.t - BEZEL.b

export const BOARD = {
  x: 40,
  y: 10,
  w: BOARD_W,
  h: BOARD_H,
  bezel: BEZEL,
  innerW: INNER_W,
  innerH: INNER_H,
  tileW: INNER_W / TRACK_COLS,
  tileH: INNER_H / TRACK_ROWS,
  /** Betting surface, inset by one tile on every side. */
  wellW: INNER_W - (2 * INNER_W) / TRACK_COLS,
  wellH: INNER_H - (2 * INNER_H) / TRACK_ROWS,
} as const

export const TOWER = { x: 740, y: 28, w: 78, h: 320 } as const
export const TOPBAR_H = 38
export const DECK_H = 54

const R = '/games/car-roulette'

export const ASSET = {
  bg: `${R}/bg/showroom.webp`,
  bgLite: `${R}/bg/showroom-lite.webp`,
  chassis: `${R}/board/bezel.webp`,
  chassisThick: `${R}/board/chassis.webp`,
  well: `${R}/board/well.webp`,
  tile: (s: 'normal' | 'active' | 'winner') => `${R}/tiles/${s}.webp`,
  emblem: (b: BrandId, sm = false) => `${R}/emblems/${b}${sm ? '-sm' : ''}.webp`,
  car: (b: BrandId) => `${R}/cars/${b}.webp`,
  chip: (v: number, sm = false) => `${R}/chips/chip-${v}${sm ? '-sm' : ''}.webp`,
  ui: (n: string) => `${R}/ui/${n}.webp`,
  banner: (n: 'start' | 'stop') => `${R}/banners/${n}.webp`,
  fx: (n: 'shock' | 'rays' | 'speed' | 'sparks') => `${R}/fx/${n}.webp`,
} as const

export const HOUSE_RTP = 30 / 32
