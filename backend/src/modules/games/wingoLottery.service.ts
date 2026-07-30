import crypto from 'node:crypto'
import type { LotteryBetType as PrismaLotteryBetType, WingoPhase } from '@prisma/client'
import { prisma } from '../../lib/prisma.js'
import { runMoneyTx } from '../../core/tx.js'
import { post, getBalances } from '../../core/ledger.js'
import { toPaisa, toRupees } from '../../lib/money.js'
import { badRequest, conflict, notFound, unprocessable } from '../../core/errors.js'
import { recordWagerAndRelease } from '../../core/wager.js'
import { accrueForLoss } from '../commission/commission.service.js'

const GAME_SLUG = 'wingo-lottery'

/** Landscape table timings (machine mix/reveal needs a long REVEAL). */
const BETTING_MS = 20_000
const LOCK_MS = 1_500
const REVEAL_MS = 9_000
const HISTORY_LIMIT = 20
const PUBLIC_BETS_LIMIT = 120
const MIN_BET = 1

export type LotteryApiBetType = 'number' | 'green' | 'red' | 'violet'

const BET_TYPES: LotteryApiBetType[] = ['number', 'green', 'red', 'violet']

/** Force for the *next* round if current is already past betting. */
let pendingNextForce: number | null = null

function numberToColor(n: number): 'red' | 'green' | 'violet' {
  if (n === 0 || n === 5) return 'violet'
  if ([1, 3, 7, 9].includes(n)) return 'green'
  return 'red'
}

/** Landscape multipliers (match client UI). */
export function lotteryPayoutMultiplier(
  betType: LotteryApiBetType,
  value: number | null | undefined,
  resultNumber: number,
): number {
  const color = numberToColor(resultNumber)
  switch (betType) {
    case 'number':
      return value === resultNumber ? 9.5 : 0
    case 'green':
      // Classic rule: 5 pays green at half odds (and violet separately).
      if (resultNumber === 5) return 1.5
      return color === 'green' ? 2.4 : 0
    case 'red':
      // Classic rule: 0 pays red at half odds (and violet separately).
      if (resultNumber === 0) return 1.5
      return color === 'red' ? 2.4 : 0
    case 'violet':
      return color === 'violet' ? 4.8 : 0
    default:
      return 0
  }
}

function formatPeriod(d: Date): string {
  const pad = (n: number) => String(n).padStart(2, '0')
  return `L${d.getFullYear()}${pad(d.getMonth() + 1)}${pad(d.getDate())}${pad(d.getHours())}${pad(d.getMinutes())}${pad(d.getSeconds())}${String(d.getMilliseconds()).padStart(3, '0').slice(0, 2)}${crypto.randomInt(10, 99)}`
}

function generateResult(winPct: number, exposureByNumber: number[]): number {
  const pct = Math.max(0, Math.min(100, winPct))
  const house = 1 - pct / 100
  const weights = exposureByNumber.map((exp) => {
    const penalty = exp * (0.15 + house * 1.4)
    return Math.max(0.05, 1 - penalty)
  })
  const total = weights.reduce((a, b) => a + b, 0)
  let r = (crypto.randomInt(0, 10_000) / 10_000) * total
  for (let i = 0; i < 10; i++) {
    r -= weights[i]!
    if (r <= 0) return i
  }
  return crypto.randomInt(0, 10)
}

async function getGame() {
  const game = await prisma.game.findUnique({ where: { slug: GAME_SLUG } })
  if (!game) throw notFound('WinGo Lottery game not configured')
  if (!game.enabled) throw unprocessable('WinGo Lottery is currently disabled')
  return game
}

async function createRound(now: number) {
  const forced = pendingNextForce
  pendingNextForce = null
  return prisma.lotteryRound.create({
    data: {
      period: formatPeriod(new Date(now)),
      phase: 'BETTING',
      bettingEndsAt: new Date(now + BETTING_MS),
      forcedResult: forced,
    },
  })
}

export async function tickLottery() {
  const game = await prisma.game.findUnique({ where: { slug: GAME_SLUG } })
  if (!game?.enabled) return null

  const now = Date.now()
  let round = await prisma.lotteryRound.findFirst({
    where: { phase: { in: ['BETTING', 'LOCKED', 'REVEAL'] } },
    orderBy: { createdAt: 'desc' },
  })

  if (!round) return createRound(now)

  if (round.phase === 'BETTING' && now >= round.bettingEndsAt.getTime()) {
    round = await prisma.lotteryRound.update({
      where: { id: round.id },
      data: { phase: 'LOCKED', lockedEndsAt: new Date(now + LOCK_MS) },
    })
  }

  if (round.phase === 'LOCKED') {
    const lockEnd = round.lockedEndsAt?.getTime() ?? round.bettingEndsAt.getTime() + LOCK_MS
    if (now >= lockEnd) {
      await settleRound(round.id, game.winPct)
      round = await prisma.lotteryRound.findUniqueOrThrow({ where: { id: round.id } })
    }
  }

  if (round.phase === 'REVEAL') {
    const revealEnd = round.revealEndsAt?.getTime() ?? now
    if (now >= revealEnd) return createRound(now)
  }

  return round
}

async function settleRound(roundId: string, winPct: number) {
  const existing = await prisma.lotteryRound.findUnique({ where: { id: roundId } })
  if (!existing || existing.phase === 'REVEAL') return existing
  if (existing.resultNumber != null) return existing

  const openBets = await prisma.lotteryBet.findMany({ where: { roundId, state: 'ACTIVE' } })
  const exposure = Array.from({ length: 10 }, () => 0)
  for (const bet of openBets) {
    const type = bet.betType as LotteryApiBetType
    for (let n = 0; n < 10; n++) {
      const mult = lotteryPayoutMultiplier(type, bet.value, n)
      if (mult > 0) exposure[n]! += Number(bet.amount) * mult
    }
  }

  const forced =
    existing.forcedResult != null && existing.forcedResult >= 0 && existing.forcedResult <= 9
      ? existing.forcedResult
      : null
  const resultNumber = forced ?? generateResult(winPct, exposure)

  return runMoneyTx(async (tx) => {
    const fresh = await tx.lotteryRound.findUniqueOrThrow({ where: { id: roundId } })
    if (fresh.phase === 'REVEAL' || fresh.resultNumber != null) return fresh

    const bets = await tx.lotteryBet.findMany({ where: { roundId, state: 'ACTIVE' } })
    let ggrDelta = 0n

    for (const bet of bets) {
      const mult = lotteryPayoutMultiplier(bet.betType as LotteryApiBetType, bet.value, resultNumber)
      if (mult > 0) {
        const payout = (bet.amount * BigInt(Math.round(mult * 100))) / 100n
        await post(tx, {
          type: 'GAME_WIN',
          referenceType: 'lottery-win',
          referenceId: bet.id,
          meta: { game: GAME_SLUG, kind: 'win', resultNumber, mult, roundId },
          legs: [
            { account: { system: 'HOUSE' }, direction: 'DEBIT', amount: payout },
            { account: { userId: bet.userId, bucket: 'MAIN' }, direction: 'CREDIT', amount: payout },
          ],
        })
        await tx.lotteryBet.update({
          where: { id: bet.id },
          data: { state: 'CASHED_OUT', payout, endedAt: new Date() },
        })
        ggrDelta += bet.amount - payout
      } else {
        await tx.lotteryBet.update({
          where: { id: bet.id },
          data: { state: 'BUST', payout: 0n, endedAt: new Date() },
        })
        await accrueForLoss(tx, {
          userId: bet.userId,
          lossAmount: bet.amount,
          referenceType: 'lottery-loss',
          referenceId: bet.id,
        })
        ggrDelta += bet.amount
      }
    }

    if (ggrDelta !== 0n) {
      await tx.game.update({ where: { slug: GAME_SLUG }, data: { ggr: { increment: ggrDelta } } })
    }

    return tx.lotteryRound.update({
      where: { id: roundId },
      data: {
        phase: 'REVEAL',
        resultNumber,
        revealEndsAt: new Date(Date.now() + REVEAL_MS),
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

function displayMsLeft(
  phase: WingoPhase,
  round: { bettingEndsAt: Date; lockedEndsAt: Date | null; revealEndsAt: Date | null },
): number {
  const now = Date.now()
  if (phase === 'BETTING') return Math.max(0, round.bettingEndsAt.getTime() - now)
  if (phase === 'LOCKED') {
    const end = round.lockedEndsAt?.getTime() ?? round.bettingEndsAt.getTime() + LOCK_MS
    return Math.max(0, end - now)
  }
  return msLeftForPhase('REVEAL', round)
}

function betKeyOf(type: LotteryApiBetType, value: number | null): string {
  if (type === 'number') return `num:${value ?? 0}`
  return `color:${type}`
}

export async function getState(userId: string | undefined, onlineCount = 0) {
  const round = await tickLottery()
  if (!round) throw unprocessable('WinGo Lottery unavailable')

  const historyRows = await prisma.lotteryRound.findMany({
    where: { phase: 'REVEAL', resultNumber: { not: null } },
    orderBy: { createdAt: 'desc' },
    take: HISTORY_LIMIT,
  })
  const history = historyRows.map((r) => r.resultNumber!)

  const allActive = await prisma.lotteryBet.findMany({
    where: { roundId: round.id, state: 'ACTIVE' },
    orderBy: { createdAt: 'desc' },
    take: PUBLIC_BETS_LIMIT,
    select: { id: true, betType: true, value: true, amount: true, createdAt: true, userId: true },
  })

  const cellTotals: Record<string, number> = {}
  for (const b of allActive) {
    const key = betKeyOf(b.betType as LotteryApiBetType, b.value)
    cellTotals[key] = (cellTotals[key] ?? 0) + toRupees(b.amount)
  }

  const uniquePlayers = new Set(allActive.map((b) => b.userId))
  const publicBets = allActive
    .filter((b) => b.userId !== userId)
    .map((b) => ({
      id: b.id,
      betKey: betKeyOf(b.betType as LotteryApiBetType, b.value),
      amount: toRupees(b.amount),
      at: b.createdAt.toISOString(),
      // anonymized seat label for UI (stable per user in this round)
      seat: `P${String(10000 + (b.userId.charCodeAt(b.userId.length - 1) || 0) * 97 + (b.userId.charCodeAt(8) || 0)).slice(-5)}`,
    }))

  let myBets: Array<{
    id: string
    type: LotteryApiBetType
    value: number | null
    amount: number
    payout: number
    state: string
    betKey: string
  }> = []

  if (userId) {
    const open = await prisma.lotteryBet.findMany({
      where: { roundId: round.id, userId },
      orderBy: { createdAt: 'asc' },
    })
    myBets = open.map((b) => ({
      id: b.id,
      type: b.betType as LotteryApiBetType,
      value: b.value,
      amount: toRupees(b.amount),
      payout: toRupees(b.payout),
      state: b.state,
      betKey: betKeyOf(b.betType as LotteryApiBetType, b.value),
    }))
  }

  const forcedPending =
    (round.forcedResult != null && round.phase !== 'REVEAL') || pendingNextForce != null

  return {
    roundId: round.id,
    period: round.period,
    phase: round.phase.toLowerCase() as 'betting' | 'locked' | 'reveal',
    msLeft: displayMsLeft(round.phase, round),
    phaseMsLeft: msLeftForPhase(round.phase, round),
    canBet: round.phase === 'BETTING',
    result: round.resultNumber,
    history,
    myBets,
    publicBets,
    cellTotals,
    playersOnline: Math.max(onlineCount, uniquePlayers.size),
    playersBetting: uniquePlayers.size,
    tableWagered: Object.values(cellTotals).reduce((a, b) => a + b, 0),
    forcedPending,
    serverTime: new Date().toISOString(),
  }
}

export async function placeBet(
  userId: string,
  typeRaw: string,
  amountRupees: number,
  value?: number | null,
) {
  await getGame()
  if (!BET_TYPES.includes(typeRaw as LotteryApiBetType)) throw badRequest('Invalid bet type')
  const type = typeRaw as LotteryApiBetType
  if (type === 'number') {
    if (value == null || !Number.isInteger(value) || value < 0 || value > 9) {
      throw badRequest('Number bet requires value 0-9')
    }
  } else if (value != null) {
    throw badRequest('Value only allowed for number bets')
  }

  const amount = toPaisa(amountRupees)
  if (amount < toPaisa(MIN_BET)) throw badRequest(`Minimum bet is ${MIN_BET}`)

  const round = await tickLottery()
  if (!round) throw unprocessable('WinGo Lottery unavailable')
  if (round.phase !== 'BETTING') throw conflict('Betting closed for this round')

  return runMoneyTx(async (tx) => {
    const fresh = await tx.lotteryRound.findUniqueOrThrow({ where: { id: round.id } })
    if (fresh.phase !== 'BETTING') throw conflict('Betting closed for this round')

    const bal = await getBalances(tx, userId)
    if (bal.MAIN! < amount) throw unprocessable('Insufficient balance')

    const row = await tx.lotteryBet.create({
      data: {
        roundId: round.id,
        userId,
        betType: type as PrismaLotteryBetType,
        value: type === 'number' ? value! : null,
        amount,
        state: 'ACTIVE',
      },
    })

    await post(tx, {
      type: 'GAME_BET',
      referenceType: 'lottery-bet',
      referenceId: row.id,
      meta: { game: GAME_SLUG, kind: 'bet', betType: type, value, roundId: round.id },
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
      type,
      value: row.value,
      amount: amountRupees,
      state: row.state,
      betKey: betKeyOf(type, row.value),
      userId,
      at: new Date().toISOString(),
    }
  })
}

export async function revokeBets(userId: string) {
  await getGame()
  const round = await tickLottery()
  if (!round) throw unprocessable('WinGo Lottery unavailable')
  if (round.phase !== 'BETTING') throw conflict('Cannot revoke after lock')

  return runMoneyTx(async (tx) => {
    const fresh = await tx.lotteryRound.findUniqueOrThrow({ where: { id: round.id } })
    if (fresh.phase !== 'BETTING') throw conflict('Cannot revoke after lock')

    const bets = await tx.lotteryBet.findMany({
      where: { roundId: round.id, userId, state: 'ACTIVE' },
    })
    if (!bets.length) throw conflict('No bets to revoke')

    let refunded = 0n
    for (const bet of bets) {
      await post(tx, {
        type: 'GAME_REFUND',
        referenceType: 'lottery-revoke',
        referenceId: bet.id,
        meta: { game: GAME_SLUG, kind: 'revoke', roundId: round.id },
        legs: [
          { account: { system: 'HOUSE' }, direction: 'DEBIT', amount: bet.amount },
          { account: { userId, bucket: 'MAIN' }, direction: 'CREDIT', amount: bet.amount },
        ],
      })
      await tx.lotteryBet.update({
        where: { id: bet.id },
        data: { state: 'BUST', payout: 0n, endedAt: new Date() },
      })
      refunded += bet.amount
    }

    return { revoked: bets.length, refunded: toRupees(refunded) }
  })
}

/** Admin: force result for current open round, else next round. */
export async function forceNextResult(result: number) {
  if (!Number.isInteger(result) || result < 0 || result > 9) throw badRequest('Result must be 0-9')
  await getGame()
  const round = await tickLottery()
  if (round && (round.phase === 'BETTING' || round.phase === 'LOCKED') && round.resultNumber == null) {
    await prisma.lotteryRound.update({
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
  const round = await prisma.lotteryRound.findFirst({
    where: { phase: { in: ['BETTING', 'LOCKED'] }, forcedResult: { not: null } },
    orderBy: { createdAt: 'desc' },
  })
  if (round) {
    await prisma.lotteryRound.update({ where: { id: round.id }, data: { forcedResult: null } })
  }
  return { cleared: true }
}

export async function getLiveAdmin() {
  const round = await tickLottery()
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

  const agg = await prisma.lotteryBet.aggregate({
    where: { roundId: round.id, state: 'ACTIVE' },
    _count: true,
    _sum: { amount: true },
  })

  return {
    enabled: !!game?.enabled,
    winPct: game?.winPct ?? 90,
    period: round.period,
    phase: round.phase.toLowerCase(),
    msLeft: displayMsLeft(round.phase, round),
    result: round.resultNumber,
    forcedResult: round.forcedResult ?? pendingNextForce,
    pendingForce: (round.forcedResult != null && round.phase !== 'REVEAL') || pendingNextForce != null,
    betCount: agg._count,
    wagered: toRupees(agg._sum.amount ?? 0n),
  }
}
