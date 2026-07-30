import { COLS, FREE_SPIN_COUNT, FREE_SPIN_EXTRA, MULTIPLIER_TRACK, ROWS } from '../constants/gameConfig'
import { PAY_SYMBOLS, SYMBOL_MAP, type SymbolId } from '../constants/symbolConfig'

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

export type SpinResult = {
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

export type ForceMode =
  | 'none'
  | 'nowin'
  | 'small'
  | 'big'
  | 'scatter'
  | 'wild'
  | 'gold'
  | 'freespins'

function rand(): number {
  return Math.random()
}

function weightedPick(exclude: SymbolId[] = []): SymbolId {
  const pool = PAY_SYMBOLS.filter((s) => !exclude.includes(s.id))
  const total = pool.reduce((a, s) => a + s.weight, 0)
  let r = rand() * total
  for (const s of pool) {
    r -= s.weight
    if (r <= 0) return s.id
  }
  return pool[pool.length - 1]!.id
}

function pickSpecial(boostScatter = false, boostWild = false): SymbolId | null {
  const roll = rand()
  const scatterChance = boostScatter ? 0.14 : 0.045
  const wildChance = boostWild ? 0.18 : 0.06
  const bonusChance = 0.02
  if (roll < scatterChance) return 'scatter'
  if (roll < scatterChance + wildChance) return 'wild'
  if (roll < scatterChance + wildChance + bonusChance) return 'bonus'
  return null
}

function makeCell(
  id: SymbolId,
  goldBoost = false,
): Cell {
  const canGold = id !== 'scatter' && id !== 'bonus'
  const goldChance = goldBoost ? 0.28 : 0.08
  const gold = canGold && rand() < goldChance
  const goldMult = gold ? ([1, 2, 3, 4] as const)[Math.floor(rand() * 4)]! : 1
  return { id, gold, goldMult }
}

export function emptyGrid(): Cell[][] {
  return Array.from({ length: COLS }, () =>
    Array.from({ length: ROWS }, () => makeCell(weightedPick())),
  )
}

function fillGrid(opts: {
  force?: ForceMode
  freeSpin?: boolean
}): Cell[][] {
  const force = opts.force ?? 'none'
  const freeSpin = opts.freeSpin === true
  const grid: Cell[][] = Array.from({ length: COLS }, () =>
    Array.from({ length: ROWS }, () =>
      makeCell(
        pickSpecial(freeSpin || force === 'scatter', force === 'wild' || freeSpin) ??
          weightedPick(),
        freeSpin || force === 'gold',
      ),
    ),
  )

  if (force === 'nowin') {
    for (let c = 0; c < COLS; c++) {
      for (let r = 0; r < ROWS; r++) {
        grid[c]![r] = makeCell(PAY_SYMBOLS[(c + r) % PAY_SYMBOLS.length]!.id, false)
      }
    }
    // Ensure reel 0 and 1 have no matching pay symbols
    const a = PAY_SYMBOLS[0]!.id
    const b = PAY_SYMBOLS[5]!.id
    for (let r = 0; r < ROWS; r++) {
      grid[0]![r] = makeCell(a, false)
      grid[1]![r] = makeCell(b, false)
    }
  }

  if (force === 'small' || force === 'big') {
    // Live server wins must not randomly display scatter/free-spin features.
    for (let c = 0; c < COLS; c++) {
      for (let r = 0; r < ROWS; r++) {
        grid[c]![r] = makeCell(PAY_SYMBOLS[(c + r) % PAY_SYMBOLS.length]!.id, false)
      }
    }
    const sym = force === 'big' ? 'hunter' : 'hat'
    const len = force === 'big' ? 6 : 3
    for (let c = 0; c < len; c++) {
      grid[c]![1] = makeCell(sym, force === 'big')
      if (force === 'big') {
        grid[c]![2] = makeCell(c % 2 === 0 ? 'wild' : sym, true)
      }
    }
  }

  if (force === 'scatter' || force === 'freespins') {
    const cols = [0, 2, 4, 5]
    cols.slice(0, force === 'freespins' ? 4 : 3).forEach((c, i) => {
      grid[c]![i % ROWS] = { id: 'scatter', gold: false, goldMult: 1 }
    })
  }

  if (force === 'wild') {
    for (let c = 0; c < 4; c++) {
      grid[c]![1] = { id: 'wild', gold: true, goldMult: 2 }
    }
    grid[0]![2] = makeCell('sheriff', true)
    grid[1]![2] = makeCell('sheriff', false)
    grid[2]![2] = makeCell('wild', true)
  }

  if (force === 'gold') {
    for (let c = 0; c < COLS; c++) {
      for (let r = 0; r < ROWS; r++) {
        if (rand() < 0.45) {
          const cell = grid[c]![r]!
          if (cell.id !== 'scatter' && cell.id !== 'bonus') {
            cell.gold = true
            cell.goldMult = ([2, 3, 4] as const)[Math.floor(rand() * 3)]!
          }
        }
      }
    }
  }

  return grid
}

function matches(a: SymbolId, b: SymbolId): boolean {
  if (a === 'scatter' || b === 'scatter' || a === 'bonus' || b === 'bonus') return false
  return a === b || a === 'wild' || b === 'wild'
}

export function evaluateWays(grid: Cell[][], bet: number, mult: number): WayWin[] {
  const wins: WayWin[] = []
  const candidates = new Set<SymbolId>()
  for (const cell of grid[0]!) {
    if (cell.id !== 'scatter' && cell.id !== 'bonus') {
      candidates.add(cell.id === 'wild' ? 'wild' : cell.id)
    }
  }
  // Also evaluate each concrete pay symbol that can connect via wilds
  for (const s of PAY_SYMBOLS) candidates.add(s.id)

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

  // Deduplicate overlapping same-symbol evaluations keeping best
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

export function evaluateSpin(
  bet: number,
  opts: {
    force?: ForceMode
    freeSpin?: boolean
    multIndex?: number
  } = {},
): SpinResult {
  const grid = fillGrid({ force: opts.force, freeSpin: opts.freeSpin })
  let multIndex = opts.multIndex ?? 0
  const goldActivated: SpinResult['goldActivated'] = []

  for (let c = 0; c < COLS; c++) {
    for (let r = 0; r < ROWS; r++) {
      const cell = grid[c]![r]!
      if (cell.gold && cell.goldMult > 1) {
        goldActivated.push({ col: c, row: r, mult: cell.goldMult })
        // Advance track based on gold frames collected
        multIndex = Math.min(MULTIPLIER_TRACK.length - 1, multIndex + 1)
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

  const totalWin = Math.round((lineWin + scatterWin) * 100) / 100

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

export function buildReelStrip(length = 28): SymbolId[] {
  return Array.from({ length }, () => pickSpecial() ?? weightedPick())
}

export function readDevForce(): ForceMode {
  try {
    const params = new URLSearchParams(window.location.search)
    const q = (params.get('btForce') || localStorage.getItem('bt-force') || 'none') as ForceMode
    if (
      ['none', 'nowin', 'small', 'big', 'scatter', 'wild', 'gold', 'freespins'].includes(q)
    ) {
      return q
    }
  } catch {
    /* ignore */
  }
  return 'none'
}
