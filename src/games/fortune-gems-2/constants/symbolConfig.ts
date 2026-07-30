import { BASE, ASSET_V } from './gameConfig'

export type Fg2Symbol = 'wild' | 'ruby' | 'sapphire' | 'emerald' | 'A' | 'K' | 'Q' | 'J'

export type Fg2Multiplier = 2 | 3 | 5 | 10 | 15

export type SpecialToken =
  | { kind: 'mult'; value: Fg2Multiplier }
  | { kind: 'wheel'; color: 'green' | 'red' }

const s = (path: string) => `${path}?${ASSET_V}`

export const SYMBOL_META: Record<
  Fg2Symbol,
  { label: string; weight: number; payout: number; src: string }
> = {
  wild: { label: 'Wild', weight: 5, payout: 50, src: s(`${BASE}/symbols/wild.png`) },
  ruby: { label: 'Ruby', weight: 12, payout: 14, src: s(`${BASE}/symbols/ruby.png`) },
  sapphire: { label: 'Sapphire', weight: 13, payout: 12, src: s(`${BASE}/symbols/sapphire.png`) },
  emerald: { label: 'Emerald', weight: 14, payout: 10, src: s(`${BASE}/symbols/emerald.png`) },
  A: { label: 'Ace', weight: 16, payout: 6, src: s(`${BASE}/symbols/A.png`) },
  K: { label: 'King', weight: 18, payout: 5, src: s(`${BASE}/symbols/K.png`) },
  Q: { label: 'Queen', weight: 20, payout: 4, src: s(`${BASE}/symbols/Q.png`) },
  J: { label: 'Jack', weight: 22, payout: 3, src: s(`${BASE}/symbols/J.png`) },
}

export const MULTIPLIERS: Fg2Multiplier[] = [2, 3, 5, 10, 15]

export const MULT_SRC: Record<Fg2Multiplier, string> = {
  2: s(`${BASE}/multipliers/mult-2x.png`),
  3: s(`${BASE}/multipliers/mult-3x.png`),
  5: s(`${BASE}/multipliers/mult-5x.png`),
  10: s(`${BASE}/multipliers/mult-10x.png`),
  15: s(`${BASE}/multipliers/mult-15x.png`),
}

export const WHEEL_TOKEN_SRC = {
  green: s(`${BASE}/symbols/wheel-green.png`),
  red: s(`${BASE}/symbols/wheel-red.png`),
} as const

export const WHEEL_REWARDS = [3, 5, 8, 10, 15, 20, 30, 50, 100, 200, 500, 1000] as const
