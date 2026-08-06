import {
  chance,
  forcedLossRate,
  guaranteedSmallWinPayout,
  highWinPctInjectRate,
  unitRand,
} from './rtp.js'

export const COLS = 5
export const ROWS = 3
export const LINES = 30
export const FREE_SPIN_COUNT = 8

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

type PayMeta = {
  id: SymbolId
  pays: [number, number, number]
  weight: number
  kind: 'special' | 'high' | 'mid' | 'low'
}

const SYMBOLS: PayMeta[] = [
  { id: 'wild', pays: [0, 0, 0], weight: 5, kind: 'special' },
  { id: 'scatter', pays: [0, 0, 0], weight: 4, kind: 'special' },
  { id: 'happiness', pays: [20, 80, 200], weight: 7, kind: 'high' },
  { id: 'rings', pays: [15, 50, 120], weight: 8, kind: 'high' },
  { id: 'shoes', pays: [10, 30, 80], weight: 10, kind: 'mid' },
  { id: 'envelopes', pays: [8, 25, 60], weight: 11, kind: 'mid' },
  { id: 'cakes', pays: [6, 20, 50], weight: 12, kind: 'mid' },
  { id: 'A', pays: [4, 12, 30], weight: 14, kind: 'low' },
  { id: 'K', pays: [3, 10, 25], weight: 15, kind: 'low' },
  { id: 'Q', pays: [2.5, 8, 20], weight: 16, kind: 'low' },
  { id: 'J', pays: [2, 6, 15], weight: 17, kind: 'low' },
]

const PAY_SYMBOLS = SYMBOLS.filter((s) => s.kind !== 'special')
const SYMBOL_MAP = Object.fromEntries(SYMBOLS.map((s) => [s.id, s])) as Record<SymbolId, PayMeta>

const PAYLINES: number[][] = (() => {
  const lines: number[][] = []
  for (let r = 0; r < 3; r++) lines.push([r, r, r, r, r])
  lines.push([0, 1, 2, 1, 0], [2, 1, 0, 1, 2], [0, 0, 1, 2, 2], [2, 2, 1, 0, 0])
  lines.push([1, 0, 0, 0, 1], [1, 2, 2, 2, 1], [0, 1, 0, 1, 0], [2, 1, 2, 1, 2])
  lines.push([1, 0, 1, 0, 1], [1, 2, 1, 2, 1], [0, 1, 1, 1, 0], [2, 1, 1, 1, 2])
  lines.push([0, 0, 0, 1, 2], [2, 2, 2, 1, 0], [1, 1, 0, 1, 1], [1, 1, 2, 1, 1])
  lines.push([0, 2, 0, 2, 0], [2, 0, 2, 0, 2], [0, 2, 1, 2, 0], [2, 0, 1, 0, 2])
  lines.push([0, 0, 2, 0, 0], [2, 2, 0, 2, 2], [1, 0, 2, 0, 1], [1, 2, 0, 2, 1])
  while (lines.length < 30) {
    const r = lines.length % 3
    lines.push([r, (r + 1) % 3, r, (r + 1) % 3, r])
  }
  return lines.slice(0, 30)
})()

function weightedPick(): SymbolId {
  const total = PAY_SYMBOLS.reduce((a, s) => a + s.weight, 0)
  let r = unitRand() * total
  for (const s of PAY_SYMBOLS) {
    r -= s.weight
    if (r <= 0) return s.id
  }
  return PAY_SYMBOLS[PAY_SYMBOLS.length - 1]!.id
}

function pickSpecial(boostScatter = false, boostWild = false): SymbolId | null {
  const roll = unitRand()
  const scatterChance = boostScatter ? 0.12 : 0.04
  const wildChance = boostWild ? 0.16 : 0.055
  if (roll < scatterChance) return 'scatter'
  if (roll < scatterChance + wildChance) return 'wild'
  return null
}

function fillGrid(forceLoss = false): SymbolId[][] {
  const grid: SymbolId[][] = Array.from({ length: COLS }, () =>
    Array.from({ length: ROWS }, () => pickSpecial() ?? weightedPick()),
  )
  if (!forceLoss) return grid
  for (let c = 0; c < COLS; c++) {
    for (let r = 0; r < ROWS; r++) {
      grid[c]![r] = PAY_SYMBOLS[(c + r * 2) % PAY_SYMBOLS.length]!.id
    }
  }
  for (let r = 0; r < ROWS; r++) {
    grid[0]![r] = 'J'
    grid[1]![r] = 'A'
  }
  return grid
}

function matches(a: SymbolId, b: SymbolId): boolean {
  if (a === 'scatter' || b === 'scatter') return a === b
  if (a === 'wild' || b === 'wild') return true
  return a === b
}

function lineSymbol(ids: SymbolId[]): SymbolId | null {
  let base: SymbolId | null = null
  for (const id of ids) {
    if (id === 'scatter') return null
    if (id === 'wild') continue
    if (!base) base = id
    else if (base !== id) return null
  }
  return base ?? (ids.every((x) => x === 'wild') ? 'wild' : null)
}

function evaluateGrid(grid: SymbolId[][], bet: number, mult: number): number {
  let total = 0
  const lineBet = bet / LINES
  for (const rows of PAYLINES) {
    const ids = rows.map((r, c) => grid[c]![r]!)
    const base = ids.find((id) => id !== 'wild' && id !== 'scatter') ?? 'wild'
    let len = 0
    for (let i = 0; i < 5; i++) {
      if (ids[i] !== 'scatter' && matches(base, ids[i]!)) len++
      else break
    }
    if (len < 3) continue
    const sym = lineSymbol(ids.slice(0, len))
    if (!sym || sym === 'scatter') continue
    const meta = SYMBOL_MAP[sym]
    if (!meta || meta.kind === 'special') {
      if (sym === 'wild') {
        total += SYMBOL_MAP.happiness.pays[len - 3]! * lineBet * mult
      }
      continue
    }
    total += meta.pays[len - 3]! * lineBet * mult
  }
  let scatters = 0
  for (let c = 0; c < COLS; c++) {
    for (let r = 0; r < ROWS; r++) {
      if (grid[c]![r] === 'scatter') scatters++
    }
  }
  if (scatters >= 3) total += bet * (scatters === 3 ? 2 : scatters === 4 ? 10 : 50)
  return Math.round(total * 100) / 100
}

function drawNatural(bet: number): { grid: SymbolId[][]; totalWin: number } {
  const grid = fillGrid(false)
  const totalWin = evaluateGrid(grid, bet, 1)
  return { grid, totalWin }
}

let cachedEv: number | null = null
const EV_FALLBACK = 0.85

function naturalEv(): number {
  if (cachedEv == null) {
    let sum = 0
    for (let i = 0; i < 3000; i++) sum += drawNatural(1).totalWin
    cachedEv = sum / 3000
    if (!Number.isFinite(cachedEv) || cachedEv <= 0) cachedEv = EV_FALLBACK
  }
  return cachedEv
}

export type DoubleFortuneOutcome = {
  winRupees: number
  payload: {
    grid: SymbolId[][]
    totalWin: number
    triggerFreeSpins: false
    appliedMult: 1
  }
}

export function spinDoubleFortune(betRupees: number, winPct: number): DoubleFortuneOutcome {
  const q = forcedLossRate(naturalEv(), winPct)
  if (chance(q)) {
    const grid = fillGrid(true)
    return {
      winRupees: 0,
      payload: { grid, totalWin: 0, triggerFreeSpins: false, appliedMult: 1 },
    }
  }

  const { grid, totalWin } = drawNatural(betRupees)
  if (totalWin <= 0) {
    const injectP = highWinPctInjectRate(winPct)
    if (injectP > 0 && chance(injectP)) {
      const payout = guaranteedSmallWinPayout(betRupees, winPct)
      return {
        winRupees: payout,
        payload: { grid, totalWin: payout, triggerFreeSpins: false, appliedMult: 1 },
      }
    }
    return {
      winRupees: 0,
      payload: { grid, totalWin: 0, triggerFreeSpins: false, appliedMult: 1 },
    }
  }

  return {
    winRupees: totalWin,
    payload: {
      grid,
      totalWin,
      triggerFreeSpins: false,
      appliedMult: 1,
    },
  }
}
