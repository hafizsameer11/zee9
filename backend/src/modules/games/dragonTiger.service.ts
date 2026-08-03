import crypto from 'node:crypto'
import type { DragonTigerSide, WingoPhase } from '@prisma/client'
import { prisma } from '../../lib/prisma.js'
import { runMoneyTx } from '../../core/tx.js'
import { post, getBalances } from '../../core/ledger.js'
import { toPaisa, toRupees } from '../../lib/money.js'
import { badRequest, conflict, notFound, unprocessable } from '../../core/errors.js'
import { recordWagerAndRelease } from '../../core/wager.js'
import { accrueForLoss } from '../commission/commission.service.js'

const GAME_SLUG = 'dragon-tiger'
const BETTING_MS = 12_000
const LOCK_MS = 1_400
const REVEAL_MS = 6_000
const HISTORY_LIMIT = 24
const MIN_BET = 1

const RANKS = ['A', '2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K'] as const
const SUITS = ['S', 'H', 'D', 'C'] as const
const RANK_VALUE: Record<string, number> = {
  A: 1, '2': 2, '3': 3, '4': 4, '5': 5, '6': 6, '7': 7, '8': 8, '9': 9, '10': 10, J: 11, Q: 12, K: 13,
}

/** Total-return multipliers (stake included). */
const PAYOUT: Record<DragonTigerSide, number> = { dragon: 2, tiger: 2, tie: 9 }

let pendingForce: DragonTigerSide | null = null

function formatPeriod(d: Date) {
  const pad = (n: number) => String(n).padStart(2, '0')
  return `DT${d.getFullYear()}${pad(d.getMonth() + 1)}${pad(d.getDate())}${pad(d.getHours())}${pad(d.getMinutes())}${pad(d.getSeconds())}${crypto.randomInt(10, 99)}`
}

function pickCard(exclude?: { rank: string; suit: string }) {
  for (let i = 0; i < 40; i++) {
    const rank = RANKS[crypto.randomInt(0, RANKS.length)]!
    const suit = SUITS[crypto.randomInt(0, SUITS.length)]!
    if (!exclude || exclude.rank !== rank || exclude.suit !== suit) return { rank, suit }
  }
  return { rank: 'A', suit: 'S' }
}

function winnerOf(dRank: string, tRank: string): DragonTigerSide {
  const dv = RANK_VALUE[dRank] ?? 0
  const tv = RANK_VALUE[tRank] ?? 0
  if (dv > tv) return 'dragon'
  if (tv > dv) return 'tiger'
  return 'tie'
}

function deal(winPct: number, force: DragonTigerSide | null) {
  if (force) {
    // Build a deal matching forced winner (pragmatic, not perfect shuffle).
    for (let i = 0; i < 80; i++) {
      const d = pickCard()
      const t = pickCard(d)
      if (winnerOf(d.rank, t.rank) === force) return { dragon: d, tiger: t, winner: force }
    }
  }
  const d = pickCard()
  const t = pickCard(d)
  let winner = winnerOf(d.rank, t.rank)
  // Soft house steer: occasionally flip non-tie toward house when winPct low
  const house = 1 - Math.max(0, Math.min(100, winPct)) / 100
  if (house > 0 && winner !== 'tie' && crypto.randomInt(0, 10_000) / 10_000 < house * 0.15) {
    // Swap cards → flip dragon/tiger
    return { dragon: t, tiger: d, winner: winnerOf(t.rank, d.rank) }
  }
  return { dragon: d, tiger: t, winner }
}

async function getGame() {
  const game = await prisma.game.findUnique({ where: { slug: GAME_SLUG } })
  if (!game) throw notFound('Dragon Tiger not configured')
  if (!game.enabled) throw unprocessable('Dragon Tiger is currently disabled')
  return game
}

function msLeftForPhase(phase: WingoPhase, round: { bettingEndsAt: Date; lockedEndsAt: Date | null; revealEndsAt: Date | null }) {
  const now = Date.now()
  if (phase === 'BETTING') return Math.max(0, round.bettingEndsAt.getTime() - now)
  if (phase === 'LOCKED') return Math.max(0, (round.lockedEndsAt?.getTime() ?? now) - now)
  return Math.max(0, (round.revealEndsAt?.getTime() ?? now) - now)
}

async function createRound(now: number) {
  return prisma.dragonTigerRound.create({
    data: {
      period: formatPeriod(new Date(now)),
      phase: 'BETTING',
      forcedWinner: pendingForce,
      bettingEndsAt: new Date(now + BETTING_MS),
    },
  })
}

async function settleRound(roundId: string, winPct: number) {
  const existing = await prisma.dragonTigerRound.findUnique({ where: { id: roundId } })
  if (!existing || existing.phase === 'REVEAL' || existing.winner) return existing

  const force = existing.forcedWinner ?? pendingForce
  if (pendingForce && force === pendingForce) pendingForce = null
  const dealt = deal(winPct, force)

  return runMoneyTx(async (tx) => {
    const fresh = await tx.dragonTigerRound.findUniqueOrThrow({ where: { id: roundId } })
    if (fresh.phase === 'REVEAL' || fresh.winner) return fresh

    const bets = await tx.dragonTigerBet.findMany({ where: { roundId, state: 'ACTIVE' } })
    let ggrDelta = 0n

    for (const bet of bets) {
      const mult = bet.side === dealt.winner ? PAYOUT[bet.side] : 0
      if (mult > 0) {
        const payout = bet.amount * BigInt(mult)
        await post(tx, {
          type: 'GAME_WIN',
          referenceType: 'dragon-tiger-win',
          referenceId: bet.id,
          meta: { game: GAME_SLUG, winner: dealt.winner, roundId },
          legs: [
            { account: { system: 'HOUSE' }, direction: 'DEBIT', amount: payout },
            { account: { userId: bet.userId, bucket: 'MAIN' }, direction: 'CREDIT', amount: payout },
          ],
        })
        await tx.dragonTigerBet.update({
          where: { id: bet.id },
          data: { state: 'CASHED_OUT', payout, endedAt: new Date() },
        })
        ggrDelta += bet.amount - payout
      } else {
        await tx.dragonTigerBet.update({
          where: { id: bet.id },
          data: { state: 'BUST', payout: 0n, endedAt: new Date() },
        })
        ggrDelta += bet.amount
        await accrueForLoss(tx, {
          userId: bet.userId,
          lossAmount: bet.amount,
          referenceType: 'dragonTigerBet',
          referenceId: bet.id,
        })
      }
    }

    await tx.game.update({ where: { slug: GAME_SLUG }, data: { ggr: { increment: ggrDelta } } })
    return tx.dragonTigerRound.update({
      where: { id: roundId },
      data: {
        phase: 'REVEAL',
        winner: dealt.winner,
        dragonRank: dealt.dragon.rank,
        dragonSuit: dealt.dragon.suit,
        tigerRank: dealt.tiger.rank,
        tigerSuit: dealt.tiger.suit,
        revealEndsAt: new Date(Date.now() + REVEAL_MS),
      },
    })
  })
}

export async function tickDragonTiger() {
  const game = await prisma.game.findUnique({ where: { slug: GAME_SLUG } })
  if (!game?.enabled) return null
  const now = Date.now()

  let round = await prisma.dragonTigerRound.findFirst({
    where: { phase: { in: ['BETTING', 'LOCKED', 'REVEAL'] } },
    orderBy: { createdAt: 'desc' },
  })
  if (!round) return createRound(now)

  if (round.phase === 'BETTING' && now >= round.bettingEndsAt.getTime()) {
    round = await prisma.dragonTigerRound.update({
      where: { id: round.id },
      data: { phase: 'LOCKED', lockedEndsAt: new Date(now + LOCK_MS) },
    })
  }

  if (round.phase === 'LOCKED') {
    const lockEnd = round.lockedEndsAt?.getTime() ?? round.bettingEndsAt.getTime() + LOCK_MS
    if (now >= lockEnd) {
      await settleRound(round.id, game.winPct)
      round = await prisma.dragonTigerRound.findUniqueOrThrow({ where: { id: round.id } })
    }
  }

  if (round.phase === 'REVEAL') {
    const revealEnd = round.revealEndsAt?.getTime() ?? now
    if (now >= revealEnd) return createRound(now)
  }
  return round
}

export async function getState(userId: string | undefined, online = 0) {
  const round = await tickDragonTiger()
  if (!round) {
    return {
      roundId: null,
      period: null,
      phase: 'betting' as const,
      msLeft: 0,
      canBet: false,
      winner: null,
      dragonCard: null,
      tigerCard: null,
      history: [] as DragonTigerSide[],
      myBets: [] as any[],
      myPayout: 0,
      zoneTotals: { dragon: 0, tiger: 0, tie: 0 },
      playersOnline: online,
      serverTime: new Date().toISOString(),
    }
  }

  const historyRows = await prisma.dragonTigerRound.findMany({
    where: { winner: { not: null } },
    orderBy: { createdAt: 'desc' },
    take: HISTORY_LIMIT,
    select: { winner: true },
  })

  const myBets = userId
    ? await prisma.dragonTigerBet.findMany({
        where: { roundId: round.id, userId },
        orderBy: { createdAt: 'asc' },
      })
    : []

  const allBets = await prisma.dragonTigerBet.findMany({
    where: { roundId: round.id, state: { in: ['ACTIVE', 'CASHED_OUT', 'BUST'] } },
    select: { side: true, amount: true },
  })
  const zoneTotals = { dragon: 0, tiger: 0, tie: 0 }
  for (const b of allBets) zoneTotals[b.side] += toRupees(b.amount)

  const myPayout = myBets.reduce((s, b) => s + toRupees(b.payout), 0)

  return {
    roundId: round.id,
    period: round.period,
    phase: round.phase.toLowerCase() as 'betting' | 'locked' | 'reveal',
    msLeft: msLeftForPhase(round.phase, round),
    canBet: round.phase === 'BETTING',
    winner: round.winner,
    dragonCard:
      round.dragonRank && round.dragonSuit
        ? {
            rank: round.dragonRank,
            suit: round.dragonSuit,
            value: RANK_VALUE[round.dragonRank] ?? 0,
            id: `${round.dragonRank}${round.dragonSuit}`,
          }
        : null,
    tigerCard:
      round.tigerRank && round.tigerSuit
        ? {
            rank: round.tigerRank,
            suit: round.tigerSuit,
            value: RANK_VALUE[round.tigerRank] ?? 0,
            id: `${round.tigerRank}${round.tigerSuit}`,
          }
        : null,
    history: historyRows.map((h) => h.winner!).filter(Boolean),
    myBets: myBets.map((b) => ({
      id: b.id,
      side: b.side,
      amount: toRupees(b.amount),
      payout: toRupees(b.payout),
      state: b.state,
    })),
    myPayout,
    zoneTotals,
    playersOnline: online,
    forcedPending: (round.forcedWinner != null && round.phase === 'BETTING') || pendingForce != null,
    serverTime: new Date().toISOString(),
  }
}

export async function placeBet(userId: string, side: DragonTigerSide, amountRupees: number) {
  if (!['dragon', 'tiger', 'tie'].includes(side)) throw badRequest('Invalid side')
  if (amountRupees < MIN_BET) throw badRequest(`Min bet ${MIN_BET}`)
  await getGame()
  const round = await tickDragonTiger()
  if (!round || round.phase !== 'BETTING') throw conflict('Betting closed')

  const amount = toPaisa(amountRupees)
  return runMoneyTx(async (tx) => {
    const roundClaim = await tx.dragonTigerRound.updateMany({
      where: { id: round.id, phase: 'BETTING', bettingEndsAt: { gt: new Date() } },
      data: { phase: 'BETTING' },
    })
    if (roundClaim.count !== 1) throw conflict('Betting closed')
    const bal = await getBalances(tx, userId)
    if (bal.MAIN! < amount) throw unprocessable('Insufficient balance')

    const existing = await tx.dragonTigerBet.findFirst({
      where: { roundId: round.id, userId, state: 'ACTIVE' },
      select: { side: true },
    })
    if (existing && existing.side !== side) {
      throw conflict('Choose one side per round — Dragon, Tie, or Tiger')
    }

    await post(tx, {
      type: 'GAME_BET',
      referenceType: 'dragon-tiger-bet',
      referenceId: userId,
      meta: { game: GAME_SLUG, side, roundId: round.id },
      assertNonNegative: [{ userId, bucket: 'MAIN' }],
      legs: [
        { account: { userId, bucket: 'MAIN' }, direction: 'DEBIT', amount },
        { account: { system: 'HOUSE' }, direction: 'CREDIT', amount },
      ],
    })

    const bet = await tx.dragonTigerBet.create({
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

export async function forceNextWinner(winner: DragonTigerSide) {
  if (!['dragon', 'tiger', 'tie'].includes(winner)) throw badRequest('Invalid winner')
  await getGame()
  const round = await tickDragonTiger()
  if (round && round.phase === 'BETTING' && !round.winner) {
    await prisma.dragonTigerRound.update({ where: { id: round.id }, data: { forcedWinner: winner } })
    pendingForce = null
    return { applied: 'current' as const, winner, period: round.period }
  }
  pendingForce = winner
  return { applied: 'next' as const, winner, period: round?.period ?? null }
}

export async function clearForce() {
  pendingForce = null
  const round = await prisma.dragonTigerRound.findFirst({
    where: { phase: { in: ['BETTING', 'LOCKED'] }, forcedWinner: { not: null } },
    orderBy: { createdAt: 'desc' },
  })
  if (round) await prisma.dragonTigerRound.update({ where: { id: round.id }, data: { forcedWinner: null } })
  return { cleared: true }
}

export async function getLiveAdmin() {
  const round = await tickDragonTiger()
  const game = await prisma.game.findUnique({ where: { slug: GAME_SLUG } })
  const agg = round
    ? await prisma.dragonTigerBet.aggregate({
        where: { roundId: round.id },
        _count: true,
        _sum: { amount: true },
      })
    : { _count: 0, _sum: { amount: null } }

  return {
    enabled: !!game?.enabled,
    winPct: game?.winPct ?? 93,
    period: round?.period ?? null,
    phase: round?.phase.toLowerCase() ?? null,
    msLeft: round ? msLeftForPhase(round.phase, round) : 0,
    winner: round?.winner ?? null,
    forcedWinner: round?.forcedWinner ?? pendingForce,
    pendingForce: (round?.forcedWinner != null && round.phase === 'BETTING') || pendingForce != null,
    betCount: agg._count,
    wagered: toRupees(agg._sum.amount ?? 0n),
  }
}
