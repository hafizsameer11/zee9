import {
  CELL_COUNT,
  COLS,
  COMBO,
  FREE_SPIN_COUNT,
  GOLDEN_CHANCE,
  MIN_MATCH,
  ROWS,
} from '../constants/gameConfig'

export type SymbolId =
  | 'spade'
  | 'heart'
  | 'diamond'
  | 'club'
  | 'jack'
  | 'queen'
  | 'king'
  | 'ace'
  | 'wild'
  | 'scatter'

export type Cell = {
  id: SymbolId
  golden?: boolean
  key: string
}

export type Rng = () => number

export type WinGroup = {
  symbol: SymbolId
  count: number
  cells: number[]
  payout: number
}

export type BoardEval = {
  wins: WinGroup[]
  totalWin: number
  /** Non-golden winning cells removed after this cascade. */
  removeSet: number[]
  /** Golden winners transform into wilds and remain. */
  goldenToWild: number[]
  comboIndex: number
  comboMult: number
}

export type CascadeStep = {
  board: Cell[]
  wins: WinGroup[]
  removeSet: number[]
  goldenToWild: number[]
  winAmount: number
  comboIndex: number
  comboMult: number
  /** Board after golden→wild transform + removal + gravity fill. */
  nextBoard: Cell[]
}

export type SpinResult = {
  initialBoard: Cell[]
  cascades: CascadeStep[]
  finalBoard: Cell[]
  totalWin: number
  lineWin: number
  scatterCount: number
  scatterWin: number
  freeSpinsAwarded: number
  triggerFreeSpins: boolean
  maxComboIndex: number
}

export type SimulateOpts = {
  rng?: Rng
  seed?: number
  /** Feature buy — guarantees ≥3 scatters on the opening board. */
  buyBonus?: boolean
  freeSpin?: boolean
  /** Soften wild/scatter during free spins. */
  boostSpecials?: boolean
}

/**
 * Spawn weights — low suits favoured, royals/ace fewer, wild/scatter rare.
 * Tuned so 5+ of any one symbol is uncommon on a 5×5 board.
 */
const WEIGHTS: Record<SymbolId, number> = {
  club: 12,
  spade: 12,
  heart: 11,
  diamond: 11,
  jack: 9,
  queen: 8,
  king: 6.5,
  ace: 4.5,
  wild: 1.4,
  scatter: 1.5,
}

/**
 * Count-based pay multipliers (× bet) by match count.
 * Index 0 = 5-of-kind … index 7 = 12+.
 * Suits ~0.15–0.4 at 5, up to ~1.5–2 at 10+; royals/ace/wild higher.
 */
const PAY_TABLE: Record<Exclude<SymbolId, 'scatter'>, number[]> = {
  club: [0.1, 0.15, 0.25, 0.4, 0.55, 0.8, 1.1, 1.4],
  spade: [0.12, 0.18, 0.28, 0.45, 0.65, 0.9, 1.2, 1.6],
  heart: [0.15, 0.22, 0.35, 0.5, 0.75, 1.0, 1.4, 1.8],
  diamond: [0.18, 0.28, 0.4, 0.6, 0.85, 1.2, 1.6, 2.0],
  jack: [0.3, 0.45, 0.7, 1.0, 1.4, 2.0, 2.8, 4],
  queen: [0.35, 0.55, 0.85, 1.2, 1.7, 2.5, 3.5, 5.5],
  king: [0.45, 0.7, 1.1, 1.6, 2.2, 3.2, 4.5, 7],
  ace: [0.6, 0.9, 1.4, 2.0, 3.0, 4.5, 7.0, 11],
  wild: [0.8, 1.2, 1.8, 2.8, 4.0, 6.0, 9.0, 14],
}

const PAY_SYMBOLS: Exclude<SymbolId, 'scatter'>[] = [
  'club',
  'spade',
  'heart',
  'diamond',
  'jack',
  'queen',
  'king',
  'ace',
  'wild',
]

/** Scatter pays (× bet) for 3 / 4 / 5+. */
const SCATTER_PAY = [0, 0, 0, 2, 10, 50] as const

let keySeq = 0

function nextKey(rng: Rng): string {
  keySeq += 1
  return `c${keySeq}-${Math.floor(rng() * 1e6)}`
}

/** Mulberry32 — deterministic when seeded. */
export function createRng(seed?: number): Rng {
  if (seed == null || !Number.isFinite(seed)) {
    return () => Math.random()
  }
  let a = seed >>> 0
  return () => {
    a = (a + 0x6d2b79f5) >>> 0
    let t = a
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

function pickSymbol(
  rng: Rng,
  opts?: { boostSpecials?: boolean; allowScatter?: boolean },
): SymbolId {
  const weights = { ...WEIGHTS }
  if (opts?.allowScatter === false) {
    weights.scatter = 0
  }
  if (opts?.boostSpecials) {
    weights.wild *= 1.8
    if (opts.allowScatter !== false) weights.scatter *= 1.6
  }
  const total = Object.values(weights).reduce((a, b) => a + b, 0)
  let r = rng() * total
  for (const id of Object.keys(weights) as SymbolId[]) {
    r -= weights[id]
    if (r <= 0) return id
  }
  return 'club'
}

function makeCell(
  id: SymbolId,
  rng: Rng,
): Cell {
  const canGold = id !== 'wild' && id !== 'scatter'
  const golden = canGold && rng() < GOLDEN_CHANCE
  return { id, golden: golden || undefined, key: nextKey(rng) }
}

export function cloneBoard(board: Cell[]): Cell[] {
  return board.map((c) => ({ ...c }))
}

export function emptyBoard(rng: Rng = createRng()): Cell[] {
  return Array.from({ length: CELL_COUNT }, () =>
    makeCell(pickSymbol(rng, { allowScatter: true }), rng),
  )
}

function pickUnderCap(
  rng: Rng,
  counts: Partial<Record<SymbolId, number>>,
  opts?: { boostSpecials?: boolean; allowScatter?: boolean },
): SymbolId {
  for (let attempt = 0; attempt < 8; attempt++) {
    const id = pickSymbol(rng, opts)
    if (id === 'scatter' || id === 'wild') {
      // Keep wilds scarce even when boostSpecials is on.
      if (id === 'wild' && (counts.wild ?? 0) >= 2 && rng() > 0.25) continue
      return id
    }
    const n = counts[id] ?? 0
    // Target ~2–3 copies; 4th uncommon, 5th rare (wilds often complete a pay).
    if (n >= 5) continue
    if (n === 4 && rng() > 0.1) continue
    if (n === 3 && rng() > 0.2) continue
    return id
  }
  let best: SymbolId = 'club'
  let bestN = Infinity
  for (const id of ['ace', 'king', 'queen', 'jack', 'diamond', 'heart', 'spade', 'club'] as SymbolId[]) {
    const n = counts[id] ?? 0
    if (n < bestN) {
      bestN = n
      best = id
    }
  }
  return best
}

function spawnCell(
  rng: Rng,
  counts: Partial<Record<SymbolId, number>>,
  opts?: { boostSpecials?: boolean; allowScatter?: boolean },
): Cell {
  const id = pickUnderCap(rng, counts, opts)
  counts[id] = (counts[id] ?? 0) + 1
  return makeCell(id, rng)
}

export function generateBoard(rng: Rng, opts?: { boostSpecials?: boolean }): Cell[] {
  const counts: Partial<Record<SymbolId, number>> = {}
  return Array.from({ length: CELL_COUNT }, () =>
    spawnCell(rng, counts, { boostSpecials: opts?.boostSpecials, allowScatter: true }),
  )
}

function forceScatters(board: Cell[], count: number, rng: Rng): Cell[] {
  const next = cloneBoard(board)
  const positions = Array.from({ length: CELL_COUNT }, (_, i) => i)
  for (let i = positions.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1))
    ;[positions[i], positions[j]] = [positions[j]!, positions[i]!]
  }
  for (let n = 0; n < count && n < positions.length; n++) {
    const idx = positions[n]!
    next[idx] = { id: 'scatter', key: nextKey(rng) }
  }
  return next
}

function payForCount(symbol: Exclude<SymbolId, 'scatter'>, count: number): number {
  if (count < MIN_MATCH) return 0
  const table = PAY_TABLE[symbol]
  const idx = Math.min(table.length - 1, count - MIN_MATCH)
  return table[idx]!
}

/** Cells matching `symbol` (wild substitutes except for scatter / wild-as-self). */
export function matchingCells(board: Cell[], symbol: SymbolId): number[] {
  if (symbol === 'scatter') {
    return board.reduce<number[]>((acc, c, i) => {
      if (c.id === 'scatter') acc.push(i)
      return acc
    }, [])
  }
  if (symbol === 'wild') {
    return board.reduce<number[]>((acc, c, i) => {
      if (c.id === 'wild') acc.push(i)
      return acc
    }, [])
  }
  const cells: number[] = []
  let hasReal = false
  for (let i = 0; i < board.length; i++) {
    const id = board[i]!.id
    if (id === symbol) {
      cells.push(i)
      hasReal = true
    } else if (id === 'wild') {
      cells.push(i)
    }
  }
  return hasReal ? cells : []
}

export function countScatters(board: Cell[]): number {
  return board.reduce((n, c) => n + (c.id === 'scatter' ? 1 : 0), 0)
}

export function evaluateBoard(
  board: Cell[],
  bet: number,
  comboIndex: number,
): BoardEval {
  const comboMult = COMBO[Math.min(Math.max(0, comboIndex), COMBO.length - 1)]!
  const wins: WinGroup[] = []

  const wildIdx: number[] = []
  const realOf: Partial<Record<SymbolId, number[]>> = {}
  for (let i = 0; i < board.length; i++) {
    const id = board[i]!.id
    if (id === 'scatter') continue
    if (id === 'wild') {
      wildIdx.push(i)
      continue
    }
    ;(realOf[id] ??= []).push(i)
  }

  // 1) Pure 5+ of a kind (no wild help) — all such groups pay.
  for (const symbol of PAY_SYMBOLS) {
    if (symbol === 'wild') continue
    const real = realOf[symbol] ?? []
    if (real.length < MIN_MATCH) continue
    const base = payForCount(symbol, real.length)
    const payout = Math.round(bet * base * comboMult * 100) / 100
    if (payout > 0) wins.push({ symbol, count: real.length, cells: [...real], payout })
  }

  // 2) Wilds as their own pay symbol.
  if (wildIdx.length >= MIN_MATCH) {
    const base = payForCount('wild', wildIdx.length)
    const payout = Math.round(bet * base * comboMult * 100) / 100
    if (payout > 0) {
      wins.push({ symbol: 'wild', count: wildIdx.length, cells: [...wildIdx], payout })
    }
  }

  // 3) Assign remaining wilds to at most one assisted group (highest payout).
  //    Prevents 2 wilds from completing every 3-of-a-kind on the board at once.
  if (wildIdx.length > 0 && !wins.some((w) => w.symbol === 'wild')) {
    type Cand = { symbol: Exclude<SymbolId, 'scatter'>; real: number[]; count: number; payout: number }
    const cands: Cand[] = []
    for (const symbol of PAY_SYMBOLS) {
      if (symbol === 'wild') continue
      // Skip symbols that already paid as pure 5+.
      if ((realOf[symbol]?.length ?? 0) >= MIN_MATCH) continue
      const real = realOf[symbol] ?? []
      if (real.length === 0) continue
      const count = real.length + wildIdx.length
      if (count < MIN_MATCH) continue
      const base = payForCount(symbol, count)
      const payout = Math.round(bet * base * comboMult * 100) / 100
      if (payout > 0) cands.push({ symbol, real, count, payout })
    }
    cands.sort((a, b) => b.payout - a.payout)
    const best = cands[0]
    if (best) {
      wins.push({
        symbol: best.symbol,
        count: best.count,
        cells: [...best.real, ...wildIdx],
        payout: best.payout,
      })
    }
  }

  wins.sort((a, b) => b.payout - a.payout)

  const winningIndices = new Set<number>()
  for (const w of wins) w.cells.forEach((i) => winningIndices.add(i))

  const goldenToWild: number[] = []
  const removeSet: number[] = []
  for (const i of winningIndices) {
    const cell = board[i]!
    if (cell.id === 'scatter') continue
    if (cell.golden) goldenToWild.push(i)
    else removeSet.push(i)
  }

  const totalWin = Math.round(wins.reduce((a, w) => a + w.payout, 0) * 100) / 100

  return {
    wins,
    totalWin,
    removeSet,
    goldenToWild,
    comboIndex,
    comboMult,
  }
}

/**
 * Drop remaining symbols down; fill empty top cells with new symbols.
 * Cascade fills never spawn scatters (scatters only land on the opening board).
 * `removeSet` cells are cleared first (call after applying golden→wild transforms).
 */
export function applyCascade(
  board: Cell[],
  removeSet: Iterable<number>,
  rng: Rng,
): Cell[] {
  const clear = new Set(removeSet)
  const next: (Cell | null)[] = board.map((c, i) => (clear.has(i) ? null : { ...c }))
  const counts: Partial<Record<SymbolId, number>> = {}
  for (const c of next) {
    if (c) counts[c.id] = (counts[c.id] ?? 0) + 1
  }

  for (let col = 0; col < COLS; col++) {
    const stack: Cell[] = []
    for (let row = ROWS - 1; row >= 0; row--) {
      const idx = row * COLS + col
      const cell = next[idx]
      if (cell) stack.push(cell)
    }
    for (let row = ROWS - 1; row >= 0; row--) {
      const idx = row * COLS + col
      const fromStack = stack.shift()
      if (fromStack) {
        next[idx] = fromStack
      } else {
        // Decrement nothing — new spawn
        const cell = spawnCell(rng, counts, { allowScatter: false })
        next[idx] = cell
      }
    }
  }

  return next as Cell[]
}

function applyGoldenTransforms(board: Cell[], goldenToWild: number[]): Cell[] {
  if (goldenToWild.length === 0) return cloneBoard(board)
  const next = cloneBoard(board)
  for (const i of goldenToWild) {
    const prev = next[i]!
    next[i] = { id: 'wild', key: prev.key }
  }
  return next
}

function scatterPayout(count: number, bet: number): number {
  const idx = Math.min(SCATTER_PAY.length - 1, count)
  const mult = SCATTER_PAY[idx] ?? 0
  return Math.round(bet * mult * 100) / 100
}

/**
 * Full client-side cascade chain for demo / preview play.
 * Combo resets to ×1 at the start of each spin and advances on each cascade win.
 */
export function simulateSpin(bet: number, opts: SimulateOpts = {}): SpinResult {
  const rng = opts.rng ?? createRng(opts.seed)
  const boost = opts.boostSpecials === true || opts.freeSpin === true

  let board = generateBoard(rng, { boostSpecials: boost })
  if (opts.buyBonus) {
    board = forceScatters(board, 3, rng)
  }

  const initialBoard = cloneBoard(board)
  const cascades: CascadeStep[] = []
  let comboIndex = 0
  let lineWin = 0
  let maxComboIndex = 0

  for (let step = 0; step < 12; step++) {
    const ev = evaluateBoard(board, bet, comboIndex)
    if (ev.wins.length === 0) break

    const transformed = applyGoldenTransforms(board, ev.goldenToWild)
    const nextBoard = applyCascade(transformed, ev.removeSet, rng)

    cascades.push({
      board: cloneBoard(board),
      wins: ev.wins,
      removeSet: [...ev.removeSet],
      goldenToWild: [...ev.goldenToWild],
      winAmount: ev.totalWin,
      comboIndex: ev.comboIndex,
      comboMult: ev.comboMult,
      nextBoard: cloneBoard(nextBoard),
    })

    lineWin = Math.round((lineWin + ev.totalWin) * 100) / 100
    maxComboIndex = Math.max(maxComboIndex, comboIndex)
    board = nextBoard
    comboIndex = Math.min(comboIndex + 1, COMBO.length - 1)
  }

  // Scatters counted on the opening board (they do not cascade-remove).
  const scatterCount = countScatters(initialBoard)
  const scatterWin = scatterPayout(scatterCount, bet)
  const triggerFreeSpins = scatterCount >= 3
  const freeSpinsAwarded = triggerFreeSpins ? FREE_SPIN_COUNT : 0
  const totalWin = Math.round((lineWin + scatterWin) * 100) / 100

  return {
    initialBoard,
    cascades,
    finalBoard: board,
    totalWin,
    lineWin,
    scatterCount,
    scatterWin,
    freeSpinsAwarded,
    triggerFreeSpins,
    maxComboIndex,
  }
}

export function winningCellSet(wins: WinGroup[]): Set<number> {
  const set = new Set<number>()
  for (const w of wins) w.cells.forEach((i) => set.add(i))
  return set
}
