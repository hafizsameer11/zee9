import { COLS, FREE_SPIN_COUNT, FREE_SPIN_MULT, LINES, ROWS } from '../constants/gameConfig'
import { PAY_SYMBOLS, SYMBOL_MAP, type SymbolId } from '../constants/symbolConfig'

export type Cell = { id: SymbolId }

export type LineWin = {
  symbol: SymbolId
  length: number
  payout: number
  positions: Array<{ col: number; row: number }>
  line: number
}

export type SpinResult = {
  grid: Cell[][]
  /** Second board used during free spins (double reels). */
  gridB: Cell[][] | null
  lineWins: LineWin[]
  lineWin: number
  scatterCount: number
  totalWin: number
  triggerFreeSpins: boolean
  freeSpinsAwarded: number
  appliedMult: number
}

export type ForceMode =
  | 'none'
  | 'nowin'
  | 'small'
  | 'big'
  | 'scatter'
  | 'wild'
  | 'freespins'
  | 'happiness'

function rand(): number {
  return Math.random()
}

function weightedPick(): SymbolId {
  const total = PAY_SYMBOLS.reduce((a, s) => a + s.weight, 0)
  let r = rand() * total
  for (const s of PAY_SYMBOLS) {
    r -= s.weight
    if (r <= 0) return s.id
  }
  return PAY_SYMBOLS[PAY_SYMBOLS.length - 1]!.id
}

function pickSpecial(boostScatter = false, boostWild = false): SymbolId | null {
  const roll = rand()
  const scatterChance = boostScatter ? 0.12 : 0.04
  const wildChance = boostWild ? 0.16 : 0.055
  if (roll < scatterChance) return 'scatter'
  if (roll < scatterChance + wildChance) return 'wild'
  return null
}

export function emptyGrid(): Cell[][] {
  return Array.from({ length: COLS }, () =>
    Array.from({ length: ROWS }, () => ({ id: weightedPick() })),
  )
}

function fillGrid(opts: { force?: ForceMode; freeSpin?: boolean }): Cell[][] {
  const force = opts.force ?? 'none'
  const freeSpin = opts.freeSpin === true
  const grid: Cell[][] = Array.from({ length: COLS }, () =>
    Array.from({ length: ROWS }, () => ({
      id: pickSpecial(freeSpin || force === 'scatter', force === 'wild' || freeSpin) ?? weightedPick(),
    })),
  )

  if (force === 'nowin') {
    for (let c = 0; c < COLS; c++) {
      for (let r = 0; r < ROWS; r++) {
        grid[c]![r] = { id: PAY_SYMBOLS[(c + r * 2) % PAY_SYMBOLS.length]!.id }
      }
    }
    for (let r = 0; r < ROWS; r++) {
      grid[0]![r] = { id: 'J' }
      grid[1]![r] = { id: 'A' }
    }
  }

  if (force === 'small' || force === 'big') {
    const sym: SymbolId = force === 'big' ? 'happiness' : 'shoes'
    const len = force === 'big' ? 5 : 3
    for (let c = 0; c < len; c++) {
      grid[c]![1] = { id: c === 2 && force === 'big' ? 'wild' : sym }
    }
  }

  if (force === 'happiness') {
    for (let c = 0; c < 5; c++) grid[c]![1] = { id: c === 2 ? 'wild' : 'happiness' }
  }

  if (force === 'scatter' || force === 'freespins') {
    ;[0, 2, 4].forEach((c, i) => {
      grid[c]![i % ROWS] = { id: 'scatter' }
    })
  }

  if (force === 'wild') {
    for (let c = 0; c < 4; c++) grid[c]![1] = { id: 'wild' }
    grid[0]![0] = { id: 'rings' }
    grid[1]![0] = { id: 'rings' }
    grid[2]![0] = { id: 'rings' }
  }

  return grid
}

/** Classic 30 fixed paylines on 5×3. */
const PAYLINES: number[][] = (() => {
  const lines: number[][] = []
  // Straight rows
  for (let r = 0; r < 3; r++) lines.push([r, r, r, r, r])
  // V / ^ patterns
  lines.push([0, 1, 2, 1, 0])
  lines.push([2, 1, 0, 1, 2])
  lines.push([0, 0, 1, 2, 2])
  lines.push([2, 2, 1, 0, 0])
  lines.push([1, 0, 0, 0, 1])
  lines.push([1, 2, 2, 2, 1])
  lines.push([0, 1, 0, 1, 0])
  lines.push([2, 1, 2, 1, 2])
  lines.push([1, 0, 1, 0, 1])
  lines.push([1, 2, 1, 2, 1])
  lines.push([0, 1, 1, 1, 0])
  lines.push([2, 1, 1, 1, 2])
  lines.push([0, 0, 0, 1, 2])
  lines.push([2, 2, 2, 1, 0])
  lines.push([1, 1, 0, 1, 1])
  lines.push([1, 1, 2, 1, 1])
  lines.push([0, 2, 0, 2, 0])
  lines.push([2, 0, 2, 0, 2])
  lines.push([0, 2, 1, 2, 0])
  lines.push([2, 0, 1, 0, 2])
  lines.push([0, 0, 2, 0, 0])
  lines.push([2, 2, 0, 2, 2])
  lines.push([1, 0, 2, 0, 1])
  lines.push([1, 2, 0, 2, 1])
  // pad to 30
  while (lines.length < 30) {
    const r = lines.length % 3
    lines.push([r, (r + 1) % 3, r, (r + 1) % 3, r])
  }
  return lines.slice(0, 30)
})()

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

function evaluateGrid(grid: Cell[][], bet: number, mult: number): { wins: LineWin[]; total: number; scatters: number } {
  const wins: LineWin[] = []
  let total = 0
  const lineBet = bet / LINES

  for (let li = 0; li < PAYLINES.length; li++) {
    const rows = PAYLINES[li]!
    const ids = rows.map((r, c) => grid[c]![r]!.id)
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
      // wild-only line: pay as happiness mid
      if (sym === 'wild') {
        const pay = SYMBOL_MAP.happiness.pays[len - 3]! * lineBet * mult
        const positions = Array.from({ length: len }, (_, c) => ({ col: c, row: rows[c]! }))
        wins.push({ symbol: 'wild', length: len, payout: pay, positions, line: li })
        total += pay
      }
      continue
    }
    const pay = meta.pays[len - 3]! * lineBet * mult
    const positions = Array.from({ length: len }, (_, c) => ({ col: c, row: rows[c]! }))
    wins.push({ symbol: sym, length: len, payout: pay, positions, line: li })
    total += pay
  }

  let scatters = 0
  for (let c = 0; c < COLS; c++) {
    for (let r = 0; r < ROWS; r++) {
      if (grid[c]![r]!.id === 'scatter') scatters++
    }
  }

  return { wins, total: Math.round(total * 100) / 100, scatters }
}

export function evaluateSpin(
  bet: number,
  opts: { force?: ForceMode; freeSpin?: boolean } = {},
): SpinResult {
  const force = opts.force ?? 'none'
  const freeSpin = opts.freeSpin === true
  const mult = freeSpin ? FREE_SPIN_MULT : 1

  const grid = fillGrid({ force, freeSpin })
  const gridB = freeSpin ? fillGrid({ force: force === 'freespins' ? 'none' : force, freeSpin }) : null

  const a = evaluateGrid(grid, bet, mult)
  const b = gridB ? evaluateGrid(gridB, bet, mult) : { wins: [], total: 0, scatters: 0 }

  const lineWins = [...a.wins, ...b.wins]
  const totalScatters = a.scatters + b.scatters
  let totalWin = a.total + b.total

  // Scatter pays
  const sc = a.scatters
  if (sc >= 3) totalWin += bet * (sc === 3 ? 2 : sc === 4 ? 10 : 50)
  if (gridB && b.scatters >= 3) totalWin += bet * 2

  const trigger =
    !freeSpin && (force === 'freespins' || force === 'scatter' || a.scatters >= 3)

  return {
    grid,
    gridB,
    lineWins,
    lineWin: Math.round(totalWin * 100) / 100,
    scatterCount: totalScatters,
    totalWin: Math.round(totalWin * 100) / 100,
    triggerFreeSpins: trigger,
    freeSpinsAwarded: trigger ? FREE_SPIN_COUNT : 0,
    appliedMult: mult,
  }
}

/** Apply authoritative server win + optional 5×3 grid for live spins. */
export function applyServerSpinResult(
  bet: number,
  serverWin: number,
  gridIds?: string[][] | null,
): SpinResult {
  const force: ForceMode = serverWin > 0 ? 'small' : 'nowin'
  const result = evaluateSpin(bet, { force })
  if (Array.isArray(gridIds) && gridIds.length === COLS) {
    result.grid = gridIds.map((col) =>
      (col ?? []).slice(0, ROWS).map((id) => ({
        id: (SYMBOL_MAP[id as SymbolId] ? id : 'J') as SymbolId,
      })),
    )
    // Pad short columns
    for (let c = 0; c < COLS; c++) {
      while (result.grid[c]!.length < ROWS) result.grid[c]!.push({ id: 'J' })
    }
    result.gridB = null
    const a = evaluateGrid(result.grid, bet, 1)
    result.lineWins = a.wins
    result.lineWin = a.total
    result.scatterCount = a.scatters
  }
  result.totalWin = Math.round(Number(serverWin) * 100) / 100
  result.triggerFreeSpins = false
  result.freeSpinsAwarded = 0
  result.appliedMult = 1
  return result
}

export function buildReelStrip(len: number): SymbolId[] {
  return Array.from({ length: len }, () => pickSpecial() ?? weightedPick())
}

export function readDevForce(): ForceMode {
  try {
    const q = new URLSearchParams(window.location.search).get('dfForce')
    if (
      q === 'nowin' ||
      q === 'small' ||
      q === 'big' ||
      q === 'scatter' ||
      q === 'wild' ||
      q === 'freespins' ||
      q === 'happiness'
    )
      return q
  } catch {
    /* ignore */
  }
  return 'none'
}
