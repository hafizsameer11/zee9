/** Zoo Roulette — enchanted wildlife casino roulette. */

export type AnimalId =
  | 'monkey'
  | 'rabbit'
  | 'lion'
  | 'panda'
  | 'swallow'
  | 'pigeon'
  | 'peacock'
  | 'eagle'
  | 'shark'
  | 'golden_frog'

export type BetZoneId = AnimalId | 'beast' | 'bird'

export type Animal = {
  id: AnimalId
  name: string
  category: 'beast' | 'bird' | 'water' | 'jackpot'
  mult: number
  tiles: number
  hue: string
  hueSoft: string
  bettable: boolean
}

export const ANIMALS: Animal[] = [
  { id: 'monkey', name: 'MONKEY', category: 'beast', mult: 8, tiles: 4, hue: '#6bcf5a', hueSoft: '#1a4020', bettable: true },
  { id: 'rabbit', name: 'RABBIT', category: 'beast', mult: 8, tiles: 3, hue: '#8fd878', hueSoft: '#244828', bettable: true },
  { id: 'lion', name: 'LION', category: 'beast', mult: 12, tiles: 3, hue: '#e8b040', hueSoft: '#4a3010', bettable: true },
  { id: 'panda', name: 'PANDA', category: 'beast', mult: 8, tiles: 4, hue: '#7ad890', hueSoft: '#1e3828', bettable: true },
  { id: 'swallow', name: 'SWALLOW', category: 'bird', mult: 6, tiles: 3, hue: '#4ab0ff', hueSoft: '#143050', bettable: true },
  { id: 'pigeon', name: 'PIGEON', category: 'bird', mult: 8, tiles: 3, hue: '#8b7cff', hueSoft: '#2a2050', bettable: true },
  { id: 'peacock', name: 'PEACOCK', category: 'bird', mult: 8, tiles: 4, hue: '#3ad8c0', hueSoft: '#104038', bettable: true },
  { id: 'eagle', name: 'EAGLE', category: 'bird', mult: 12, tiles: 4, hue: '#c8a050', hueSoft: '#3a2810', bettable: true },
  { id: 'shark', name: 'SHARK', category: 'water', mult: 24, tiles: 1, hue: '#38c8f0', hueSoft: '#0a3048', bettable: true },
  { id: 'golden_frog', name: 'GOLDEN FROG', category: 'jackpot', mult: 100, tiles: 1, hue: '#ffd84a', hueSoft: '#4a3808', bettable: false },
]

export const ANIMAL_BY_ID = new Map(ANIMALS.map((a) => [a.id, a]))

export const BEAST_IDS: AnimalId[] = ['monkey', 'rabbit', 'lion', 'panda']
export const BIRD_IDS: AnimalId[] = ['swallow', 'pigeon', 'peacock', 'eagle']

export const GROUP_ZONES = [
  { id: 'beast' as const, name: 'BEAST', mult: 2, category: 'beast' as const },
  { id: 'bird' as const, name: 'BIRD', mult: 2, category: 'bird' as const },
]

/** 28-tile rectangular track, clockwise from top-left. */
export const TRACK: AnimalId[] = [
  'monkey', 'rabbit', 'rabbit', 'rabbit', 'golden_frog', 'swallow', 'swallow', 'swallow', 'pigeon', 'pigeon',
  'eagle', 'peacock', 'peacock', 'peacock',
  'lion', 'lion', 'lion', 'shark', 'eagle', 'eagle', 'eagle', 'peacock',
  'panda', 'panda', 'monkey', 'monkey', 'monkey', 'panda',
]

export const TRACK_COLS = 10
export const TRACK_ROWS = 6

export const CHIP_VALUES = [20, 100, 200, 1000, 2000, 10000] as const
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
export const START_BANNER_MS = 1600
export const STOP_BANNER_MS = 450
export const SPIN_MS = 5800
export const REVEAL_LEAD_MS = 1400
export const RESULT_MS = 2600
export const PAYOUT_MS = 2600
export const RESET_MS = 900
export const HISTORY_LIMIT = 12

export const DESIGN_W = 896
export const DESIGN_H = 414

const BEZEL = { t: 22, r: 24, b: 40, l: 22 }
export const BEZEL_SLICE = '48 52 88 50'
const BOARD_W = 700
const BOARD_H = 352
const INNER_W = BOARD_W - BEZEL.l - BEZEL.r
const INNER_H = BOARD_H - BEZEL.t - BEZEL.b

export const BOARD = {
  x: 36,
  y: 8,
  w: BOARD_W,
  h: BOARD_H,
  bezel: BEZEL,
  innerW: INNER_W,
  innerH: INNER_H,
  tileW: INNER_W / TRACK_COLS,
  tileH: INNER_H / TRACK_ROWS,
  wellW: INNER_W - (2 * INNER_W) / TRACK_COLS,
  wellH: INNER_H - (2 * INNER_H) / TRACK_ROWS,
} as const

export const TOWER = { x: 748, y: 38, w: 82, h: 310 } as const
export const TIMER = { x: 318, y: 2, w: 88, h: 88 } as const

const R = '/games/zoo-roulette'

export const ASSET = {
  bg: `${R}/bg/jungle.webp`,
  bgLite: `${R}/bg/jungle-lite.webp`,
  chassis: `${R}/board/bezel.webp`,
  well: `${R}/board/well.webp`,
  realm: `${R}/board/realm.webp`,
  tile: (s: 'normal' | 'active' | 'winner') => `${R}/tiles/${s}.webp`,
  animal: (id: AnimalId, kind: 'track' | 'portrait' | 'sm' | 'winner' = 'portrait') =>
    `${R}/animals/${id}-${kind}.webp`,
  chip: (v: number, sm = false) => `${R}/chips/chip-${v}${sm ? '-sm' : ''}.webp`,
  ui: (n: string) => `${R}/ui/${n}.webp`,
  banner: (n: 'start' | 'stop') => `${R}/banners/${n}.webp`,
  loading: `${R}/loading/hero.webp`,
  fx: (n: 'shock' | 'rays' | 'sparks' | 'glow') => `${R}/fx/${n}.webp`,
} as const

export function calcPayout(bets: Map<BetZoneId, number>, winner: AnimalId): number {
  let total = 0
  const animal = ANIMAL_BY_ID.get(winner)
  if (animal?.bettable) {
    total += (bets.get(winner) ?? 0) * animal.mult
  }
  if (BEAST_IDS.includes(winner)) {
    total += (bets.get('beast') ?? 0) * 2
  }
  if (BIRD_IDS.includes(winner)) {
    total += (bets.get('bird') ?? 0) * 2
  }
  if (winner === 'shark') {
    total += (bets.get('shark') ?? 0) * 24
  }
  return total
}

export const BETTABLE_ZONES: BetZoneId[] = [
  'monkey', 'rabbit', 'lion', 'panda',
  'swallow', 'pigeon', 'peacock', 'eagle',
  'shark', 'beast', 'bird',
]
