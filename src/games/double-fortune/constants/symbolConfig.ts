import { BASE, ASSET_V } from './gameConfig'

export type SymbolId =
  | 'wild'
  | 'happiness'
  | 'rings'
  | 'shoes'
  | 'envelopes'
  | 'cakes'
  | 'A'
  | 'K'
  | 'Q'
  | 'J'
  | 'scatter'

export type SymbolMeta = {
  id: SymbolId
  label: string
  kind: 'special' | 'high' | 'mid' | 'low'
  /** Pays for 3 / 4 / 5 of a kind (× bet / lines factor applied in engine) */
  pays: [number, number, number]
  weight: number
  src: string
}

function src(file: string) {
  return `${BASE}/symbols/${file}?${ASSET_V}`
}

export const SYMBOLS: SymbolMeta[] = [
  {
    id: 'wild',
    label: 'Wild',
    kind: 'special',
    pays: [0, 0, 0],
    weight: 5,
    src: src('wild.png'),
  },
  {
    id: 'scatter',
    label: 'Scatter',
    kind: 'special',
    pays: [0, 0, 0],
    weight: 4,
    src: src('scatter.png'),
  },
  {
    id: 'happiness',
    label: 'Double Happiness',
    kind: 'high',
    pays: [20, 80, 200],
    weight: 7,
    src: src('happiness.png'),
  },
  {
    id: 'rings',
    label: 'Wedding Locks',
    kind: 'high',
    pays: [15, 50, 120],
    weight: 8,
    src: src('rings.png'),
  },
  {
    id: 'shoes',
    label: 'Bridal Shoes',
    kind: 'mid',
    pays: [10, 30, 80],
    weight: 10,
    src: src('shoes.png'),
  },
  {
    id: 'envelopes',
    label: 'Red Envelopes',
    kind: 'mid',
    pays: [8, 25, 60],
    weight: 11,
    src: src('envelopes.png'),
  },
  {
    id: 'cakes',
    label: 'Wedding Cakes',
    kind: 'mid',
    pays: [6, 20, 45],
    weight: 12,
    src: src('cakes.png'),
  },
  {
    id: 'A',
    label: 'Ace',
    kind: 'low',
    pays: [4, 12, 30],
    weight: 15,
    src: src('letter-a.png'),
  },
  {
    id: 'K',
    label: 'King',
    kind: 'low',
    pays: [3.5, 10, 25],
    weight: 16,
    src: src('letter-k.png'),
  },
  {
    id: 'Q',
    label: 'Queen',
    kind: 'low',
    pays: [3, 8, 20],
    weight: 17,
    src: src('letter-q.png'),
  },
  {
    id: 'J',
    label: 'Jack',
    kind: 'low',
    pays: [2.5, 7, 18],
    weight: 18,
    src: src('letter-j.png'),
  },
]

export const SYMBOL_MAP = Object.fromEntries(SYMBOLS.map((s) => [s.id, s])) as Record<
  SymbolId,
  SymbolMeta
>

export const PAY_SYMBOLS = SYMBOLS.filter((s) => s.kind !== 'special')
