import { BLACK_NUMBERS, RED_NUMBERS } from '../constants/rouletteConfig'

export type NumberColor = 'red' | 'black' | 'green'

export function colorOfNumber(n: number): NumberColor {
  if (n === 0) return 'green'
  if (RED_NUMBERS.has(n)) return 'red'
  if (BLACK_NUMBERS.has(n)) return 'black'
  return 'green'
}

export function isValidRouletteNumber(n: number): boolean {
  return Number.isInteger(n) && n >= 0 && n <= 36
}

/** Classic table layout: columns are 3, 2, 1 from top in UI terms (row major 3-wide). */
export const TABLE_NUMBERS: number[][] = [
  [3, 6, 9, 12, 15, 18, 21, 24, 27, 30, 33, 36],
  [2, 5, 8, 11, 14, 17, 20, 23, 26, 29, 32, 35],
  [1, 4, 7, 10, 13, 16, 19, 22, 25, 28, 31, 34],
]

export function columnOf(n: number): 1 | 2 | 3 | 0 {
  if (n <= 0 || n > 36) return 0
  const mod = n % 3
  if (mod === 0) return 3
  if (mod === 2) return 2
  return 1
}

export function dozenOf(n: number): 1 | 2 | 3 | 0 {
  if (n <= 0 || n > 36) return 0
  if (n <= 12) return 1
  if (n <= 24) return 2
  return 3
}
