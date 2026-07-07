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

export const JHANDI_SYMBOLS = ['♣', '♦', '♥', '♠', '⬤', '▲'] as const
export type JhandiSymbol = (typeof JHANDI_SYMBOLS)[number]

export function rollJhandiDice(): JhandiSymbol[] {
  return Array.from({ length: 6 }, () => JHANDI_SYMBOLS[Math.floor(Math.random() * 6)]!)
}

export function jhandiPayout(betSymbol: JhandiSymbol, dice: JhandiSymbol[]): number {
  const count = dice.filter((s) => s === betSymbol).length
  if (count === 0) return 0
  return count + 1
}
