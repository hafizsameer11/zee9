import {
  chance,
  forcedLossRate,
  guaranteedSmallWinPayout,
  highWinPctInjectRate,
  pickWeighted,
  unitRand,
} from './rtp.js'

export const MC_NUMBERS = [0, 1, 2, 3, 5, 10] as const
export type McNumber = (typeof MC_NUMBERS)[number]

export const MC_MULTS = ['—', '2x', '5x', '10x', 'RESPIN'] as const
export type McMult = (typeof MC_MULTS)[number]

/** Relative weights matching client randomMult distribution. */
const MULT_WEIGHTS = [45, 25, 18, 9, 3] as const

const MAX_RESPIN_CHAIN = 5

export function multFactor(m: McMult): number {
  if (m === '2x') return 2
  if (m === '5x') return 5
  if (m === '10x') return 10
  return 1
}

export function evaluateSpin(
  reels: [McNumber, McNumber, McNumber],
  mult: McMult,
  bet: number,
): { win: number; kind: 'none' | 'match' | 'respin' } {
  if (mult === 'RESPIN') return { win: 0, kind: 'respin' }
  const [a, b, c] = reels
  if (a === b && b === c) {
    const base = a === 0 ? bet * 0.5 : bet * Math.max(1, a)
    return { win: Math.round(base * multFactor(mult)), kind: 'match' }
  }
  if (a === b || b === c || a === c) {
    const n = a === b ? a : b === c ? b : a
    const base = n === 0 ? bet * 0.1 : bet * 0.25 * Math.max(1, n)
    return { win: Math.round(base * multFactor(mult)), kind: 'match' }
  }
  return { win: 0, kind: 'none' }
}

function randomNumber(): McNumber {
  return MC_NUMBERS[Math.floor(unitRand() * MC_NUMBERS.length)]!
}

function randomMult(): McMult {
  return pickWeighted(MC_MULTS, MULT_WEIGHTS)
}

function randomReels(): [McNumber, McNumber, McNumber] {
  return [randomNumber(), randomNumber(), randomNumber()]
}

/** Three distinct numbers — guaranteed client-side loss. */
function lossReels(): [McNumber, McNumber, McNumber] {
  const pool = [...MC_NUMBERS]
  const a = pool.splice(Math.floor(unitRand() * pool.length), 1)[0]!
  const b = pool.splice(Math.floor(unitRand() * pool.length), 1)[0]!
  const c = pool.splice(Math.floor(unitRand() * pool.length), 1)[0]!
  return [a, b, c]
}

export type McStep = {
  reels: [McNumber, McNumber, McNumber]
  mult: McMult
  win: number
  kind: 'none' | 'match' | 'respin'
}

export type MoneyComingOutcome = {
  winRupees: number
  payload: {
    reels: [McNumber, McNumber, McNumber]
    mult: McMult
    win: number
    /** Full RESPIN chain including the final settling spin (length >= 1). */
    steps?: McStep[]
  }
}

/**
 * Exact EV of one natural spin as a fraction of bet.
 * RESPIN: E = E_direct / (1 - P(respin)), where E_direct counts only settling outcomes.
 */
function computeNaturalEv(): number {
  let direct = 0
  let respinW = 0
  let weightSum = 0
  for (let mi = 0; mi < MC_MULTS.length; mi++) {
    const mult = MC_MULTS[mi]!
    const mw = MULT_WEIGHTS[mi]!
    for (const a of MC_NUMBERS) {
      for (const b of MC_NUMBERS) {
        for (const c of MC_NUMBERS) {
          weightSum += mw
          if (mult === 'RESPIN') {
            respinW += mw
          } else {
            const { win } = evaluateSpin([a, b, c], mult, 1)
            direct += mw * win
          }
        }
      }
    }
  }
  if (weightSum <= 0) return 0
  const pRespin = respinW / weightSum
  const eDirect = direct / weightSum
  if (pRespin >= 0.999) return eDirect
  return eDirect / (1 - pRespin)
}

let cachedEv: number | null = null
export function naturalEv(): number {
  if (cachedEv == null) cachedEv = computeNaturalEv()
  return cachedEv
}

function drawNaturalStep(bet: number): McStep {
  const reels = randomReels()
  const mult = randomMult()
  const { win, kind } = evaluateSpin(reels, mult, bet)
  return { reels, mult, win, kind }
}

function resolveChain(bet: number): { steps: McStep[]; totalWin: number } {
  const steps: McStep[] = []
  let totalWin = 0
  for (let i = 0; i < MAX_RESPIN_CHAIN; i++) {
    const step = drawNaturalStep(bet)
    steps.push(step)
    if (step.kind === 'respin') continue
    totalWin = step.win
    break
  }
  // If we exhausted RESPINS, force a non-respin settle
  if (steps.length === 0 || steps[steps.length - 1]!.kind === 'respin') {
    let step = drawNaturalStep(bet)
    let guard = 0
    while (step.kind === 'respin' && guard++ < 20) step = drawNaturalStep(bet)
    if (step.kind === 'respin') {
      step = {
        reels: lossReels(),
        mult: '—',
        win: 0,
        kind: 'none',
      }
    }
    steps.push(step)
    totalWin = step.win
  }
  return { steps, totalWin }
}

export function spinMoneyComing(betRupees: number, winPct: number): MoneyComingOutcome {
  const q = forcedLossRate(naturalEv(), winPct)
  if (chance(q)) {
    const reels = lossReels()
    const mult: McMult = pickWeighted(['—', '2x', '5x', '10x'] as const, [50, 25, 15, 10])
    return {
      winRupees: 0,
      payload: { reels, mult, win: 0 },
    }
  }

  const { steps, totalWin } = resolveChain(betRupees)
  const last = steps[steps.length - 1]!
  if (totalWin <= 0) {
    const injectP = highWinPctInjectRate(winPct)
    if (injectP > 0 && chance(injectP)) {
      const payout = guaranteedSmallWinPayout(betRupees, winPct)
      return {
        winRupees: payout,
        payload: { reels: [1, 1, 1], mult: '—', win: payout },
      }
    }
    return {
      winRupees: 0,
      payload: { reels: last.reels, mult: last.mult, win: 0, steps: steps.length > 1 ? steps : undefined },
    }
  }

  return {
    winRupees: totalWin,
    payload: {
      reels: last.reels,
      mult: last.mult,
      win: totalWin,
      steps: steps.length > 1 ? steps : undefined,
    },
  }
}
