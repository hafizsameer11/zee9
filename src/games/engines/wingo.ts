export type WingoColor = 'red' | 'green' | 'violet'
export type WingoSize = 'big' | 'small'
export type WingoBetType = 'number' | 'red' | 'green' | 'violet' | 'big' | 'small'

export type WingoResult = {
  number: number
  color: WingoColor
  size: WingoSize
  period: string
}

export type WingoBet = {
  type: WingoBetType
  value?: number
  amount: number
}

const COLOR_MAP: Record<number, WingoColor> = {
  0: 'violet',
  1: 'green',
  2: 'red',
  3: 'green',
  4: 'red',
  5: 'violet',
  6: 'red',
  7: 'green',
  8: 'red',
  9: 'green',
}

export function numberToColor(n: number): WingoColor {
  return COLOR_MAP[n] ?? 'red'
}

/** Display colors for history swatches (0 and 5 show dual colors). */
export function numberToDisplayColors(n: number): WingoColor[] {
  if (n === 0) return ['red', 'violet']
  if (n === 5) return ['green', 'violet']
  return [numberToColor(n)]
}

export function numberToSize(n: number): WingoSize {
  return n >= 5 ? 'big' : 'small'
}

export function generateWingoResult(period: string): WingoResult {
  const number = Math.floor(Math.random() * 10)
  return {
    number,
    color: numberToColor(number),
    size: numberToSize(number),
    period,
  }
}

export function wingoPayoutMultiplier(bet: WingoBet, result: WingoResult): number {
  switch (bet.type) {
    case 'number':
      return bet.value === result.number ? 9 : 0
    case 'green':
      if (result.number === 5) return 1.5
      return result.color === 'green' ? 2 : 0
    case 'red':
      if (result.number === 0) return 1.5
      return result.color === 'red' ? 2 : 0
    case 'violet':
      return result.color === 'violet' ? 4.5 : 0
    case 'big':
      return result.size === 'big' ? 2 : 0
    case 'small':
      return result.size === 'small' ? 2 : 0
    default:
      return 0
  }
}

export function formatPeriod(ts: number): string {
  const d = new Date(ts)
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}${pad(d.getMonth() + 1)}${pad(d.getDate())}${pad(d.getHours())}${pad(d.getMinutes())}${pad(d.getSeconds())}`
}
