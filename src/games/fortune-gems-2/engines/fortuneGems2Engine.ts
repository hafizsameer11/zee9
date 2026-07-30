import {
  MULTIPLIERS,
  SYMBOL_META,
  WHEEL_REWARDS,
  type Fg2Multiplier,
  type Fg2Symbol,
  type SpecialToken,
} from '../constants/symbolConfig'

const SYMBOLS = Object.keys(SYMBOL_META) as Fg2Symbol[]

const PAYLINES: [number, number, number][] = [
  [0, 1, 2],
  [3, 4, 5],
  [6, 7, 8],
  [0, 4, 8],
  [6, 4, 2],
]

function weightedPick(): Fg2Symbol {
  const total = SYMBOLS.reduce((a, s) => a + SYMBOL_META[s].weight, 0)
  let r = Math.random() * total
  for (const s of SYMBOLS) {
    r -= SYMBOL_META[s].weight
    if (r <= 0) return s
  }
  return 'J'
}

export function spinGrid(): Fg2Symbol[] {
  return Array.from({ length: 9 }, () => weightedPick())
}

export function buildReelStrip(len = 24): Fg2Symbol[] {
  return Array.from({ length: len }, () => weightedPick())
}

function pickMultiplier(): Fg2Multiplier {
  const weights: Record<Fg2Multiplier, number> = { 2: 28, 3: 24, 5: 20, 10: 16, 15: 12 }
  let r = Math.random() * MULTIPLIERS.reduce((a, m) => a + weights[m], 0)
  for (const m of MULTIPLIERS) {
    r -= weights[m]
    if (r <= 0) return m
  }
  return 2
}

/** ~18% chance of wheel trigger on special reel */
export function spinSpecial(): SpecialToken {
  if (Math.random() < 0.18) {
    return { kind: 'wheel', color: Math.random() < 0.5 ? 'green' : 'red' }
  }
  return { kind: 'mult', value: pickMultiplier() }
}

export function buildSpecialStrip(len = 20): SpecialToken[] {
  return Array.from({ length: len }, () => spinSpecial())
}

export function spinWheelReward(): number {
  const weights = WHEEL_REWARDS.map((_, i) => Math.max(1, 14 - i))
  const total = weights.reduce((a, b) => a + b, 0)
  let r = Math.random() * total
  for (let i = 0; i < WHEEL_REWARDS.length; i++) {
    r -= weights[i]
    if (r <= 0) return WHEEL_REWARDS[i]
  }
  return WHEEL_REWARDS[0]
}

function matches(a: Fg2Symbol, b: Fg2Symbol) {
  return a === b || a === 'wild' || b === 'wild'
}

function resolveLine(symbols: Fg2Symbol[]): Fg2Symbol {
  return symbols.find((s) => s !== 'wild') ?? 'wild'
}

export type Fg2WinLine = {
  lineIndex: number
  cells: [number, number, number]
  symbol: Fg2Symbol
  payout: number
}

export type Fg2SpinResult = {
  grid: Fg2Symbol[]
  special: SpecialToken
  lines: Fg2WinLine[]
  fullBoard: boolean
  basePayout: number
  multiplier: Fg2Multiplier
  wheelTriggered: boolean
  wheelReward: number
  payout: number
}

export function evaluateSpin(
  grid: Fg2Symbol[],
  special: SpecialToken,
  bet: number,
  wheelReward = 0,
): Fg2SpinResult {
  const wheelTriggered = special.kind === 'wheel'
  const multiplier: Fg2Multiplier = special.kind === 'mult' ? special.value : 2
  const base = resolveLine(grid)
  const fullBoard = grid.every((s) => matches(s, base))
  const lines: Fg2WinLine[] = []

  PAYLINES.forEach((cells, lineIndex) => {
    const symbols = cells.map((i) => grid[i])
    const lineBase = resolveLine(symbols)
    if (symbols.every((s) => matches(s, lineBase))) {
      const payout = Math.round(bet * SYMBOL_META[lineBase].payout * 100) / 100
      lines.push({ lineIndex, cells, symbol: lineBase, payout })
    }
  })

  let basePayout = lines.reduce((a, l) => a + l.payout, 0)
  if (fullBoard) {
    basePayout = Math.round(bet * SYMBOL_META[base].payout * 9 * 100) / 100
  }

  const wheelPay = wheelTriggered ? Math.round(bet * wheelReward * 100) / 100 : 0
  const payout = Math.round((basePayout * multiplier + wheelPay) * 100) / 100

  return {
    grid,
    special,
    lines,
    fullBoard,
    basePayout,
    multiplier,
    wheelTriggered,
    wheelReward: wheelTriggered ? wheelReward : 0,
    payout,
  }
}

export function neighbors(sym: Fg2Symbol): Fg2Symbol[] {
  const pool = SYMBOLS.filter((s) => s !== sym)
  return [pool[0] ?? 'J', sym, pool[1] ?? 'Q']
}
