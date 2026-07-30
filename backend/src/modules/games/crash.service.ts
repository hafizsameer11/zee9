import crypto from 'node:crypto'
import { prisma } from '../../lib/prisma.js'
import { runMoneyTx } from '../../core/tx.js'
import { post, getBalances } from '../../core/ledger.js'
import { toPaisa, toRupees } from '../../lib/money.js'
import { badRequest, conflict, notFound, unprocessable } from '../../core/errors.js'
import { recordWagerAndRelease } from '../../core/wager.js'
import { accrueForLoss, clawbackForWin } from '../commission/commission.service.js'

const GAME_SLUG = 'crash'
const WAITING_MS = 5_000
const CRASHED_MS = 3_000
const GROWTH = 0.00006
const HISTORY_LIMIT = 20

let pendingNextForce: number | null = null

function resolveCrashPoint(winPct: number): number {
  if (pendingNextForce != null) {
    const v = pendingNextForce
    pendingNextForce = null
    return Math.min(Math.max(1, Math.floor(v * 100) / 100), 100)
  }
  return generateCrashPoint(winPct)
}

export function multiplierAtElapsed(elapsedMs: number): number {
  const m = Math.exp(GROWTH * Math.max(0, elapsedMs))
  return Math.floor(m * 100) / 100
}

export function elapsedForMultiplier(mult: number): number {
  if (mult <= 1) return 0
  return Math.log(mult) / GROWTH
}

/**
 * Server crash point. Admin winPct steers house edge invisibly.
 * Higher winPct → fewer early crashes / better player RTP.
 */
function generateCrashPoint(winPct: number): number {
  const pct = Math.max(0, Math.min(100, winPct))
  const houseEdge = 1 - pct / 100 // 0 at 100% win, 1 at 0% win
  const r = crypto.randomInt(0, 10_000) / 10_000
  // Instant crash chance rises when win% is low
  const instantChance = 0.02 + houseEdge * 0.08
  if (r < instantChance) return 1.0
  const edge = 0.01 + houseEdge * 0.12
  const u = crypto.randomInt(1, 10_000) / 10_000
  const point = (1 - edge) / (1 - u)
  return Math.min(Math.max(1, Math.floor(point * 100) / 100), 100)
}

function maskName(displayName: string, phone: string): string {
  const digits = phone.replace(/\D/g, '')
  const tail = digits.slice(-1) || '0'
  const seed = (displayName || 'P').replace(/\s+/g, '').slice(0, 1).toUpperCase() || 'P'
  return `${seed}***${tail}`
}

async function getGame() {
  const game = await prisma.game.findUnique({ where: { slug: GAME_SLUG } })
  if (!game) throw notFound('Crash game not configured')
  if (!game.enabled) throw unprocessable('Crash is currently disabled')
  return game
}

async function settleBustBets(tx: any, roundId: string) {
  const active = await tx.crashBet.findMany({
    where: { roundId, state: 'ACTIVE' },
  })
  for (const bet of active) {
    await tx.crashBet.update({
      where: { id: bet.id },
      data: { state: 'BUST', endedAt: new Date(), cashoutAt: null, payout: 0n },
    })
    await accrueForLoss(tx, {
      userId: bet.userId,
      lossAmount: bet.bet,
      referenceType: 'crashBet',
      referenceId: bet.id,
    })
  }
  if (active.length) {
    const lost = active.reduce((s: bigint, b: { bet: bigint }) => s + b.bet, 0n)
    await tx.game.update({ where: { slug: GAME_SLUG }, data: { ggr: { increment: lost } } })
  }
}

/** Advance round phases based on wall clock. Safe to call on every poll. */
export async function tickRound() {
  const game = await prisma.game.findUnique({ where: { slug: GAME_SLUG } })
  if (!game?.enabled) return null

  const now = Date.now()

  let round = await prisma.crashRound.findFirst({
    where: {
      gameSlug: GAME_SLUG,
      phase: { in: ['WAITING', 'FLYING', 'CRASHED'] },
    },
    orderBy: { createdAt: 'desc' },
  })

  if (!round) {
    return prisma.crashRound.create({
      data: {
        gameSlug: GAME_SLUG,
        phase: 'WAITING',
        crashPoint: resolveCrashPoint(game.winPct),
        waitingEndsAt: new Date(now + WAITING_MS),
      },
    })
  }

  if (round.phase === 'WAITING' && now >= round.waitingEndsAt.getTime()) {
    round = await prisma.crashRound.update({
      where: { id: round.id },
      data: { phase: 'FLYING', startedAt: new Date(now) },
    })
  }

  if (round.phase === 'FLYING' && round.startedAt) {
    const elapsed = now - round.startedAt.getTime()
    const mult = multiplierAtElapsed(elapsed)
    if (mult >= round.crashPoint) {
      await runMoneyTx(async (tx) => {
        await tx.crashRound.update({
          where: { id: round!.id },
          data: { phase: 'CRASHED', crashedAt: new Date(now) },
        })
        await settleBustBets(tx, round!.id)
      })
      round = await prisma.crashRound.findUniqueOrThrow({ where: { id: round.id } })
    }
  }

  if (round.phase === 'CRASHED' && round.crashedAt) {
    if (now - round.crashedAt.getTime() >= CRASHED_MS) {
      round = await prisma.crashRound.create({
        data: {
          gameSlug: GAME_SLUG,
          phase: 'WAITING',
          crashPoint: resolveCrashPoint(game.winPct),
          waitingEndsAt: new Date(now + WAITING_MS),
        },
      })
    }
  }

  return round
}

function publicPhase(round: { phase: string; startedAt: Date | null; crashPoint: number }) {
  if (round.phase === 'WAITING') return 'waiting' as const
  if (round.phase === 'FLYING') return 'flying' as const
  return 'crashed' as const
}

type BetRow = {
  id: string
  userId: string
  slot: number
  bet: number
  autoAt: number | null
  cashoutAt: number | null
  payout: number
  state: string
  name: string
  avatarSeed: string
}

type RoundSnapshot = {
  roundId: string
  phase: 'waiting' | 'flying' | 'crashed'
  multiplier: number
  elapsedMs: number
  waitingMsLeft: number
  startedAt: string | null
  crashPoint: number | null
  history: number[]
  betCount: number
  serverTime: string
  bets: BetRow[]
}

async function buildRoundSnapshot(): Promise<RoundSnapshot> {
  await getGame()
  const round = await tickRound()
  if (!round) throw unprocessable('Crash unavailable')

  const now = Date.now()
  let mult = 1
  let elapsedMs = 0
  if (round.phase === 'FLYING' && round.startedAt) {
    elapsedMs = Math.max(0, now - round.startedAt.getTime())
    mult = Math.min(multiplierAtElapsed(elapsedMs), round.crashPoint)
  } else if (round.phase === 'CRASHED') {
    mult = round.crashPoint
    elapsedMs = elapsedForMultiplier(round.crashPoint)
  }

  const waitingMsLeft =
    round.phase === 'WAITING' ? Math.max(0, round.waitingEndsAt.getTime() - now) : 0

  const betsRaw = await prisma.crashBet.findMany({
    where: { roundId: round.id },
    include: { user: { select: { displayName: true, phone: true, id: true } } },
    orderBy: { bet: 'desc' },
    take: 40,
  })

  const bets: BetRow[] = betsRaw.map((b) => ({
    id: b.id,
    userId: b.userId,
    slot: b.slot,
    bet: toRupees(b.bet),
    autoAt: b.autoAt,
    cashoutAt: b.cashoutAt,
    payout: toRupees(b.payout),
    state: b.state,
    name: maskName(b.user.displayName, b.user.phone),
    avatarSeed: b.userId.slice(-6),
  }))

  const historyRows = await prisma.crashRound.findMany({
    where: { gameSlug: GAME_SLUG, phase: 'CRASHED' },
    orderBy: { crashedAt: 'desc' },
    take: HISTORY_LIMIT,
    select: { crashPoint: true },
  })

  return {
    roundId: round.id,
    phase: publicPhase(round),
    multiplier: mult,
    elapsedMs,
    waitingMsLeft,
    startedAt: round.startedAt?.toISOString() ?? null,
    crashPoint: round.phase === 'CRASHED' ? round.crashPoint : null,
    history: historyRows.map((h) => h.crashPoint),
    betCount: bets.length,
    serverTime: new Date(now).toISOString(),
    bets,
  }
}

export function personalizeSnapshot(snap: RoundSnapshot, userId?: string) {
  const liveBets = snap.bets.map((b) => ({
    id: b.id,
    name: b.name,
    avatarSeed: b.avatarSeed,
    bet: b.bet,
    cashoutAt: b.cashoutAt,
    cashout: b.payout > 0 ? b.payout : null,
    state: b.state,
    isMe: userId ? b.userId === userId : false,
  }))

  const myBets = userId
    ? snap.bets
        .filter((b) => b.userId === userId)
        .map((b) => ({
          id: b.id,
          slot: b.slot,
          bet: b.bet,
          autoAt: b.autoAt,
          cashoutAt: b.cashoutAt,
          payout: b.payout,
          state: b.state,
        }))
    : []

  return {
    roundId: snap.roundId,
    phase: snap.phase,
    multiplier: snap.multiplier,
    elapsedMs: snap.elapsedMs,
    waitingMsLeft: snap.waitingMsLeft,
    startedAt: snap.startedAt,
    crashPoint: snap.crashPoint,
    history: snap.history,
    liveBets,
    myBets,
    betCount: snap.betCount,
    serverTime: snap.serverTime,
  }
}

export async function getState(userId?: string) {
  const snap = await buildRoundSnapshot()
  return personalizeSnapshot(snap, userId)
}

/** One DB snapshot for the realtime tick; personalize per client in-memory. */
export async function getRoundSnapshot() {
  return buildRoundSnapshot()
}

export async function placeBet(
  userId: string,
  amountRupees: number,
  slot: number,
  autoAt?: number | null,
) {
  await getGame()
  if (slot < 0 || slot > 1) throw badRequest('Invalid bet slot')
  const bet = toPaisa(amountRupees)
  if (bet < toPaisa(10)) throw badRequest('Minimum bet is 10')

  const round = await tickRound()
  if (!round) throw unprocessable('Crash unavailable')
  if (round.phase !== 'WAITING') throw conflict('Bets are closed — wait for next round')

  const auto =
    autoAt != null && Number.isFinite(autoAt) && autoAt >= 1.1
      ? Math.floor(autoAt * 100) / 100
      : null

  return runMoneyTx(async (tx) => {
    const roundClaim = await tx.crashRound.updateMany({
      where: { id: round.id, phase: 'WAITING', waitingEndsAt: { gt: new Date() } },
      data: { phase: 'WAITING' },
    })
    if (roundClaim.count !== 1) throw conflict('Bets are closed — wait for next round')
    const existing = await tx.crashBet.findUnique({
      where: { roundId_userId_slot: { roundId: round.id, userId, slot } },
    })
    if (existing) throw conflict('Bet already placed on this slot')

    const bal = await getBalances(tx, userId)
    if (bal.MAIN! < bet) throw unprocessable('Insufficient balance')

    await post(tx, {
      type: 'GAME_BET',
      referenceType: 'crash-bet',
      referenceId: `${round.id}:${userId}:${slot}`,
      meta: { game: GAME_SLUG, kind: 'bet', roundId: round.id, slot },
      assertNonNegative: [{ userId, bucket: 'MAIN' }],
      legs: [
        { account: { userId, bucket: 'MAIN' }, direction: 'DEBIT', amount: bet },
        { account: { system: 'HOUSE' }, direction: 'CREDIT', amount: bet },
      ],
    })

    const row = await tx.crashBet.create({
      data: {
        roundId: round.id,
        userId,
        slot,
        bet,
        autoAt: auto,
        state: 'ACTIVE',
      },
    })

    await tx.game.update({ where: { slug: GAME_SLUG }, data: { plays: { increment: 1 } } })
    await recordWagerAndRelease(tx, userId, bet)

    return {
      betId: row.id,
      roundId: round.id,
      slot,
      bet: amountRupees,
      autoAt: auto,
      state: row.state,
    }
  })
}

export async function cashOut(userId: string, betId: string) {
  await getGame()
  const round = await tickRound()
  if (!round) throw unprocessable('Crash unavailable')
  if (round.phase !== 'FLYING' || !round.startedAt) throw conflict('Cannot cash out now')

  const elapsed = Date.now() - round.startedAt.getTime()
  const mult = multiplierAtElapsed(elapsed)
  if (mult >= round.crashPoint) throw conflict('Round already crashed')

  const cashMult = Math.min(mult, round.crashPoint - 0.01)
  if (cashMult < 1.01) throw conflict('Multiplier too low')

  return runMoneyTx(async (tx) => {
    const bet = await tx.crashBet.findFirst({
      where: { id: betId, userId, roundId: round.id },
    })
    if (!bet) throw notFound('Bet not found')
    if (bet.state !== 'ACTIVE') throw conflict('Bet already settled')

    // Re-check crash under lock
    const fresh = await tx.crashRound.findUniqueOrThrow({ where: { id: round.id } })
    if (fresh.phase !== 'FLYING' || !fresh.startedAt) throw conflict('Cannot cash out now')
    const elapsed2 = Date.now() - fresh.startedAt.getTime()
    const mult2 = multiplierAtElapsed(elapsed2)
    if (mult2 >= fresh.crashPoint) throw conflict('Round already crashed')

    const finalMult = Math.floor(Math.min(mult2, fresh.crashPoint - 0.01) * 100) / 100
    const payout = (bet.bet * BigInt(Math.round(finalMult * 100))) / 100n

    await post(tx, {
      type: 'GAME_WIN',
      referenceType: 'crash-win',
      referenceId: bet.id,
      meta: { game: GAME_SLUG, kind: 'cashout', mult: finalMult, roundId: round.id },
      legs: [
        { account: { system: 'HOUSE' }, direction: 'DEBIT', amount: payout },
        { account: { userId, bucket: 'MAIN' }, direction: 'CREDIT', amount: payout },
      ],
    })

    await tx.crashBet.update({
      where: { id: bet.id },
      data: {
        state: 'CASHED_OUT',
        cashoutAt: finalMult,
        payout,
        endedAt: new Date(),
      },
    })

    const profit = payout > bet.bet ? payout - bet.bet : 0n
    if (profit > 0n) {
      await clawbackForWin(tx, {
        userId,
        winAmount: profit,
        referenceType: 'crash-win',
        referenceId: bet.id,
      })
    }

    const ggrDelta = bet.bet - payout
    await tx.game.update({ where: { slug: GAME_SLUG }, data: { ggr: { increment: ggrDelta } } })

    return {
      betId: bet.id,
      cashoutAt: finalMult,
      payout: toRupees(payout),
      state: 'CASHED_OUT' as const,
    }
  })
}

/** Process auto-cashouts for one player (HTTP fallback / WS connect). */
export async function processAutoCashouts(userId: string) {
  const round = await prisma.crashRound.findFirst({
    where: { gameSlug: GAME_SLUG, phase: 'FLYING' },
    orderBy: { createdAt: 'desc' },
  })
  if (!round?.startedAt) return []

  const elapsed = Date.now() - round.startedAt.getTime()
  const mult = multiplierAtElapsed(elapsed)
  if (mult >= round.crashPoint) return []

  const due = await prisma.crashBet.findMany({
    where: {
      roundId: round.id,
      userId,
      state: 'ACTIVE',
      autoAt: { not: null, lte: mult },
    },
  })

  const results = []
  for (const bet of due) {
    try {
      results.push(await cashOut(userId, bet.id))
    } catch {
      /* race with crash — ignore */
    }
  }
  return results
}

/** Process all due auto-cashouts (realtime tick loop). */
export async function processAllAutoCashouts() {
  const round = await prisma.crashRound.findFirst({
    where: { gameSlug: GAME_SLUG, phase: 'FLYING' },
    orderBy: { createdAt: 'desc' },
  })
  if (!round?.startedAt) return []

  const elapsed = Date.now() - round.startedAt.getTime()
  const mult = multiplierAtElapsed(elapsed)
  if (mult >= round.crashPoint) return []

  const due = await prisma.crashBet.findMany({
    where: {
      roundId: round.id,
      state: 'ACTIVE',
      autoAt: { not: null, lte: mult },
    },
  })

  const results = []
  for (const bet of due) {
    try {
      results.push(await cashOut(bet.userId, bet.id))
    } catch {
      /* race with crash — ignore */
    }
  }
  return results
}

export async function forceNextCrashPoint(mult: number) {
  if (!Number.isFinite(mult) || mult < 1 || mult > 100) throw badRequest('Multiplier must be 1-100')
  const point = Math.floor(mult * 100) / 100
  await getGame()
  const round = await tickRound()
  if (round && round.phase === 'WAITING') {
    await prisma.crashRound.update({
      where: { id: round.id },
      data: { crashPoint: point },
    })
    pendingNextForce = null
    return { applied: 'current' as const, crashPoint: point, roundId: round.id }
  }
  pendingNextForce = point
  return { applied: 'next' as const, crashPoint: point, roundId: round?.id ?? null }
}

export async function clearForce() {
  pendingNextForce = null
  return { cleared: true }
}

export async function getLiveAdmin() {
  const round = await tickRound()
  const game = await prisma.game.findUnique({ where: { slug: GAME_SLUG } })
  if (!round) {
    return {
      enabled: !!game?.enabled,
      winPct: game?.winPct ?? 97,
      roundId: null,
      phase: null,
      multiplier: 1,
      waitingMsLeft: 0,
      crashPoint: null,
      forcedCrashPoint: pendingNextForce,
      pendingForce: pendingNextForce != null,
      betCount: 0,
    }
  }

  const now = Date.now()
  let mult = 1
  if (round.phase === 'FLYING' && round.startedAt) {
    mult = Math.min(multiplierAtElapsed(now - round.startedAt.getTime()), round.crashPoint)
  } else if (round.phase === 'CRASHED') {
    mult = round.crashPoint
  }

  const betCount = await prisma.crashBet.count({ where: { roundId: round.id } })
  const waitingMsLeft =
    round.phase === 'WAITING' ? Math.max(0, round.waitingEndsAt.getTime() - now) : 0

  return {
    enabled: !!game?.enabled,
    winPct: game?.winPct ?? 97,
    roundId: round.id,
    phase: publicPhase(round),
    multiplier: mult,
    waitingMsLeft,
    crashPoint: round.phase === 'CRASHED' ? round.crashPoint : null,
    forcedCrashPoint: pendingNextForce,
    pendingForce: pendingNextForce != null,
    betCount,
  }
}
