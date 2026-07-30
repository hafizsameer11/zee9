import crypto from 'node:crypto'
import type { WingoBetType as PrismaWingoBetType, WingoPhase } from '@prisma/client'
import { prisma } from '../../lib/prisma.js'
import { runMoneyTx } from '../../core/tx.js'
import { post, getBalances } from '../../core/ledger.js'
import { toPaisa, toRupees } from '../../lib/money.js'
import { badRequest, conflict, notFound, unprocessable } from '../../core/errors.js'
import { recordWagerAndRelease } from '../../core/wager.js'
import { accrueForLoss } from '../commission/commission.service.js'

const GAME_SLUG = 'wingo'
const LOCK_MS = 5_000
const REVEAL_MS = 2_500
const HISTORY_LIMIT = 20
const MIN_BET = 1

export const WINGO_MODES = ['30s', '1min', '3min', '5min'] as const
export type WingoMode = (typeof WINGO_MODES)[number]

/** Admin-forced next result per mode (0–9). */
const pendingForceByMode = new Map<WingoMode, number>()

const MODE_MS: Record<WingoMode, number> = {
  '30s': 30_000,
  '1min': 60_000,
  '3min': 180_000,
  '5min': 300_000,
}

export type ApiBetType = 'number' | 'green' | 'red' | 'violet' | 'big' | 'small'

const BET_TYPES: ApiBetType[] = ['number', 'green', 'red', 'violet', 'big', 'small']

function isMode(m: string): m is WingoMode {
  return (WINGO_MODES as readonly string[]).includes(m)
}

function numberToColor(n: number): 'red' | 'green' | 'violet' {
  if (n === 0 || n === 5) return 'violet'
  if ([1, 3, 7, 9].includes(n)) return 'green'
  return 'red'
}

function numberToSize(n: number): 'big' | 'small' {
  return n >= 5 ? 'big' : 'small'
}

function numberToDisplayColors(n: number): Array<'red' | 'green' | 'violet'> {
  if (n === 0) return ['red', 'violet']
  if (n === 5) return ['green', 'violet']
  return [numberToColor(n)]
}

/** Payout multiplier for a single bet against a drawn number. */
export function payoutMultiplier(
  betType: ApiBetType,
  value: number | null | undefined,
  resultNumber: number,
): number {
  const color = numberToColor(resultNumber)
  const size = numberToSize(resultNumber)
  switch (betType) {
    case 'number':
      return value === resultNumber ? 9 : 0
    case 'green':
      if (resultNumber === 5) return 1.5
      return color === 'green' ? 2 : 0
    case 'red':
      if (resultNumber === 0) return 1.5
      return color === 'red' ? 2 : 0
    case 'violet':
      return color === 'violet' ? 4.5 : 0
    case 'big':
      return size === 'big' ? 2 : 0
    case 'small':
      return size === 'small' ? 2 : 0
    default:
      return 0
  }
}

function formatPeriod(d: Date): string {
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}${pad(d.getMonth() + 1)}${pad(d.getDate())}${pad(d.getHours())}${pad(d.getMinutes())}${pad(d.getSeconds())}${String(d.getMilliseconds()).padStart(3, '0').slice(0, 2)}`
}

/**
 * Draw 0–9. Lower winPct slightly biases away from outcomes that would pay
 * the heaviest open exposure on the round (simple house steer).
 */
function generateResult(winPct: number, exposureByNumber: number[]): number {
  const pct = Math.max(0, Math.min(100, winPct))
  const house = 1 - pct / 100
  const weights = exposureByNumber.map((exp, n) => {
    const base = 1
    // Prefer low-liability numbers when house edge is high
    const penalty = exp * (0.15 + house * 1.4)
    return Math.max(0.05, base - penalty)
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
  if (!game) throw notFound('WinGo game not configured')
  if (!game.enabled) throw unprocessable('WinGo is currently disabled')
  return game
}

function roundDurationMs(mode: WingoMode) {
  return MODE_MS[mode]
}

async function createRound(mode: WingoMode, now: number) {
  const duration = roundDurationMs(mode)
  const bettingEndsAt = new Date(now + duration - LOCK_MS)
  const period = `${mode.replace(/\D/g, '')}${formatPeriod(new Date(now))}${crypto.randomInt(10, 99)}`
  return prisma.wingoRound.create({
    data: {
      mode,
      period,
      phase: 'BETTING',
      bettingEndsAt,
    },
  })
}

/** Advance one mode's round based on wall clock. Safe to call often. */
export async function tickMode(mode: string) {
  if (!isMode(mode)) return null
  const game = await prisma.game.findUnique({ where: { slug: GAME_SLUG } })
  if (!game?.enabled) return null

  const now = Date.now()
  let round = await prisma.wingoRound.findFirst({
    where: { mode, phase: { in: ['BETTING', 'LOCKED', 'REVEAL'] } },
    orderBy: { createdAt: 'desc' },
  })

  if (!round) {
    return createRound(mode, now)
  }

  if (round.phase === 'BETTING' && now >= round.bettingEndsAt.getTime()) {
    round = await prisma.wingoRound.update({
      where: { id: round.id },
      data: {
        phase: 'LOCKED',
        lockedEndsAt: new Date(now + LOCK_MS),
      },
    })
  }

  if (round.phase === 'LOCKED') {
    const lockEnd = round.lockedEndsAt?.getTime() ?? round.bettingEndsAt.getTime() + LOCK_MS
    if (now >= lockEnd) {
      await settleRound(round.id, game.winPct)
      round = await prisma.wingoRound.findUniqueOrThrow({ where: { id: round.id } })
    }
  }

  if (round.phase === 'REVEAL') {
    const revealEnd = round.revealEndsAt?.getTime() ?? now
    if (now >= revealEnd) {
      return createRound(mode, now)
    }
  }

  return round
}

async function settleRound(roundId: string, winPct: number) {
  const existing = await prisma.wingoRound.findUnique({ where: { id: roundId } })
  if (!existing || existing.phase === 'REVEAL') return existing
  if (existing.resultNumber != null) return existing
  const mode = existing.mode as WingoMode
  historyCache.delete(mode)

  const openBets = await prisma.wingoBet.findMany({
    where: { roundId, state: 'ACTIVE' },
  })

  // Liability per result number (expected payout in paisa units as float for weighting)
  const exposure = Array.from({ length: 10 }, () => 0)
  for (const bet of openBets) {
    const type = bet.betType as ApiBetType
    for (let n = 0; n < 10; n++) {
      const mult = payoutMultiplier(type, bet.value, n)
      if (mult > 0) exposure[n]! += Number(bet.amount) * mult
    }
  }

  const forced = pendingForceByMode.get(mode)
  if (forced != null) pendingForceByMode.delete(mode)
  const resultNumber = forced ?? generateResult(winPct, exposure)

  return runMoneyTx(async (tx) => {
    const fresh = await tx.wingoRound.findUniqueOrThrow({ where: { id: roundId } })
    if (fresh.phase === 'REVEAL' || fresh.resultNumber != null) return fresh

    const bets = await tx.wingoBet.findMany({ where: { roundId, state: 'ACTIVE' } })
    let ggrDelta = 0n

    for (const bet of bets) {
      const mult = payoutMultiplier(bet.betType as ApiBetType, bet.value, resultNumber)
      if (mult > 0) {
        // Support 1.5x / 4.5x via hundredths
        const payout = (bet.amount * BigInt(Math.round(mult * 100))) / 100n
        await post(tx, {
          type: 'ADMIN_ADJUST',
          referenceType: 'wingo-win',
          referenceId: bet.id,
          meta: { game: GAME_SLUG, kind: 'win', resultNumber, mult, roundId },
          legs: [
            { account: { system: 'HOUSE' }, direction: 'DEBIT', amount: payout },
            { account: { userId: bet.userId, bucket: 'MAIN' }, direction: 'CREDIT', amount: payout },
          ],
        })
        await tx.wingoBet.update({
          where: { id: bet.id },
          data: {
            state: 'CASHED_OUT',
            payout,
            endedAt: new Date(),
          },
        })
        ggrDelta += bet.amount - payout
      } else {
        await tx.wingoBet.update({
          where: { id: bet.id },
          data: {
            state: 'BUST',
            payout: 0n,
            endedAt: new Date(),
          },
        })
        await accrueForLoss(tx, {
          userId: bet.userId,
          lossAmount: bet.amount,
          referenceType: 'wingo-loss',
          referenceId: bet.id,
        })
        ggrDelta += bet.amount
      }
    }

    if (ggrDelta !== 0n) {
      await tx.game.update({ where: { slug: GAME_SLUG }, data: { ggr: { increment: ggrDelta } } })
    }

    return tx.wingoRound.update({
      where: { id: roundId },
      data: {
        phase: 'REVEAL',
        resultNumber,
        revealEndsAt: new Date(Date.now() + REVEAL_MS),
      },
    })
  })
}

function msLeftForPhase(
  phase: WingoPhase,
  round: {
    bettingEndsAt: Date
    lockedEndsAt: Date | null
    revealEndsAt: Date | null
  },
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

/** Total countdown shown to players (betting + lock remaining). */
function displayMsLeft(
  phase: WingoPhase,
  round: {
    bettingEndsAt: Date
    lockedEndsAt: Date | null
    revealEndsAt: Date | null
  },
): number {
  const now = Date.now()
  if (phase === 'BETTING') {
    return Math.max(0, round.bettingEndsAt.getTime() + LOCK_MS - now)
  }
  if (phase === 'LOCKED') {
    const end = round.lockedEndsAt?.getTime() ?? round.bettingEndsAt.getTime() + LOCK_MS
    return Math.max(0, end - now)
  }
  return 0
}

function canBet(phase: WingoPhase) {
  return phase === 'BETTING'
}

export async function tickAllModes() {
  const results = []
  for (const mode of WINGO_MODES) {
    results.push(await tickMode(mode))
  }
  return results
}

type HistoryRow = {
  period: string
  number: number
  color: 'red' | 'green' | 'violet'
  size: 'big' | 'small'
  colors: Array<'red' | 'green' | 'violet'>
}

/** Result history only changes when a round settles, so it is cached per mode. */
const historyCache = new Map<WingoMode, HistoryRow[]>()

async function getHistory(mode: WingoMode): Promise<HistoryRow[]> {
  const cached = historyCache.get(mode)
  if (cached) return cached

  const historyRows = await prisma.wingoRound.findMany({
    where: { mode, phase: 'REVEAL', resultNumber: { not: null } },
    orderBy: { createdAt: 'desc' },
    take: HISTORY_LIMIT,
  })
  const history = historyRows.map((r) => ({
    period: r.period,
    number: r.resultNumber!,
    color: numberToColor(r.resultNumber!),
    size: numberToSize(r.resultNumber!),
    colors: numberToDisplayColors(r.resultNumber!),
  }))
  historyCache.set(mode, history)
  return history
}

/**
 * Round + history for a mode — identical for every player, so realtime builds
 * it once per tick instead of once per connected client.
 */
export async function getModeState(modeRaw: string) {
  if (!isMode(modeRaw)) throw badRequest('Invalid mode')
  const mode = modeRaw
  const round = await tickMode(mode)
  if (!round) throw unprocessable('WinGo unavailable')

  const resultNumber = round.resultNumber
  return {
    roundId: round.id,
    mode,
    period: round.period,
    phase: round.phase.toLowerCase() as 'betting' | 'locked' | 'reveal',
    msLeft: displayMsLeft(round.phase, round),
    phaseMsLeft: msLeftForPhase(round.phase, round),
    canBet: canBet(round.phase),
    result:
      resultNumber != null
        ? {
            number: resultNumber,
            color: numberToColor(resultNumber),
            size: numberToSize(resultNumber),
            colors: numberToDisplayColors(resultNumber),
            period: round.period,
          }
        : null,
    history: await getHistory(mode),
  }
}

/**
 * Per-player slice of the state. `includeHistory` is opt-in because the joined
 * settled-bet query is only worth running when the round changes.
 */
export async function getUserState(
  userId: string,
  roundId: string,
  modeRaw: string,
  includeHistory: boolean,
) {
  if (!isMode(modeRaw)) throw badRequest('Invalid mode')
  const mode = modeRaw

  const open = await prisma.wingoBet.findMany({
    where: { roundId, userId },
    orderBy: { createdAt: 'asc' },
  })
  const myBets = open.map((b) => ({
    id: b.id,
    type: b.betType as ApiBetType,
    value: b.value,
    amount: toRupees(b.amount),
    payout: toRupees(b.payout),
    state: b.state,
  }))

  if (!includeHistory) return { myBets }

  const past = await prisma.wingoBet.findMany({
    where: { userId, round: { mode }, state: { in: ['CASHED_OUT', 'BUST'] } },
    include: { round: { select: { period: true, resultNumber: true } } },
    orderBy: { createdAt: 'desc' },
    take: 30,
  })
  return {
    myBets,
    myHistory: past.map((b) => ({
      id: b.id,
      period: b.round.period,
      type: b.betType as ApiBetType,
      value: b.value,
      amount: toRupees(b.amount),
      payout: toRupees(b.payout),
      state: b.state,
      resultNumber: b.round.resultNumber,
    })),
  }
}

export async function getState(userId: string | undefined, modeRaw: string) {
  const base = await getModeState(modeRaw)
  const mine = userId
    ? await getUserState(userId, base.roundId, base.mode, true)
    : { myBets: [], myHistory: [] }

  return {
    ...base,
    myBets: mine.myBets,
    myHistory: mine.myHistory ?? [],
    serverTime: new Date().toISOString(),
  }
}

export async function placeBet(
  userId: string,
  modeRaw: string,
  typeRaw: string,
  amountRupees: number,
  value?: number | null,
) {
  await getGame()
  if (!isMode(modeRaw)) throw badRequest('Invalid mode')
  if (!BET_TYPES.includes(typeRaw as ApiBetType)) throw badRequest('Invalid bet type')
  const type = typeRaw as ApiBetType
  if (type === 'number') {
    if (value == null || !Number.isInteger(value) || value < 0 || value > 9) {
      throw badRequest('Number bet requires value 0-9')
    }
  } else if (value != null) {
    throw badRequest('Value only allowed for number bets')
  }

  const amount = toPaisa(amountRupees)
  if (amount < toPaisa(MIN_BET)) throw badRequest(`Minimum bet is ${MIN_BET}`)

  const round = await tickMode(modeRaw)
  if (!round) throw unprocessable('WinGo unavailable')
  if (round.phase !== 'BETTING') throw conflict('Betting closed for this round')

  return runMoneyTx(async (tx) => {
    const fresh = await tx.wingoRound.findUniqueOrThrow({ where: { id: round.id } })
    if (fresh.phase !== 'BETTING') throw conflict('Betting closed for this round')

    const bal = await getBalances(tx, userId)
    if (bal.MAIN! < amount) throw unprocessable('Insufficient balance')

    const row = await tx.wingoBet.create({
      data: {
        roundId: round.id,
        userId,
        betType: type as PrismaWingoBetType,
        value: type === 'number' ? value! : null,
        amount,
        state: 'ACTIVE',
      },
    })

    await post(tx, {
      type: 'ADMIN_ADJUST',
      referenceType: 'wingo-bet',
      referenceId: row.id,
      meta: { game: GAME_SLUG, kind: 'bet', mode: modeRaw, betType: type, value, roundId: round.id },
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
      mode: modeRaw,
      type,
      value: row.value,
      amount: amountRupees,
      state: row.state,
    }
  })
}

/** Cancel all ACTIVE bets for the user on the current BETTING round. */
export async function revokeBets(userId: string, modeRaw: string) {
  await getGame()
  if (!isMode(modeRaw)) throw badRequest('Invalid mode')

  const round = await tickMode(modeRaw)
  if (!round) throw unprocessable('WinGo unavailable')
  if (round.phase !== 'BETTING') throw conflict('Cannot revoke after lock')

  return runMoneyTx(async (tx) => {
    const fresh = await tx.wingoRound.findUniqueOrThrow({ where: { id: round.id } })
    if (fresh.phase !== 'BETTING') throw conflict('Cannot revoke after lock')

    const bets = await tx.wingoBet.findMany({
      where: { roundId: round.id, userId, state: 'ACTIVE' },
    })
    if (!bets.length) throw conflict('No bets to revoke')

    let refunded = 0n
    for (const bet of bets) {
      await post(tx, {
        type: 'ADMIN_ADJUST',
        referenceType: 'wingo-revoke',
        referenceId: bet.id,
        meta: { game: GAME_SLUG, kind: 'revoke', roundId: round.id },
        legs: [
          { account: { system: 'HOUSE' }, direction: 'DEBIT', amount: bet.amount },
          { account: { userId, bucket: 'MAIN' }, direction: 'CREDIT', amount: bet.amount },
        ],
      })
      await tx.wingoBet.update({
        where: { id: bet.id },
        data: { state: 'BUST', payout: 0n, endedAt: new Date() },
      })
      refunded += bet.amount
    }

    return {
      revoked: bets.length,
      refunded: toRupees(refunded),
      mode: modeRaw,
    }
  })
}

/** Admin: force the result for the current open round, or the next round. */
export async function forceNextResult(modeRaw: string, result: number) {
  if (!isMode(modeRaw)) throw badRequest('Invalid mode')
  if (!Number.isInteger(result) || result < 0 || result > 9) {
    throw badRequest('Result must be 0-9')
  }

  const game = await prisma.game.findUnique({ where: { slug: GAME_SLUG } })
  if (!game) throw notFound('WinGo game not configured')

  const round = await tickMode(modeRaw)
  pendingForceByMode.set(modeRaw, result)
  const applied =
    round && round.phase === 'BETTING' && round.resultNumber == null
      ? ('current' as const)
      : ('next' as const)

  return { applied, result, mode: modeRaw, period: round?.period ?? null }
}

export async function clearForce(modeRaw: string) {
  if (!isMode(modeRaw)) throw badRequest('Invalid mode')
  pendingForceByMode.delete(modeRaw)
  return { cleared: true, mode: modeRaw }
}

export async function getLiveAdmin(modeRaw: string) {
  const mode = isMode(modeRaw) ? modeRaw : '30s'
  const round = await tickMode(mode)
  const game = await prisma.game.findUnique({ where: { slug: GAME_SLUG } })
  const forced = pendingForceByMode.get(mode) ?? null

  if (!round) {
    return {
      enabled: !!game?.enabled,
      winPct: game?.winPct ?? 90,
      mode,
      period: null,
      phase: null,
      msLeft: 0,
      result: null,
      forcedResult: forced,
      pendingForce: forced != null,
      betCount: 0,
      wagered: 0,
    }
  }

  const agg = await prisma.wingoBet.aggregate({
    where: {
      roundId: round.id,
      state: { in: ['ACTIVE', 'CASHED_OUT', 'BUST'] },
    },
    _count: true,
    _sum: { amount: true },
  })

  return {
    enabled: !!game?.enabled,
    winPct: game?.winPct ?? 90,
    mode,
    period: round.period,
    phase: round.phase.toLowerCase(),
    msLeft: msLeftForPhase(round.phase, round),
    result: round.resultNumber,
    forcedResult: forced,
    pendingForce: forced != null,
    betCount: agg._count,
    wagered: toRupees(agg._sum.amount ?? 0n),
  }
}
