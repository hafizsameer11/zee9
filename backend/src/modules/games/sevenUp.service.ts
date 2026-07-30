import crypto from 'node:crypto'
import type { SevenUpSide, WingoPhase } from '@prisma/client'
import { prisma } from '../../lib/prisma.js'
import { runMoneyTx } from '../../core/tx.js'
import { post, getBalances } from '../../core/ledger.js'
import { toPaisa, toRupees } from '../../lib/money.js'
import { badRequest, conflict, notFound, unprocessable } from '../../core/errors.js'
import { recordWagerAndRelease } from '../../core/wager.js'
import { accrueForLoss } from '../commission/commission.service.js'

const GAME_SLUG = '7up-down'
const BETTING_MS = 12_000
const LOCK_MS = 1_000
const REVEAL_MS = 2_500
const HISTORY_LIMIT = 20
const MIN_BET = 1

/** Total-return multipliers. */
const PAYOUT: Record<SevenUpSide, number> = { down: 2, seven: 5, up: 2 }

let pendingForceSum: number | null = null

function formatPeriod(d: Date) {
  const pad = (n: number) => String(n).padStart(2, '0')
  return `7U${d.getFullYear()}${pad(d.getMonth() + 1)}${pad(d.getDate())}${pad(d.getHours())}${pad(d.getMinutes())}${pad(d.getSeconds())}${crypto.randomInt(10, 99)}`
}

function sideFromSum(sum: number): SevenUpSide {
  if (sum < 7) return 'down'
  if (sum > 7) return 'up'
  return 'seven'
}

function rollDice(winPct: number, forcedSum: number | null): { die1: number; die2: number; sum: number } {
  if (forcedSum != null && forcedSum >= 2 && forcedSum <= 12) {
    // Find a die pair for the sum
    for (let d1 = 1; d1 <= 6; d1++) {
      const d2 = forcedSum - d1
      if (d2 >= 1 && d2 <= 6) return { die1: d1, die2: d2, sum: forcedSum }
    }
  }
  let die1 = crypto.randomInt(1, 7)
  let die2 = crypto.randomInt(1, 7)
  const house = 1 - Math.max(0, Math.min(100, winPct)) / 100
  // Soft steer: nudge away from seven when house edge high (seven pays 5x)
  if (house > 0 && die1 + die2 === 7 && crypto.randomInt(0, 10_000) / 10_000 < house * 0.35) {
    die1 = crypto.randomInt(1, 7)
    die2 = crypto.randomInt(1, 7)
  }
  return { die1, die2, sum: die1 + die2 }
}

async function getGame() {
  const game = await prisma.game.findUnique({ where: { slug: GAME_SLUG } })
  if (!game) throw notFound('7 Up Down not configured')
  if (!game.enabled) throw unprocessable('7 Up Down is currently disabled')
  return game
}

function msLeftForPhase(phase: WingoPhase, round: { bettingEndsAt: Date; lockedEndsAt: Date | null; revealEndsAt: Date | null }) {
  const now = Date.now()
  if (phase === 'BETTING') return Math.max(0, round.bettingEndsAt.getTime() - now)
  if (phase === 'LOCKED') return Math.max(0, (round.lockedEndsAt?.getTime() ?? now) - now)
  return Math.max(0, (round.revealEndsAt?.getTime() ?? now) - now)
}

async function createRound(now: number) {
  return prisma.sevenUpRound.create({
    data: {
      period: formatPeriod(new Date(now)),
      phase: 'BETTING',
      forcedSum: pendingForceSum,
      bettingEndsAt: new Date(now + BETTING_MS),
    },
  })
}

async function settleRound(roundId: string, winPct: number) {
  const existing = await prisma.sevenUpRound.findUnique({ where: { id: roundId } })
  if (!existing || existing.phase === 'REVEAL' || existing.sum != null) return existing

  const force = existing.forcedSum ?? pendingForceSum
  if (pendingForceSum != null && force === pendingForceSum) pendingForceSum = null
  const rolled = rollDice(winPct, force)
  const winningSide = sideFromSum(rolled.sum)

  return runMoneyTx(async (tx) => {
    const fresh = await tx.sevenUpRound.findUniqueOrThrow({ where: { id: roundId } })
    if (fresh.phase === 'REVEAL' || fresh.sum != null) return fresh

    const bets = await tx.sevenUpBet.findMany({ where: { roundId, state: 'ACTIVE' } })
    let ggrDelta = 0n

    for (const bet of bets) {
      const mult = bet.side === winningSide ? PAYOUT[bet.side] : 0
      if (mult > 0) {
        const payout = bet.amount * BigInt(mult)
        await post(tx, {
          type: 'GAME_WIN',
          referenceType: '7up-down-win',
          referenceId: bet.id,
          meta: { game: GAME_SLUG, sum: rolled.sum, roundId },
          legs: [
            { account: { system: 'HOUSE' }, direction: 'DEBIT', amount: payout },
            { account: { userId: bet.userId, bucket: 'MAIN' }, direction: 'CREDIT', amount: payout },
          ],
        })
        await tx.sevenUpBet.update({
          where: { id: bet.id },
          data: { state: 'CASHED_OUT', payout, endedAt: new Date() },
        })
        ggrDelta += bet.amount - payout
      } else {
        await tx.sevenUpBet.update({
          where: { id: bet.id },
          data: { state: 'BUST', payout: 0n, endedAt: new Date() },
        })
        ggrDelta += bet.amount
        await accrueForLoss(tx, {
          userId: bet.userId,
          lossAmount: bet.amount,
          referenceType: 'sevenUpBet',
          referenceId: bet.id,
        })
      }
    }

    await tx.game.update({ where: { slug: GAME_SLUG }, data: { ggr: { increment: ggrDelta } } })
    return tx.sevenUpRound.update({
      where: { id: roundId },
      data: {
        phase: 'REVEAL',
        die1: rolled.die1,
        die2: rolled.die2,
        sum: rolled.sum,
        revealEndsAt: new Date(Date.now() + REVEAL_MS),
      },
    })
  })
}

export async function tickSevenUp() {
  const game = await prisma.game.findUnique({ where: { slug: GAME_SLUG } })
  if (!game?.enabled) return null
  const now = Date.now()

  let round = await prisma.sevenUpRound.findFirst({
    where: { phase: { in: ['BETTING', 'LOCKED', 'REVEAL'] } },
    orderBy: { createdAt: 'desc' },
  })
  if (!round) return createRound(now)

  if (round.phase === 'BETTING' && now >= round.bettingEndsAt.getTime()) {
    round = await prisma.sevenUpRound.update({
      where: { id: round.id },
      data: { phase: 'LOCKED', lockedEndsAt: new Date(now + LOCK_MS) },
    })
  }

  if (round.phase === 'LOCKED') {
    const lockEnd = round.lockedEndsAt?.getTime() ?? round.bettingEndsAt.getTime() + LOCK_MS
    if (now >= lockEnd) {
      await settleRound(round.id, game.winPct)
      round = await prisma.sevenUpRound.findUniqueOrThrow({ where: { id: round.id } })
    }
  }

  if (round.phase === 'REVEAL') {
    const revealEnd = round.revealEndsAt?.getTime() ?? now
    if (now >= revealEnd) return createRound(now)
  }
  return round
}

export async function getState(userId: string | undefined, online = 0) {
  const round = await tickSevenUp()
  if (!round) {
    return {
      roundId: null,
      period: null,
      phase: 'betting' as const,
      msLeft: 0,
      canBet: false,
      die1: null,
      die2: null,
      sum: null,
      winningZone: null as SevenUpSide | null,
      history: [] as number[],
      myBets: { down: 0, seven: 0, up: 0 },
      myPayout: 0,
      zoneTotals: { down: 0, seven: 0, up: 0 },
      playersOnline: online,
      serverTime: new Date().toISOString(),
    }
  }

  const historyRows = await prisma.sevenUpRound.findMany({
    where: { sum: { not: null } },
    orderBy: { createdAt: 'desc' },
    take: HISTORY_LIMIT,
    select: { sum: true },
  })

  const myBetRows = userId
    ? await prisma.sevenUpBet.findMany({ where: { roundId: round.id, userId } })
    : []
  const myBets = { down: 0, seven: 0, up: 0 }
  let myPayout = 0
  for (const b of myBetRows) {
    myBets[b.side] += toRupees(b.amount)
    myPayout += toRupees(b.payout)
  }

  const allBets = await prisma.sevenUpBet.findMany({
    where: { roundId: round.id, state: { in: ['ACTIVE', 'CASHED_OUT', 'BUST'] } },
    select: { side: true, amount: true },
  })
  const zoneTotals = { down: 0, seven: 0, up: 0 }
  for (const b of allBets) zoneTotals[b.side] += toRupees(b.amount)

  const winningZone = round.sum != null ? sideFromSum(round.sum) : null

  return {
    roundId: round.id,
    period: round.period,
    phase: round.phase.toLowerCase() as 'betting' | 'locked' | 'reveal',
    msLeft: msLeftForPhase(round.phase, round),
    canBet: round.phase === 'BETTING',
    die1: round.die1,
    die2: round.die2,
    sum: round.sum,
    winningZone,
    history: historyRows.map((h) => h.sum!).filter((n) => n != null),
    myBets,
    myPayout,
    zoneTotals,
    playersOnline: online,
    forcedPending: (round.forcedSum != null && round.phase === 'BETTING') || pendingForceSum != null,
    serverTime: new Date().toISOString(),
  }
}

export async function placeBet(userId: string, side: SevenUpSide, amountRupees: number) {
  if (!['down', 'seven', 'up'].includes(side)) throw badRequest('Invalid side')
  if (amountRupees < MIN_BET) throw badRequest(`Min bet ${MIN_BET}`)
  await getGame()
  const round = await tickSevenUp()
  if (!round || round.phase !== 'BETTING') throw conflict('Betting closed')

  const amount = toPaisa(amountRupees)
  return runMoneyTx(async (tx) => {
    const roundClaim = await tx.sevenUpRound.updateMany({
      where: { id: round.id, phase: 'BETTING', bettingEndsAt: { gt: new Date() } },
      data: { phase: 'BETTING' },
    })
    if (roundClaim.count !== 1) throw conflict('Betting closed')
    const bal = await getBalances(tx, userId)
    if (bal.MAIN! < amount) throw unprocessable('Insufficient balance')

    await post(tx, {
      type: 'GAME_BET',
      referenceType: '7up-down-bet',
      referenceId: userId,
      meta: { game: GAME_SLUG, side, roundId: round.id },
      assertNonNegative: [{ userId, bucket: 'MAIN' }],
      legs: [
        { account: { userId, bucket: 'MAIN' }, direction: 'DEBIT', amount },
        { account: { system: 'HOUSE' }, direction: 'CREDIT', amount },
      ],
    })

    const bet = await tx.sevenUpBet.create({
      data: { roundId: round.id, userId, side, amount },
    })
    await tx.game.update({ where: { slug: GAME_SLUG }, data: { plays: { increment: 1 } } })
    await recordWagerAndRelease(tx, userId, amount)

    return {
      betId: bet.id,
      side,
      amount: amountRupees,
      at: bet.createdAt.toISOString(),
      roundId: round.id,
    }
  })
}

export async function forceNextSum(sum: number) {
  if (!Number.isInteger(sum) || sum < 2 || sum > 12) throw badRequest('Sum must be 2-12')
  await getGame()
  const round = await tickSevenUp()
  if (round && round.phase === 'BETTING' && round.sum == null) {
    await prisma.sevenUpRound.update({ where: { id: round.id }, data: { forcedSum: sum } })
    pendingForceSum = null
    return { applied: 'current' as const, sum, period: round.period }
  }
  pendingForceSum = sum
  return { applied: 'next' as const, sum, period: round?.period ?? null }
}

export async function clearForce() {
  pendingForceSum = null
  const round = await prisma.sevenUpRound.findFirst({
    where: { phase: { in: ['BETTING', 'LOCKED'] }, forcedSum: { not: null } },
    orderBy: { createdAt: 'desc' },
  })
  if (round) await prisma.sevenUpRound.update({ where: { id: round.id }, data: { forcedSum: null } })
  return { cleared: true }
}

export async function getLiveAdmin() {
  const round = await tickSevenUp()
  const game = await prisma.game.findUnique({ where: { slug: GAME_SLUG } })
  const agg = round
    ? await prisma.sevenUpBet.aggregate({
        where: { roundId: round.id },
        _count: true,
        _sum: { amount: true },
      })
    : { _count: 0, _sum: { amount: null } }

  return {
    enabled: !!game?.enabled,
    winPct: game?.winPct ?? 89,
    period: round?.period ?? null,
    phase: round?.phase.toLowerCase() ?? null,
    msLeft: round ? msLeftForPhase(round.phase, round) : 0,
    sum: round?.sum ?? null,
    forcedSum: round?.forcedSum ?? pendingForceSum,
    pendingForce: (round?.forcedSum != null && round.phase === 'BETTING') || pendingForceSum != null,
    betCount: agg._count,
    wagered: toRupees(agg._sum.amount ?? 0n),
  }
}
