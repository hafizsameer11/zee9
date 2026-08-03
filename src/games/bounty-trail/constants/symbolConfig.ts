import { BASE } from './gameConfig'

export type SymbolId =
  | 'hunter'
  | 'outlaw'
  | 'sheriff'
  | 'wild'
  | 'scatter'
  | 'bonus'
  | 'hat'
  | 'whiskey'
  | 'revolver'
  | 'boots'
  | 'badge'
  | 'belt'
  | 'pouch'
  | 'A'
  | 'K'
  | 'Q'
  | 'J'
  | 'T'

export type SymbolMeta = {
  id: SymbolId
  label: string
  kind: 'character' | 'special' | 'object' | 'low'
  /** Ways payout multipliers for 3 / 4 / 5 / 6 of a kind */
  pays: [number, number, number, number]
  weight: number
  src: string
}

export const SYMBOLS: SymbolMeta[] = [
  {
    id: 'hunter',
    label: 'Bounty Hunter',
    kind: 'character',
    pays: [2.5, 8, 25, 80],
    weight: 6,
    src: `${BASE}/characters/outlaw.webp`,
  },
  {
    id: 'outlaw',
    label: 'Outlaw',
    kind: 'character',
    pays: [2, 6, 18, 55],
    weight: 7,
    src: `${BASE}/characters/outlaw.webp`,
  },
  {
    id: 'sheriff',
    label: 'Sheriff',
    kind: 'character',
    pays: [1.8, 5, 14, 40],
    weight: 8,
    src: `${BASE}/symbols/wild.webp`,
  },
  {
    id: 'wild',
    label: 'Wild Revolver',
    kind: 'special',
    pays: [0, 0, 0, 0],
    weight: 5,
    src: `${BASE}/symbols/wild.webp`,
  },
  {
    id: 'scatter',
    label: 'Gold Safe',
    kind: 'special',
    pays: [0, 0, 0, 0],
    weight: 4,
    src: `${BASE}/symbols/scatter.webp`,
  },
  {
    id: 'bonus',
    label: 'Wanted Poster',
    kind: 'special',
    pays: [0, 0, 0, 0],
    weight: 3,
    src: `${BASE}/symbols/scatter.webp`,
  },
  {
    id: 'hat',
    label: 'Cowboy Hat',
    kind: 'object',
    pays: [1.2, 3.5, 10, 28],
    weight: 10,
    src: `${BASE}/symbols/hat.webp`,
  },
  {
    id: 'whiskey',
    label: 'Whiskey',
    kind: 'object',
    pays: [1, 3, 8, 22],
    weight: 11,
    src: `${BASE}/symbols/whiskey.webp`,
  },
  {
    id: 'revolver',
    label: 'Holster',
    kind: 'object',
    pays: [0.9, 2.5, 7, 18],
    weight: 11,
    src: `${BASE}/symbols/revolver.webp`,
  },
  {
    id: 'boots',
    label: 'Boots',
    kind: 'object',
    pays: [0.8, 2.2, 6, 15],
    weight: 12,
    src: `${BASE}/symbols/revolver.webp`,
  },
  {
    id: 'badge',
    label: 'Badge',
    kind: 'object',
    pays: [0.7, 2, 5, 12],
    weight: 12,
    src: `${BASE}/symbols/scatter.webp`,
  },
  {
    id: 'belt',
    label: 'Bullet Belt',
    kind: 'object',
    pays: [0.6, 1.8, 4.5, 10],
    weight: 13,
    src: `${BASE}/symbols/revolver.webp`,
  },
  {
    id: 'pouch',
    label: 'Coin Pouch',
    kind: 'object',
    pays: [0.5, 1.5, 4, 9],
    weight: 13,
    src: `${BASE}/symbols/whiskey.webp`,
  },
  {
    id: 'A',
    label: 'Ace',
    kind: 'low',
    pays: [0.4, 1.2, 3, 7],
    weight: 16,
    src: `${BASE}/symbols/letter-a.webp`,
  },
  {
    id: 'K',
    label: 'King',
    kind: 'low',
    pays: [0.35, 1, 2.5, 6],
    weight: 17,
    src: `${BASE}/symbols/letter-k.webp`,
  },
  {
    id: 'Q',
    label: 'Queen',
    kind: 'low',
    pays: [0.3, 0.9, 2.2, 5],
    weight: 18,
    src: `${BASE}/symbols/letter-q.webp`,
  },
  {
    id: 'J',
    label: 'Jack',
    kind: 'low',
    pays: [0.25, 0.8, 2, 4.5],
    weight: 18,
    src: `${BASE}/symbols/letter-j.webp`,
  },
  {
    id: 'T',
    label: 'Ten',
    kind: 'low',
    pays: [0.2, 0.7, 1.8, 4],
    weight: 19,
    src: `${BASE}/symbols/letter-j.webp`,
  },
]

export const SYMBOL_MAP = Object.fromEntries(SYMBOLS.map((s) => [s.id, s])) as Record<
  SymbolId,
  SymbolMeta
>

export const PAY_SYMBOLS = SYMBOLS.filter((s) => s.kind !== 'special')
