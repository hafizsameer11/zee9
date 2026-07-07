export type GemsSymbol = 'wild' | 'green' | 'red' | 'blue' | 'A' | 'K' | 'Q' | 'J'

export type GemsMultiplier = 1 | 2 | 3 | 5 | 10 | 15

export const GEMS_SYMBOL_META: Record<
  GemsSymbol,
  { label: string; weight: number; payout: number; sprite: string }
> = {
  wild: { label: 'Wild', weight: 5, payout: 50, sprite: 'Symbol_07' },
  green: { label: 'Green Gem', weight: 14, payout: 12, sprite: 'Symbol_03' },
  red: { label: 'Red Gem', weight: 14, payout: 10, sprite: 'Symbol_04' },
  blue: { label: 'Blue Gem', weight: 14, payout: 8, sprite: 'Symbol_05' },
  A: { label: 'Ace', weight: 18, payout: 5, sprite: 'Symbol_06' },
  K: { label: 'King', weight: 20, payout: 4, sprite: 'Symbol_02' },
  Q: { label: 'Queen', weight: 22, payout: 3, sprite: 'Symbol_08' },
  J: { label: 'Jack', weight: 24, payout: 2, sprite: 'Symbol_09' },
}

export const GEMS_MULTIPLIERS: GemsMultiplier[] = [1, 2, 3, 5, 10, 15]

const SYMBOLS = Object.keys(GEMS_SYMBOL_META) as GemsSymbol[]

const PAYLINES: [number, number, number][] = [
  [0, 1, 2],
  [3, 4, 5],
  [6, 7, 8],
  [0, 4, 8],
  [6, 4, 2],
]

function weightedPick(): GemsSymbol {
  const total = SYMBOLS.reduce((a, s) => a + GEMS_SYMBOL_META[s].weight, 0)
  let r = Math.random() * total
  for (const s of SYMBOLS) {
    r -= GEMS_SYMBOL_META[s].weight
    if (r <= 0) return s
  }
  return 'J'
}

function pickMultiplier(): GemsMultiplier {
  const weights: Record<GemsMultiplier, number> = { 1: 30, 2: 25, 3: 20, 5: 12, 10: 8, 15: 5 }
  const entries = GEMS_MULTIPLIERS.map((m) => [m, weights[m]] as const)
  const total = entries.reduce((a, [, w]) => a + w, 0)
  let r = Math.random() * total
  for (const [m, w] of entries) {
    r -= w
    if (r <= 0) return m
  }
  return 1
}

/** Flat 3×3 grid, row-major */
export function spinGemsGrid(): GemsSymbol[] {
  return Array.from({ length: 9 }, () => weightedPick())
}

export function spinGemsMultiplier(): GemsMultiplier {
  return pickMultiplier()
}

function matches(a: GemsSymbol, b: GemsSymbol): boolean {
  return a === b || a === 'wild' || b === 'wild'
}

function resolveLine(symbols: GemsSymbol[]): GemsSymbol {
  return symbols.find((s) => s !== 'wild') ?? 'wild'
}

export type GemsWinLine = {
  lineIndex: number
  cells: [number, number, number]
  symbol: GemsSymbol
  payout: number
}

export function evaluateGemsGrid(
  grid: GemsSymbol[],
  bet: number,
  multiplier: GemsMultiplier,
): { payout: number; lines: GemsWinLine[]; fullBoard: boolean } {
  const base = resolveLine(grid)
  const fullBoard = grid.every((s) => matches(s, base))
  const lines: GemsWinLine[] = []

  PAYLINES.forEach((cells, lineIndex) => {
    const symbols = cells.map((i) => grid[i])
    const lineBase = resolveLine(symbols)
    if (symbols.every((s) => matches(s, lineBase))) {
      const payout = Math.round(bet * GEMS_SYMBOL_META[lineBase].payout * multiplier * 100) / 100
      lines.push({ lineIndex, cells, symbol: lineBase, payout })
    }
  })

  let payout = lines.reduce((a, l) => a + l.payout, 0)
  if (fullBoard) {
    payout = Math.round(bet * GEMS_SYMBOL_META[base].payout * multiplier * 9 * 100) / 100
  }

  return { payout, lines, fullBoard }
}

export const INTRO_STORAGE_KEY = 'zee9-fortune-gems-intro-skip'
