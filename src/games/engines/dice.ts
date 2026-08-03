export type UpDownChoice = 'down' | 'seven' | 'up'

export function rollTwoDice(): [number, number] {
  return [Math.floor(Math.random() * 6) + 1, Math.floor(Math.random() * 6) + 1]
}

export function upDownPayout(choice: UpDownChoice, sum: number): number {
  if (choice === 'seven') return sum === 7 ? 5 : 0
  if (choice === 'down') return sum < 7 ? 2 : 0
  return sum > 7 ? 2 : 0
}

export type BlackRedChoice = 'red' | 'black'

const RED_NUMBERS = new Set([1, 3, 5, 7, 9, 12, 14, 16, 18, 19, 21, 23, 25, 27, 30, 32, 34, 36])

export function spinRouletteColor(): BlackRedChoice {
  const n = Math.floor(Math.random() * 37)
  if (n === 0) return Math.random() < 0.5 ? 'red' : 'black'
  return RED_NUMBERS.has(n) ? 'red' : 'black'
}

export const JHANDI_SYMBOLS = ['club', 'crown', 'spade', 'diamond', 'flag', 'heart'] as const
export type JhandiSymbol = (typeof JHANDI_SYMBOLS)[number]

export const JHANDI_SYMBOL_LABELS: Record<JhandiSymbol, string> = {
  club: 'Club',
  crown: 'Crown',
  spade: 'Spade',
  diamond: 'Diamond',
  flag: 'Flag',
  heart: 'Heart',
}

export function rollJhandiDice(): JhandiSymbol[] {
  return Array.from({ length: 6 }, () => JHANDI_SYMBOLS[Math.floor(Math.random() * 6)]!)
}

/** Payout multiplier: number of matching dice + 1 (e.g. 2 matches → ×3). */
export function jhandiPayout(betSymbol: JhandiSymbol, dice: JhandiSymbol[]): number {
  const count = dice.filter((s) => s === betSymbol).length
  if (count === 0) return 0
  return count + 1
}

/** Count how many dice show each symbol. */
export function jhandiCounts(dice: JhandiSymbol[]): Record<JhandiSymbol, number> {
  const counts = Object.fromEntries(JHANDI_SYMBOLS.map((s) => [s, 0])) as Record<JhandiSymbol, number>
  for (const s of dice) counts[s]++
  return counts
}

/** Best payout multiplier across all symbols with bets. */
export function jhandiBestPayout(
  bets: Partial<Record<JhandiSymbol, number>>,
  dice: JhandiSymbol[],
): { symbol: JhandiSymbol; mult: number; payout: number } | null {
  let best: { symbol: JhandiSymbol; mult: number; payout: number } | null = null
  for (const sym of JHANDI_SYMBOLS) {
    const stake = bets[sym] ?? 0
    if (stake <= 0) continue
    const mult = jhandiPayout(sym, dice)
    const payout = stake * mult
    if (mult > 0 && (!best || payout > best.payout)) {
      best = { symbol: sym, mult, payout }
    }
  }
  return best
}

export function jhandiTotalPayout(
  bets: Partial<Record<JhandiSymbol, number>>,
  dice: JhandiSymbol[],
): number {
  let total = 0
  for (const sym of JHANDI_SYMBOLS) {
    const stake = bets[sym] ?? 0
    if (stake > 0) total += stake * jhandiPayout(sym, dice)
  }
  return total
}
