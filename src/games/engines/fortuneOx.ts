export type OxSymbol = 'ox' | 'coin' | 'envelope' | 'ingot' | 'trophy' | 'A' | 'K' | 'Q' | 'J'

export const OX_SYMBOL_META: Record<
  OxSymbol,
  { emoji: string; label: string; weight: number; payout3: number; gold?: boolean }
> = {
  ox: { emoji: '🐂', label: 'Ox Wild', weight: 6, payout3: 100, gold: true },
  coin: { emoji: '🪙', label: 'Gold Coin', weight: 14, payout3: 25 },
  envelope: { emoji: '🧧', label: 'Firecracker', weight: 16, payout3: 15 },
  ingot: { emoji: '🏆', label: 'Gold Ingot', weight: 18, payout3: 10 },
  trophy: { emoji: '🏆', label: 'Trophy', weight: 12, payout3: 8 },
  A: { emoji: 'A', label: 'Ace', weight: 20, payout3: 5 },
  K: { emoji: 'K', label: 'King', weight: 22, payout3: 4 },
  Q: { emoji: 'Q', label: 'Queen', weight: 24, payout3: 3 },
  J: { emoji: 'J', label: 'Jack', weight: 26, payout3: 2 },
}

const SYMBOLS = Object.keys(OX_SYMBOL_META) as OxSymbol[]

function weightedPick(): OxSymbol {
  const total = SYMBOLS.reduce((a, s) => a + OX_SYMBOL_META[s].weight, 0)
  let r = Math.random() * total
  for (const s of SYMBOLS) {
    r -= OX_SYMBOL_META[s].weight
    if (r <= 0) return s
  }
  return 'J'
}

/** 3 rows × 5 columns */
export function spinOxGrid(): OxSymbol[][] {
  return Array.from({ length: 3 }, () => Array.from({ length: 5 }, () => weightedPick()))
}

function matchesSymbol(a: OxSymbol, b: OxSymbol): boolean {
  return a === b || a === 'ox' || b === 'ox'
}

function resolveLine(symbols: OxSymbol[]): OxSymbol {
  const nonWild = symbols.find((s) => s !== 'ox')
  return nonWild ?? 'ox'
}

function rowPayout(row: OxSymbol[], bet: number): { payout: number; symbol: OxSymbol; count: number; start: number } | null {
  let best: { payout: number; symbol: OxSymbol; count: number; start: number } | null = null
  for (let len = 5; len >= 3; len--) {
    for (let start = 0; start <= row.length - len; start++) {
      const slice = row.slice(start, start + len)
      const base = resolveLine(slice)
      if (slice.every((s) => matchesSymbol(s, base))) {
        const mult = OX_SYMBOL_META[base].payout3 * (len >= 4 ? 1.5 : 1)
        const payout = Math.round(bet * mult * 100) / 100
        if (!best || payout > best.payout) {
          best = { payout, symbol: base, count: len, start }
        }
      }
    }
  }
  return best
}

export function evaluateOxGrid(
  grid: OxSymbol[][],
  bet: number,
): { payout: number; winRow: number; symbol: OxSymbol; count: number; start: number } | null {
  let best: { payout: number; winRow: number; symbol: OxSymbol; count: number; start: number } | null = null
  grid.forEach((row, ri) => {
    const r = rowPayout(row, bet)
    if (r && (!best || r.payout > best.payout)) {
      best = { ...r, winRow: ri }
    }
  })
  return best
}

export const OX_BIG_WIN_HISTORY = [125, 42, 8, 98, 15, 30, 6, 200, 12, 55, 9, 76]
