import crypto from 'node:crypto'
import type { RouletteBetType as PrismaRouletteBetType, WingoPhase } from '@prisma/client'
import { prisma } from '../../lib/prisma.js'
import { runMoneyTx } from '../../core/tx.js'
import { post, getBalances } from '../../core/ledger.js'
import { toPaisa, toRupees } from '../../lib/money.js'
import { badRequest, conflict, notFound, unprocessable } from '../../core/errors.js'
import { recordWagerAndRelease } from '../../core/wager.js'
import { accrueForLoss, clawbackForWin } from '../commission/commission.service.js'

const GAME_SLUG = 'roulette'

/** Match frontend timings: 15s bet → ~7.2s spin → ~4.6s reveal/payout. */
const BETTING_MS = 15_000
const LOCK_MS = 7_200
const REVEAL_MS = 4_600
const HISTORY_LIMIT = 14
const PUBLIC_BETS_LIMIT = 160
const MIN_BET = 1
const POCKETS = 37

export type RouletteApiBetType =
  | 'straight'
  | 'red'
  | 'black'
  | 'odd'
  | 'even'
  | 'low'
  | 'high'
  | 'dozen'
  | 'column'

const BET_TYPES: RouletteApiBetType[] = [
  'straight',
  'red',
  'black',
  'odd',
  'even',
  'low',
  'high',
  'dozen',
  'column',
]

const RED = new Set([1, 3, 5, 7, 9, 12, 14, 16, 18, 19, 21, 23, 25, 27, 30, 32, 34, 36])

/** Total return multiplier (stake included), matching client payoutForBet. */
export function rouletteReturnMultiplier(
  betType: RouletteApiBetType,
  value: number | null | undefined,
  result: number,
): number {
  const wins = (() => {
    switch (betType) {
      case 'straight':
        return value === result
      case 'red':
        return result !== 0 && RED.has(result)
      case 'black':
        return result !== 0 && !RED.has(result)
      case 'odd':
        return result !== 0 && result % 2 === 1
      case 'even':
        return result !== 0 && result % 2 === 0
      case 'low':
        return result >= 1 && result <= 18
      case 'high':
        return result >= 19 && result <= 36
      case 'dozen': {
        if (result <= 0) return false
        const d = result <= 12 ? 1 : result <= 24 ? 2 : 3
        return value === d
      }
      case 'column': {
        if (result <= 0) return false
        const mod = result % 3
        const col = mod === 0 ? 3 : mod === 2 ? 2 : 1
        return value === col
      }
      default:
        return false
    }
  })()
  if (!wins) return 0
  switch (betType) {
    case 'straight':
      return 36
    case 'dozen':
    case 'column':
      return 3
    default:
      return 2
  }
}

let pendingNextForce: number | null = null

function formatPeriod(d: Date): string {
  const pad = (n: number) => String(n).padStart(2, '0')
  return `R${d.getFullYear()}${pad(d.getMonth() + 1)}${pad(d.getDate())}${pad(d.getHours())}${pad(d.getMinutes())}${pad(d.getSeconds())}${String(d.getMilliseconds()).padStart(3, '0').slice(0, 2)}${crypto.randomInt(10, 99)}`
}

function generateResult(winPct: number, exposureByNumber: number[]): number {
  const pct = Math.max(0, Math.min(100, winPct))
  const house = 1 - pct / 100
  const weights = exposureByNumber.map((exp) => {
    const penalty = exp * (0.12 + house * 1.2)
    return Math.max(0.04, 1 - penalty)
  })
  const total = weights.reduce((a, b) => a + b, 0)
  let r = (crypto.randomInt(0, 10_000) / 10_000) * total
  for (let i = 0; i < POCKETS; i++) {
    r -= weights[i]!
    if (r <= 0) return i
  }
  return crypto.randomInt(0, POCKETS)
}

function normalizeCellKey(type: RouletteApiBetType, value: number | null, cellKey?: string | null): string {
  if (cellKey && cellKey.length > 0 && cellKey.length < 32) return cellKey
  switch (type) {
    case 'straight':
      return `n-${value ?? 0}`
    case 'dozen':
      return `dozen-${value ?? 1}`
    case 'column':
      return `col-${value ?? 1}`
    default:
      return type
  }
}

async function getGame() {
  const game = await prisma.game.findUnique({ where: { slug: GAME_SLUG } })
  if (!game) throw notFound('Roulette game not configured')
  if (!game.enabled) throw unprocessable('Roulette is currently disabled')
  return game
}

async function createRound(now: number) {
  const forced = pendingNextForce
  pendingNextForce = null
  return prisma.rouletteRound.create({
    data: {
      period: formatPeriod(new Date(now)),
      phase: 'BETTING',
      bettingEndsAt: new Date(now + BETTING_MS),
      forcedResult: forced,
    },
  })
}

export async function tickRoulette() {
  const game = await prisma.game.findUnique({ where: { slug: GAME_SLUG } })
  if (!game?.enabled) return null

  const now = Date.now()
  let round = await prisma.rouletteRound.findFirst({
    where: { phase: { in: ['BETTING', 'LOCKED', 'REVEAL'] } },
    orderBy: { createdAt: 'desc' },
  })

  if (!round) return createRound(now)

  if (round.phase === 'BETTING' && now >= round.bettingEndsAt.getTime()) {
    await settleRound(round.id, game.winPct)
    round = await prisma.rouletteRound.findUniqueOrThrow({ where: { id: round.id } })
  }

  if (round.phase === 'LOCKED') {
    const lockEnd = round.lockedEndsAt?.getTime() ?? round.bettingEndsAt.getTime() + LOCK_MS
    if (now >= lockEnd) {
      round = await prisma.rouletteRound.update({
        where: { id: round.id },
        data: { phase: 'REVEAL', revealEndsAt: new Date(now + REVEAL_MS) },
      })
    }
  }

  if (round.phase === 'REVEAL') {
    const revealEnd = round.revealEndsAt?.getTime() ?? now
    if (now >= revealEnd) return createRound(now)
  }

  return round
}

/** Pick result + pay winners at lock start so clients can spin to a known number. */
async function settleRound(roundId: string, winPct: number) {
  const existing = await prisma.rouletteRound.findUnique({ where: { id: roundId } })
  if (!existing || existing.phase !== 'BETTING') return existing
  if (existing.resultNumber != null) return existing

  const openBets = await prisma.rouletteBet.findMany({ where: { roundId, state: 'ACTIVE' } })
  const exposure = Array.from({ length: POCKETS }, () => 0)
  for (const bet of openBets) {
    const type = bet.betType as RouletteApiBetType
    for (let n = 0; n < POCKETS; n++) {
      const mult = rouletteReturnMultiplier(type, bet.value, n)
      if (mult > 0) exposure[n]! += Number(bet.amount) * mult
    }
  }

  const forced =
    existing.forcedResult != null && existing.forcedResult >= 0 && existing.forcedResult <= 36
      ? existing.forcedResult
      : null
  const resultNumber = forced ?? generateResult(winPct, exposure)

  return runMoneyTx(async (tx) => {
    const fresh = await tx.rouletteRound.findUniqueOrThrow({ where: { id: roundId } })
    if (fresh.phase !== 'BETTING' || fresh.resultNumber != null) return fresh

    const bets = await tx.rouletteBet.findMany({ where: { roundId, state: 'ACTIVE' } })
    let ggrDelta = 0n

    for (const bet of bets) {
      const mult = rouletteReturnMultiplier(bet.betType as RouletteApiBetType, bet.value, resultNumber)
      if (mult > 0) {
        const payout = (bet.amount * BigInt(Math.round(mult * 100))) / 100n
        await post(tx, {
          type: 'GAME_WIN',
          referenceType: 'roulette-win',
          referenceId: bet.id,
          meta: { game: GAME_SLUG, kind: 'win', resultNumber, mult, roundId },
          legs: [
            { account: { system: 'HOUSE' }, direction: 'DEBIT', amount: payout },
            { account: { userId: bet.userId, bucket: 'MAIN' }, direction: 'CREDIT', amount: payout },
          ],
        })
        await clawbackForWin(tx, {
          userId: bet.userId,
          winAmount: payout,
          referenceType: 'roulette-win',
          referenceId: bet.id,
        })
        await tx.rouletteBet.update({
          where: { id: bet.id },
          data: { state: 'CASHED_OUT', payout, endedAt: new Date() },
        })
        ggrDelta += bet.amount - payout
      } else {
        await tx.rouletteBet.update({
          where: { id: bet.id },
          data: { state: 'BUST', payout: 0n, endedAt: new Date() },
        })
        await accrueForLoss(tx, {
          userId: bet.userId,
          lossAmount: bet.amount,
          referenceType: 'roulette-loss',
          referenceId: bet.id,
        })
        ggrDelta += bet.amount
      }
    }

    if (ggrDelta !== 0n) {
      await tx.game.update({ where: { slug: GAME_SLUG }, data: { ggr: { increment: ggrDelta } } })
    }

    return tx.rouletteRound.update({
      where: { id: roundId },
      data: {
        phase: 'LOCKED',
        resultNumber,
        lockedEndsAt: new Date(Date.now() + LOCK_MS),
        forcedResult: null,
      },
    })
  })
}

function msLeftForPhase(
  phase: WingoPhase,
  round: { bettingEndsAt: Date; lockedEndsAt: Date | null; revealEndsAt: Date | null },
): number {
  const now = Date.now()
  if (phase === 'BETTING') return Math.max(0, round.bettingEndsAt.getTime() - now)
  if (phase === 'LOCKED') {
    const end = round.lockedEndsAt?.getTime() ?? round.bettingEndsAt.getTime() + LOCK_MS
    return Math.max(0, end - now)
  }
  const end = round.revealEndsAt?.getTime() ?? now
  return Math.max(0, end - now)
}

function seatLabel(userId: string) {
  return `P${String(10000 + (userId.charCodeAt(userId.length - 1) || 0) * 97 + (userId.charCodeAt(8) || 0)).slice(-5)}`
}

export async function getState(
  userId: string | undefined,
  onlineCount = 0,
  seats: Array<{
    id: string
    name: string
    seat: string
    avatar: number
    balance: number
  }> = [],
) {
  const round = await tickRoulette()
  if (!round) throw unprocessable('Roulette unavailable')

  const historyRows = await prisma.rouletteRound.findMany({
    where: { resultNumber: { not: null } },
    orderBy: { createdAt: 'desc' },
    take: HISTORY_LIMIT,
  })
  const history = historyRows.map((r) => r.resultNumber!)

  const allActive = await prisma.rouletteBet.findMany({
    where: { roundId: round.id, state: 'ACTIVE' },
    orderBy: { createdAt: 'desc' },
    take: PUBLIC_BETS_LIMIT,
    select: {
      id: true,
      betType: true,
      value: true,
      cellKey: true,
      amount: true,
      createdAt: true,
      userId: true,
    },
  })

  // During lock/reveal, also show settled chip stacks for the round
  const displayBets =
    round.phase === 'BETTING'
      ? allActive
      : await prisma.rouletteBet.findMany({
          where: { roundId: round.id, state: { in: ['ACTIVE', 'CASHED_OUT', 'BUST'] } },
          orderBy: { createdAt: 'desc' },
          take: PUBLIC_BETS_LIMIT,
          select: {
            id: true,
            betType: true,
            value: true,
            cellKey: true,
            amount: true,
            createdAt: true,
            userId: true,
          },
        })

  const cellTotals: Record<string, number> = {}
  for (const b of displayBets) {
    const key = b.cellKey || normalizeCellKey(b.betType as RouletteApiBetType, b.value)
    cellTotals[key] = (cellTotals[key] ?? 0) + toRupees(b.amount)
  }

  const uniquePlayers = new Set(displayBets.map((b) => b.userId))
  const publicBets = displayBets
    .filter((b) => b.userId !== userId)
    .map((b) => ({
      id: b.id,
      betKey: b.cellKey || normalizeCellKey(b.betType as RouletteApiBetType, b.value),
      amount: toRupees(b.amount),
      at: b.createdAt.toISOString(),
      seat: seatLabel(b.userId),
    }))

  let myBets: Array<{
    id: string
    type: RouletteApiBetType
    value: number | null
    cellKey: string
    amount: number
    payout: number
    state: string
  }> = []

  if (userId) {
    const open = await prisma.rouletteBet.findMany({
      where: { roundId: round.id, userId },
      orderBy: { createdAt: 'asc' },
    })
    myBets = open.map((b) => ({
      id: b.id,
      type: b.betType as RouletteApiBetType,
      value: b.value,
      cellKey: b.cellKey || normalizeCellKey(b.betType as RouletteApiBetType, b.value),
      amount: toRupees(b.amount),
      payout: toRupees(b.payout),
      state: b.state,
    }))
  }

  const myPayout = myBets.reduce((s, b) => s + (b.state === 'CASHED_OUT' ? b.payout : 0), 0)

  return {
    roundId: round.id,
    period: round.period,
    phase: round.phase.toLowerCase() as 'betting' | 'locked' | 'reveal',
    msLeft: msLeftForPhase(round.phase, round),
    canBet: round.phase === 'BETTING',
    result: round.resultNumber,
    history,
    myBets,
    myPayout,
    publicBets,
    cellTotals,
    seats,
    playersOnline: Math.max(onlineCount, uniquePlayers.size, seats.length),
    playersBetting: uniquePlayers.size,
    tableWagered: Object.values(cellTotals).reduce((a, b) => a + b, 0),
    forcedPending:
      (round.forcedResult != null && round.phase !== 'REVEAL') || pendingNextForce != null,
    serverTime: new Date().toISOString(),
  }
}

function parseBetInput(typeRaw: string, value: number | null | undefined, cellKey?: string | null) {
  if (!BET_TYPES.includes(typeRaw as RouletteApiBetType)) throw badRequest('Invalid bet type')
  const type = typeRaw as RouletteApiBetType

  if (type === 'straight') {
    if (value == null || !Number.isInteger(value) || value < 0 || value > 36) {
      throw badRequest('Straight bet requires value 0-36')
    }
    return { type, value, cellKey: normalizeCellKey(type, value, cellKey) }
  }
  if (type === 'dozen' || type === 'column') {
    if (value == null || !Number.isInteger(value) || value < 1 || value > 3) {
      throw badRequest(`${type} bet requires value 1-3`)
    }
    return { type, value, cellKey: normalizeCellKey(type, value, cellKey) }
  }
  if (value != null) throw badRequest('Value only allowed for straight/dozen/column')
  return { type, value: null as number | null, cellKey: normalizeCellKey(type, null, cellKey) }
}

export async function placeBet(
  userId: string,
  typeRaw: string,
  amountRupees: number,
  value?: number | null,
  cellKey?: string | null,
) {
  await getGame()
  const parsed = parseBetInput(typeRaw, value, cellKey)
  const amount = toPaisa(amountRupees)
  if (amount < toPaisa(MIN_BET)) throw badRequest(`Minimum bet is ${MIN_BET}`)

  const round = await tickRoulette()
  if (!round) throw unprocessable('Roulette unavailable')
  if (round.phase !== 'BETTING') throw conflict('Betting closed for this round')

  return runMoneyTx(async (tx) => {
    const fresh = await tx.rouletteRound.findUniqueOrThrow({ where: { id: round.id } })
    if (fresh.phase !== 'BETTING') throw conflict('Betting closed for this round')

    const bal = await getBalances(tx, userId)
    if (bal.MAIN! < amount) throw unprocessable('Insufficient balance')

    const row = await tx.rouletteBet.create({
      data: {
        roundId: round.id,
        userId,
        betType: parsed.type as PrismaRouletteBetType,
        value: parsed.value,
        cellKey: parsed.cellKey,
        amount,
        state: 'ACTIVE',
      },
    })

    await post(tx, {
      type: 'GAME_BET',
      referenceType: 'roulette-bet',
      referenceId: row.id,
      meta: {
        game: GAME_SLUG,
        kind: 'bet',
        betType: parsed.type,
        value: parsed.value,
        cellKey: parsed.cellKey,
        roundId: round.id,
      },
      assertNonNegative: [{ userId, bucket: 'MAIN' }],
      legs: [
        { account: { userId, bucket: 'MAIN' }, direction: 'DEBIT', amount },
        { account: { system: 'HOUSE' }, direction: 'CREDIT', amount },
      ],
    })

    await tx.game.update({ where: { slug: GAME_SLUG }, data: { plays: { increment: 1 } } })
    await recordWagerAndRelease(tx, userId, amount)

    return {
      betId: row.id,
      roundId: round.id,
      type: parsed.type,
      value: row.value,
      cellKey: row.cellKey,
      amount: amountRupees,
      state: row.state,
      betKey: row.cellKey,
      userId,
      at: new Date().toISOString(),
    }
  })
}

export async function revokeBets(userId: string, mode: 'all' | 'last' = 'all') {
  await getGame()
  const round = await tickRoulette()
  if (!round) throw unprocessable('Roulette unavailable')
  if (round.phase !== 'BETTING') throw conflict('Cannot revoke after lock')

  return runMoneyTx(async (tx) => {
    const fresh = await tx.rouletteRound.findUniqueOrThrow({ where: { id: round.id } })
    if (fresh.phase !== 'BETTING') throw conflict('Cannot revoke after lock')

    const bets = await tx.rouletteBet.findMany({
      where: { roundId: round.id, userId, state: 'ACTIVE' },
      orderBy: { createdAt: 'desc' },
    })
    if (!bets.length) throw conflict('No bets to revoke')

    const targets = mode === 'last' ? [bets[0]!] : bets
    let refunded = 0n
    for (const bet of targets) {
      await post(tx, {
        type: 'GAME_REFUND',
        referenceType: 'roulette-revoke',
        referenceId: bet.id,
        meta: { game: GAME_SLUG, kind: 'revoke', roundId: round.id, mode },
        legs: [
          { account: { system: 'HOUSE' }, direction: 'DEBIT', amount: bet.amount },
          { account: { userId, bucket: 'MAIN' }, direction: 'CREDIT', amount: bet.amount },
        ],
      })
      await tx.rouletteBet.update({
        where: { id: bet.id },
        data: { state: 'BUST', payout: 0n, endedAt: new Date() },
      })
      refunded += bet.amount
    }

    return { revoked: targets.length, refunded: toRupees(refunded), mode }
  })
}

export async function forceNextResult(result: number) {
  if (!Number.isInteger(result) || result < 0 || result > 36) throw badRequest('Result must be 0-36')
  await getGame()
  const round = await tickRoulette()
  if (round && round.phase === 'BETTING' && round.resultNumber == null) {
    await prisma.rouletteRound.update({
      where: { id: round.id },
      data: { forcedResult: result },
    })
    pendingNextForce = null
    return { applied: 'current' as const, result, period: round.period }
  }
  pendingNextForce = result
  return { applied: 'next' as const, result, period: round?.period ?? null }
}

export async function clearForce() {
  pendingNextForce = null
  const round = await prisma.rouletteRound.findFirst({
    where: { phase: { in: ['BETTING', 'LOCKED'] }, forcedResult: { not: null } },
    orderBy: { createdAt: 'desc' },
  })
  if (round) {
    await prisma.rouletteRound.update({ where: { id: round.id }, data: { forcedResult: null } })
  }
  return { cleared: true }
}

export async function getLiveAdmin() {
  const round = await tickRoulette()
  const game = await prisma.game.findUnique({ where: { slug: GAME_SLUG } })
  if (!round) {
    return {
      enabled: !!game?.enabled,
      winPct: game?.winPct ?? 90,
      period: null,
      phase: null,
      msLeft: 0,
      result: null,
      forcedResult: pendingNextForce,
      pendingForce: pendingNextForce != null,
      betCount: 0,
      wagered: 0,
    }
  }

  const agg = await prisma.rouletteBet.aggregate({
    where: { roundId: round.id, state: { in: ['ACTIVE', 'CASHED_OUT', 'BUST'] } },
    _count: true,
    _sum: { amount: true },
  })

  return {
    enabled: !!game?.enabled,
    winPct: game?.winPct ?? 90,
    period: round.period,
    phase: round.phase.toLowerCase(),
    msLeft: msLeftForPhase(round.phase, round),
    result: round.resultNumber,
    forcedResult: round.forcedResult ?? pendingNextForce,
    pendingForce: (round.forcedResult != null && round.phase === 'BETTING') || pendingNextForce != null,
    betCount: agg._count,
    wagered: toRupees(agg._sum.amount ?? 0n),
  }
}
