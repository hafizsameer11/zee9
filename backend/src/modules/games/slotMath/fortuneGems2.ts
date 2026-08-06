import {
  chance,
  forcedLossRate,
  guaranteedSmallWinPayout,
  highWinPctInjectRate,
  pickWeighted,
  unitRand,
} from './rtp.js'

export type Fg2Symbol = 'wild' | 'ruby' | 'sapphire' | 'emerald' | 'A' | 'K' | 'Q' | 'J'
export type Fg2Multiplier = 2 | 3 | 5 | 10 | 15

export type SpecialToken =
  | { kind: 'mult'; value: Fg2Multiplier }
  | { kind: 'wheel'; color: 'green' | 'red' }

const SYMBOLS: Fg2Symbol[] = ['wild', 'ruby', 'sapphire', 'emerald', 'A', 'K', 'Q', 'J']
const SYMBOL_WEIGHTS: Record<Fg2Symbol, number> = {
  wild: 5,
  ruby: 12,
  sapphire: 13,
  emerald: 14,
  A: 16,
  K: 18,
  Q: 20,
  J: 22,
}
const SYMBOL_PAYOUT: Record<Fg2Symbol, number> = {
  wild: 50,
  ruby: 14,
  sapphire: 12,
  emerald: 10,
  A: 6,
  K: 5,
  Q: 4,
  J: 3,
}

export const MULTIPLIERS: Fg2Multiplier[] = [2, 3, 5, 10, 15]
export const WHEEL_REWARDS = [3, 5, 8, 10, 15, 20, 30, 50, 100, 200, 500, 1000] as const

const PAYLINES: [number, number, number][] = [
  [0, 1, 2],
  [3, 4, 5],
  [6, 7, 8],
  [0, 4, 8],
  [6, 4, 2],
]

export type Fg2SpinResult = {
  grid: Fg2Symbol[]
  special: SpecialToken
  fullBoard: boolean
  basePayout: number
  multiplier: Fg2Multiplier
  wheelTriggered: boolean
  wheelReward: number
  payout: number
}

function weightedPick(): Fg2Symbol {
  const total = SYMBOLS.reduce((a, s) => a + SYMBOL_WEIGHTS[s], 0)
  let r = unitRand() * total
  for (const s of SYMBOLS) {
    r -= SYMBOL_WEIGHTS[s]
    if (r <= 0) return s
  }
  return 'J'
}

function spinGrid(): Fg2Symbol[] {
  return Array.from({ length: 9 }, () => weightedPick())
}

function pickMultiplier(): Fg2Multiplier {
  const weights: Record<Fg2Multiplier, number> = { 2: 28, 3: 24, 5: 20, 10: 16, 15: 12 }
  return pickWeighted(MULTIPLIERS, MULTIPLIERS.map((m) => weights[m]))
}

function spinSpecial(): SpecialToken {
  if (unitRand() < 0.18) {
    return { kind: 'wheel', color: unitRand() < 0.5 ? 'green' : 'red' }
  }
  return { kind: 'mult', value: pickMultiplier() }
}

function spinWheelReward(): number {
  const weights = WHEEL_REWARDS.map((_, i) => Math.max(1, 14 - i))
  return pickWeighted([...WHEEL_REWARDS], weights)
}

function matches(a: Fg2Symbol, b: Fg2Symbol) {
  return a === b || a === 'wild' || b === 'wild'
}

function resolveLine(symbols: Fg2Symbol[]): Fg2Symbol {
  return symbols.find((s) => s !== 'wild') ?? 'wild'
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

  let basePayout = 0
  for (const cells of PAYLINES) {
    const symbols = cells.map((i) => grid[i]!)
    const lineBase = resolveLine(symbols)
    if (symbols.every((s) => matches(s, lineBase))) {
      basePayout += Math.round(bet * SYMBOL_PAYOUT[lineBase] * 100) / 100
    }
  }

  if (fullBoard) {
    basePayout = Math.round(bet * SYMBOL_PAYOUT[base] * 9 * 100) / 100
  }

  const wheelPay = wheelTriggered ? Math.round(bet * wheelReward * 100) / 100 : 0
  const payout = Math.round((basePayout * multiplier + wheelPay) * 100) / 100

  return {
    grid,
    special,
    fullBoard,
    basePayout,
    multiplier,
    wheelTriggered,
    wheelReward: wheelTriggered ? wheelReward : 0,
    payout,
  }
}

function lossGrid(): Fg2Symbol[] {
  return ['J', 'Q', 'K', 'A', 'J', 'Q', 'K', 'A', 'Q']
}

function lossSpecial(): SpecialToken {
  return { kind: 'mult', value: 2 }
}

function drawNatural(bet: number): Fg2SpinResult {
  const grid = spinGrid()
  const special = spinSpecial()
  const wheelReward = special.kind === 'wheel' ? spinWheelReward() : 0
  return evaluateSpin(grid, special, bet, wheelReward)
}

let cachedEv: number | null = null
const EV_FALLBACK = 1.4

function naturalEv(): number {
  if (cachedEv == null) {
    let sum = 0
    const samples = 4000
    for (let i = 0; i < samples; i++) sum += drawNatural(1).payout
    cachedEv = sum / samples
    if (!Number.isFinite(cachedEv) || cachedEv <= 0) cachedEv = EV_FALLBACK
  }
  return cachedEv
}

export type FortuneGems2Outcome = {
  winRupees: number
  payload: {
    grid: Fg2Symbol[]
    special: SpecialToken
    wheelReward?: number
    win: number
  }
}

/** Minimum RTP win — wheel pays exactly the settled amount (no fake line × mult). */
function smallWin(betRupees: number, payoutRupees: number): FortuneGems2Outcome {
  const payout = Math.max(0, Math.round(payoutRupees * 100) / 100)
  const wheelReward = betRupees > 0 ? payout / betRupees : 1
  const grid = lossGrid()
  const special: SpecialToken = { kind: 'wheel', color: 'green' }
  return {
    winRupees: payout,
    payload: { grid, special, wheelReward, win: payout },
  }
}

export function spinFortuneGems2(betRupees: number, winPct: number): FortuneGems2Outcome {
  const q = forcedLossRate(naturalEv(), winPct)
  if (chance(q)) {
    const grid = lossGrid()
    const special = lossSpecial()
    return {
      winRupees: 0,
      payload: { grid, special, win: 0 },
    }
  }

  const result = drawNatural(betRupees)
  if (result.payout > 0) {
    return {
      winRupees: result.payout,
      payload: {
        grid: result.grid,
        special: result.special,
        wheelReward: result.wheelReward > 0 ? result.wheelReward : undefined,
        win: result.payout,
      },
    }
  }

  const injectP = highWinPctInjectRate(winPct)
  if (injectP > 0 && chance(injectP)) {
    return smallWin(betRupees, guaranteedSmallWinPayout(betRupees, winPct))
  }

  return {
    winRupees: 0,
    payload: {
      grid: result.grid,
      special: result.special,
      win: 0,
    },
  }
}
