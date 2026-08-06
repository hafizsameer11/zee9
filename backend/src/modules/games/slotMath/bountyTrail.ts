import {
  chance,
  forcedLossRate,
  guaranteedSmallWinPayout,
  highWinPctInjectRate,
  unitRand,
} from './rtp.js'

export const COLS = 6
export const ROWS = 4
export const FREE_SPIN_COUNT = 10
export const FREE_SPIN_EXTRA = 5
export const FEATURE_BUY_MULT = 80
export const MULTIPLIER_TRACK = [1, 2, 4, 8, 16, 32, 64, 128, 256, 512, 1024] as const

export type SymbolId =
  | 'hunter'
  | 'outlaw'
  | 'sheriff'
  | 'wild'
  | 'scatter'
  | 'bonus'
  | 'hat'
  | 'whiskey'
  | 'revolver'
  | 'boots'
  | 'badge'
  | 'belt'
  | 'pouch'
  | 'A'
  | 'K'
  | 'Q'
  | 'J'
  | 'T'

type PayMeta = {
  id: SymbolId
  pays: [number, number, number, number]
  weight: number
  kind: 'character' | 'special' | 'object' | 'low'
}

const SYMBOLS: PayMeta[] = [
  { id: 'hunter', pays: [2.5, 8, 25, 80], weight: 6, kind: 'character' },
  { id: 'outlaw', pays: [2, 6, 18, 55], weight: 7, kind: 'character' },
  { id: 'sheriff', pays: [1.8, 5, 14, 40], weight: 8, kind: 'character' },
  { id: 'wild', pays: [0, 0, 0, 0], weight: 5, kind: 'special' },
  { id: 'scatter', pays: [0, 0, 0, 0], weight: 4, kind: 'special' },
  { id: 'bonus', pays: [0, 0, 0, 0], weight: 3, kind: 'special' },
  { id: 'hat', pays: [1.2, 3.5, 10, 28], weight: 10, kind: 'object' },
  { id: 'whiskey', pays: [1, 3, 8, 22], weight: 11, kind: 'object' },
  { id: 'revolver', pays: [0.9, 2.5, 7, 18], weight: 11, kind: 'object' },
  { id: 'boots', pays: [0.8, 2.2, 6, 15], weight: 12, kind: 'object' },
  { id: 'badge', pays: [0.7, 2, 5, 12], weight: 12, kind: 'object' },
  { id: 'belt', pays: [0.6, 1.8, 4.5, 10], weight: 13, kind: 'object' },
  { id: 'pouch', pays: [0.5, 1.5, 4, 9], weight: 13, kind: 'object' },
  { id: 'A', pays: [0.4, 1.2, 3, 7], weight: 16, kind: 'low' },
  { id: 'K', pays: [0.35, 1, 2.5, 6], weight: 17, kind: 'low' },
  { id: 'Q', pays: [0.3, 0.9, 2.2, 5], weight: 18, kind: 'low' },
  { id: 'J', pays: [0.25, 0.8, 2, 4.5], weight: 18, kind: 'low' },
  { id: 'T', pays: [0.2, 0.7, 1.8, 4], weight: 19, kind: 'low' },
]

const SYMBOL_MAP = Object.fromEntries(SYMBOLS.map((s) => [s.id, s])) as Record<SymbolId, PayMeta>
const PAY_SYMBOLS = SYMBOLS.filter((s) => s.kind !== 'special')

export type Cell = {
  id: SymbolId
  gold: boolean
  goldMult: number
}

export type WayWin = {
  symbol: SymbolId
  length: number
  ways: number
  payout: number
  positions: Array<{ col: number; row: number }>
}

export type BountySpinFrame = {
  grid: Cell[][]
  wayWins: WayWin[]
  lineWin: number
  scatterCount: number
  scatterWin: number
  totalWin: number
  multIndex: number
  appliedMult: number
  triggerFreeSpins: boolean
  freeSpinsAwarded: number
  goldActivated: Array<{ col: number; row: number; mult: number }>
}

export type BountyOutcome = {
  winRupees: number
  payload: BountySpinFrame & {
    /** When bonus triggers (or Feature Buy), every free-spin frame in order. */
    freeSpins?: BountySpinFrame[]
    /** Sum of base spin + free spins (same as winRupees). */
    featureTotal?: number
  }
}

function weightedPick(exclude: SymbolId[] = []): SymbolId {
  const pool = PAY_SYMBOLS.filter((s) => !exclude.includes(s.id))
  const total = pool.reduce((a, s) => a + s.weight, 0)
  let r = unitRand() * total
  for (const s of pool) {
    r -= s.weight
    if (r <= 0) return s.id
  }
  return pool[pool.length - 1]!.id
}

function pickSpecial(boostScatter = false, boostWild = false): SymbolId | null {
  const roll = unitRand()
  // Milder free-spin boosts — keep EV in a calibratable range (~1–3× bet)
  const scatterChance = boostScatter ? 0.055 : 0.028
  const wildChance = boostWild ? 0.08 : 0.05
  const bonusChance = 0.012
  if (roll < scatterChance) return 'scatter'
  if (roll < scatterChance + wildChance) return 'wild'
  if (roll < scatterChance + wildChance + bonusChance) return 'bonus'
  return null
}

function makeCell(id: SymbolId, goldBoost = false): Cell {
  const canGold = id !== 'scatter' && id !== 'bonus'
  const goldChance = goldBoost ? 0.12 : 0.06
  const gold = canGold && unitRand() < goldChance
  const goldMult = gold ? ([1, 2, 3, 4] as const)[Math.floor(unitRand() * 4)]! : 1
  return { id, gold, goldMult }
}

function fillGrid(opts: { freeSpin?: boolean; forceLoss?: boolean }): Cell[][] {
  const freeSpin = opts.freeSpin === true
  if (opts.forceLoss) {
    const grid: Cell[][] = Array.from({ length: COLS }, () =>
      Array.from({ length: ROWS }, () => makeCell(weightedPick(), false)),
    )
    const a = PAY_SYMBOLS[0]!.id
    const b = PAY_SYMBOLS[5]!.id
    for (let r = 0; r < ROWS; r++) {
      grid[0]![r] = makeCell(a, false)
      grid[1]![r] = makeCell(b, false)
    }
    // Strip scatters so we never accidentally trigger bonus on a forced loss
    for (let c = 0; c < COLS; c++) {
      for (let r = 0; r < ROWS; r++) {
        if (grid[c]![r]!.id === 'scatter' || grid[c]![r]!.id === 'bonus') {
          grid[c]![r] = makeCell(weightedPick(), false)
        }
      }
    }
    return grid
  }

  return Array.from({ length: COLS }, () =>
    Array.from({ length: ROWS }, () =>
      makeCell(pickSpecial(freeSpin, freeSpin) ?? weightedPick(), freeSpin),
    ),
  )
}

function matches(a: SymbolId, b: SymbolId): boolean {
  if (a === 'scatter' || b === 'scatter' || a === 'bonus' || b === 'bonus') return false
  return a === b || a === 'wild' || b === 'wild'
}

export function evaluateWays(grid: Cell[][], bet: number, mult: number): WayWin[] {
  const wins: WayWin[] = []
  const candidates = new Set<SymbolId>()
  let reel0HasWild = false
  for (const cell of grid[0]!) {
    if (cell.id === 'scatter' || cell.id === 'bonus') continue
    if (cell.id === 'wild') {
      reel0HasWild = true
    } else {
      candidates.add(cell.id)
    }
  }
  // Wild on reel 0 substitutes for every pay symbol that appears somewhere in the grid
  if (reel0HasWild) {
    for (let c = 0; c < COLS; c++) {
      for (let r = 0; r < ROWS; r++) {
        const id = grid[c]![r]!.id
        if (id !== 'wild' && id !== 'scatter' && id !== 'bonus') candidates.add(id)
      }
    }
    // If the grid is all wilds/scatters, fall back to a mid pay symbol
    if (candidates.size === 0) candidates.add('hat')
  }

  for (const symbol of candidates) {
    if (symbol === 'wild') continue
    const counts: number[] = []
    const positions: Array<{ col: number; row: number }> = []
    let broken = false
    for (let c = 0; c < COLS; c++) {
      const rows: number[] = []
      for (let r = 0; r < ROWS; r++) {
        const cell = grid[c]![r]!
        if (matches(cell.id, symbol)) rows.push(r)
      }
      if (rows.length === 0) {
        broken = true
        break
      }
      counts.push(rows.length)
      rows.forEach((row) => positions.push({ col: c, row }))
    }
    const length = broken ? counts.length : COLS
    if (length < 3) continue
    const ways = counts.slice(0, length).reduce((a, n) => a * n, 1)
    const meta = SYMBOL_MAP[symbol]
    const payIndex = Math.min(3, length - 3)
    const payout = Math.round(bet * meta.pays[payIndex]! * ways * mult * 100) / 100
    if (payout <= 0) continue
    wins.push({
      symbol,
      length,
      ways,
      payout,
      positions: positions.filter((p) => p.col < length),
    })
  }

  const best = new Map<SymbolId, WayWin>()
  for (const w of wins) {
    const prev = best.get(w.symbol)
    if (!prev || w.payout > prev.payout) best.set(w.symbol, w)
  }
  return [...best.values()].sort((a, b) => b.payout - a.payout)
}

function countScatters(grid: Cell[][]): Array<{ col: number; row: number }> {
  const out: Array<{ col: number; row: number }> = []
  for (let c = 0; c < COLS; c++) {
    for (let r = 0; r < ROWS; r++) {
      if (grid[c]![r]!.id === 'scatter') out.push({ col: c, row: r })
    }
  }
  return out
}

export function evaluateFrame(
  grid: Cell[][],
  bet: number,
  startMultIndex: number,
): BountySpinFrame {
  let multIndex = startMultIndex
  const goldActivated: BountySpinFrame['goldActivated'] = []
  /** Cap trail growth so a single spin cannot jump to x1024 (keeps EV finite). */
  const maxStep = startMultIndex + 2

  for (let c = 0; c < COLS; c++) {
    for (let r = 0; r < ROWS; r++) {
      const cell = grid[c]![r]!
      if (cell.gold && cell.goldMult > 1) {
        goldActivated.push({ col: c, row: r, mult: cell.goldMult })
        multIndex = Math.min(MULTIPLIER_TRACK.length - 1, multIndex + 1, maxStep)
      }
    }
  }

  const appliedMult = MULTIPLIER_TRACK[Math.min(multIndex, MULTIPLIER_TRACK.length - 1)]!
  const wayWins = evaluateWays(grid, bet, appliedMult)
  const lineWin = Math.round(wayWins.reduce((a, w) => a + w.payout, 0) * 100) / 100

  const scatters = countScatters(grid)
  const scatterCount = scatters.length
  let scatterWin = 0
  if (scatterCount >= 3) {
    const scatterPay = scatterCount === 3 ? 2 : scatterCount === 4 ? 8 : 25
    scatterWin = Math.round(bet * scatterPay * appliedMult * 100) / 100
  }

  const triggerFreeSpins = scatterCount >= 3
  const freeSpinsAwarded = triggerFreeSpins
    ? scatterCount >= 4
      ? FREE_SPIN_COUNT + FREE_SPIN_EXTRA
      : FREE_SPIN_COUNT
    : 0

  const totalWinRaw = Math.round((lineWin + scatterWin) * 100) / 100
  /** Hard ceiling keeps RTP calibratable (display matches settlement). */
  const totalWin = Math.min(totalWinRaw, bet * 80)

  return {
    grid,
    wayWins,
    lineWin,
    scatterCount,
    scatterWin,
    totalWin,
    multIndex,
    appliedMult,
    triggerFreeSpins,
    freeSpinsAwarded,
    goldActivated,
  }
}

/** Scale a frame's displayed wins so settlement matches what the player sees. */
function scaleFrameWin(frame: BountySpinFrame, newTotal: number): BountySpinFrame {
  const old = frame.totalWin
  if (newTotal <= 0 || old <= 0) {
    return {
      ...frame,
      totalWin: 0,
      lineWin: 0,
      scatterWin: 0,
      wayWins: [],
    }
  }
  if (Math.abs(newTotal - old) < 0.001) return frame
  const ratio = newTotal / old
  return {
    ...frame,
    totalWin: newTotal,
    lineWin: Math.round(frame.lineWin * ratio * 100) / 100,
    scatterWin: Math.round(frame.scatterWin * ratio * 100) / 100,
    wayWins: frame.wayWins.map((w) => ({
      ...w,
      payout: Math.round(w.payout * ratio * 100) / 100,
    })),
  }
}

/** Proportionally scale frame wins so their sum equals the credited total. */
function normalizeFramesToTotal(frames: BountySpinFrame[], targetTotal: number): BountySpinFrame[] {
  const raw = frames.reduce((s, f) => s + f.totalWin, 0)
  if (raw <= 0 || targetTotal <= 0) {
    return frames.map((f) => scaleFrameWin(f, 0))
  }
  if (raw <= targetTotal + 0.001) return frames
  let allocated = 0
  const n = frames.length
  return frames.map((f, i) => {
    let win: number
    if (i === n - 1) {
      win = Math.round((targetTotal - allocated) * 100) / 100
    } else {
      win = Math.round((f.totalWin / raw) * targetTotal * 100) / 100
      allocated += win
    }
    return scaleFrameWin(f, win)
  })
}

function runFreeSpinSequence(
  bet: number,
  awarded: number,
  startMultIndex: number,
): { frames: BountySpinFrame[]; total: number; endMultIndex: number } {
  const frames: BountySpinFrame[] = []
  let left = Math.min(awarded, 25)
  let multIndex = startMultIndex
  let total = 0
  let guard = 0
  let retriggers = 0
  while (left > 0 && guard++ < 80) {
    const grid = fillGrid({ freeSpin: true })
    const frame = evaluateFrame(grid, bet, multIndex)
    frames.push(frame)
    total += frame.totalWin
    multIndex = frame.multIndex
    left -= 1
    if (frame.triggerFreeSpins && retriggers < 2) {
      left += Math.min(frame.freeSpinsAwarded, FREE_SPIN_COUNT)
      retriggers++
    }
  }
  const capped = Math.min(Math.round(total * 100) / 100, bet * 200)
  const normalizedFrames = normalizeFramesToTotal(frames, capped)
  return { frames: normalizedFrames, total: capped, endMultIndex: multIndex }
}

/** Monte Carlo natural EV as fraction of bet (includes free-spin value). */
function estimateNaturalEv(samples = 3_000): number {
  let sum = 0
  for (let i = 0; i < samples; i++) {
    const grid = fillGrid({})
    const frame = evaluateFrame(grid, 1, 0)
    let total = frame.totalWin
    if (frame.triggerFreeSpins) {
      // Cap awarded spins for EV estimate speed
      const awarded = Math.min(frame.freeSpinsAwarded, FREE_SPIN_COUNT)
      const bonus = runFreeSpinSequence(1, awarded, frame.multIndex)
      total += bonus.total
    }
    sum += total
  }
  return sum / samples
}

let cachedEv: number | null = null
/** Stable fallback so first live spin is never blocked by a long Monte Carlo. */
const EV_FALLBACK = 1.35

export function naturalEv(): number {
  if (cachedEv == null) {
    try {
      cachedEv = estimateNaturalEv()
      if (!Number.isFinite(cachedEv) || cachedEv <= 0) cachedEv = EV_FALLBACK
    } catch {
      cachedEv = EV_FALLBACK
    }
  }
  return cachedEv
}

/**
 * Estimate EV of a purchased feature (free-spin package) as fraction of bet.
 * Feature buy cost is FEATURE_BUY_MULT × bet, so RTP of the purchase is
 * (featureEv / FEATURE_BUY_MULT).
 */
let cachedFeatureEv: number | null = null
const FEATURE_EV_FALLBACK = 55 // ~55× bet natural return on 80× cost ⇒ ~69% before bias

export function featureNaturalEv(): number {
  if (cachedFeatureEv == null) {
    try {
      let sum = 0
      const samples = 800
      for (let i = 0; i < samples; i++) {
        // Estimate without retriggers for speed: fixed FREE_SPIN_COUNT
        const bonus = runFreeSpinSequence(1, FREE_SPIN_COUNT, 0)
        sum += bonus.total
      }
      cachedFeatureEv = sum / samples
      if (!Number.isFinite(cachedFeatureEv) || cachedFeatureEv <= 0) {
        cachedFeatureEv = FEATURE_EV_FALLBACK
      }
    } catch {
      cachedFeatureEv = FEATURE_EV_FALLBACK
    }
  }
  return cachedFeatureEv
}

export function spinBountyTrail(betRupees: number, winPct: number): BountyOutcome {
  const q = forcedLossRate(naturalEv(), winPct)
  if (chance(q)) {
    const grid = fillGrid({ forceLoss: true })
    const frame = evaluateFrame(grid, betRupees, 0)
    // Force zero even if evaluation somehow produced a tiny win
    return {
      winRupees: 0,
      payload: {
        ...frame,
        wayWins: [],
        lineWin: 0,
        scatterWin: 0,
        totalWin: 0,
        triggerFreeSpins: false,
        freeSpinsAwarded: 0,
        multIndex: 0,
        appliedMult: 1,
      },
    }
  }

  const grid = fillGrid({})
  const frame = evaluateFrame(grid, betRupees, 0)

  if (frame.totalWin <= 0) {
    const injectP = highWinPctInjectRate(winPct)
    if (injectP > 0 && chance(injectP)) {
      const payout = guaranteedSmallWinPayout(betRupees, winPct)
      return {
        winRupees: payout,
        payload: { ...frame, wayWins: [], lineWin: payout, scatterWin: 0, totalWin: payout },
      }
    }
    return {
      winRupees: 0,
      payload: frame,
    }
  }

  if (!frame.triggerFreeSpins) {
    return {
      winRupees: frame.totalWin,
      payload: frame,
    }
  }

  const bonus = runFreeSpinSequence(betRupees, frame.freeSpinsAwarded, frame.multIndex)
  const featureTotal = Math.min(
    Math.round((frame.totalWin + bonus.total) * 100) / 100,
    betRupees * 200,
  )
  const [baseFrame, ...freeSpinFrames] = normalizeFramesToTotal(
    [frame, ...bonus.frames],
    featureTotal,
  )
  return {
    winRupees: featureTotal,
    payload: {
      ...baseFrame!,
      freeSpins: freeSpinFrames,
      featureTotal,
    },
  }
}

/**
 * Feature Buy: debit FEATURE_BUY_MULT × bet, run free-spin package.
 * Calibrated so expected return ≈ winPct% of the purchase cost.
 */
export function buyBountyFeature(betRupees: number, winPct: number): BountyOutcome {
  const cost = betRupees * FEATURE_BUY_MULT
  // Natural feature return as fraction of cost
  const naturalFeatureRtp = featureNaturalEv() / FEATURE_BUY_MULT
  const q = forcedLossRate(Math.max(0.01, naturalFeatureRtp), winPct)

  if (chance(q)) {
    // Low-value bonus: run free spins but force mostly losses via non-boosted fills
    // Still use free-spin fills for visual authenticity; RTP bias already applied.
    // For a hard loss bias we shorten / dampen by using base (non-free) fills.
    const frames: BountySpinFrame[] = []
    let multIndex = 0
    let total = 0
    for (let i = 0; i < FREE_SPIN_COUNT; i++) {
      const grid = fillGrid({ forceLoss: true })
      const frame = evaluateFrame(grid, betRupees, multIndex)
      const zeroed: BountySpinFrame = {
        ...frame,
        wayWins: [],
        lineWin: 0,
        scatterWin: 0,
        totalWin: 0,
        triggerFreeSpins: false,
        freeSpinsAwarded: 0,
      }
      frames.push(zeroed)
      multIndex = 0
    }
    void total
    void cost
    return {
      winRupees: 0,
      payload: {
        grid: frames[0]!.grid,
        wayWins: [],
        lineWin: 0,
        scatterCount: 0,
        scatterWin: 0,
        totalWin: 0,
        multIndex: 0,
        appliedMult: 1,
        triggerFreeSpins: true,
        freeSpinsAwarded: FREE_SPIN_COUNT,
        goldActivated: [],
        freeSpins: frames,
        featureTotal: 0,
      },
    }
  }

  const bonus = runFreeSpinSequence(betRupees, FREE_SPIN_COUNT, 0)
  return {
    winRupees: bonus.total,
    payload: {
      grid: bonus.frames[0]?.grid ?? fillGrid({ freeSpin: true }),
      wayWins: [],
      lineWin: 0,
      scatterCount: 3,
      scatterWin: 0,
      totalWin: 0,
      multIndex: 0,
      appliedMult: 1,
      triggerFreeSpins: true,
      freeSpinsAwarded: FREE_SPIN_COUNT,
      goldActivated: [],
      freeSpins: bonus.frames,
      featureTotal: bonus.total,
    },
  }
}
