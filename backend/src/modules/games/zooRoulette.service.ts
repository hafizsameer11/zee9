import crypto from 'node:crypto'
import type { ZooRouletteAnimal, ZooRouletteZone } from '@prisma/client'
import { prisma } from '../../lib/prisma.js'
import { runMoneyTx } from '../../core/tx.js'
import { getBalances, post } from '../../core/ledger.js'
import { toPaisa, toRupees } from '../../lib/money.js'
import { badRequest, conflict, notFound, unprocessable } from '../../core/errors.js'
import { recordWagerAndRelease } from '../../core/wager.js'
import { accrueForLoss } from '../commission/commission.service.js'

const GAME_SLUG = 'zoo-roulette'
const BETTING_MS = 16_500
const LOCK_MS = 6_850
const REVEAL_MS = 5_700
const HISTORY_LIMIT = 12
const PUBLIC_BETS_LIMIT = 160
const MIN_BET = 1
const MAX_BET = 1_000_000

export const ZOO_TRACK: readonly ZooRouletteAnimal[] = [
  'monkey', 'rabbit', 'rabbit', 'rabbit', 'golden_frog', 'swallow', 'swallow', 'swallow', 'pigeon', 'pigeon',
  'eagle', 'peacock', 'peacock', 'peacock',
  'lion', 'lion', 'lion', 'shark', 'eagle', 'eagle', 'eagle', 'peacock',
  'panda', 'panda', 'monkey', 'monkey', 'monkey', 'panda',
]

export const ZOO_BET_ZONES = [
  'monkey', 'rabbit', 'lion', 'panda',
  'swallow', 'pigeon', 'peacock', 'eagle',
  'shark', 'beast', 'bird',
] as const satisfies readonly ZooRouletteZone[]

const BEAST_ANIMALS = new Set<ZooRouletteAnimal>(['monkey', 'rabbit', 'lion', 'panda'])
const BIRD_ANIMALS = new Set<ZooRouletteAnimal>(['swallow', 'pigeon', 'peacock', 'eagle'])

const ZONE_MULT: Record<ZooRouletteZone, number> = {
  monkey: 8,
  rabbit: 8,
  lion: 12,
  panda: 8,
  swallow: 6,
  pigeon: 8,
  peacock: 8,
  eagle: 12,
  shark: 24,
  beast: 2,
  bird: 2,
}

let tickPromise: Promise<Awaited<ReturnType<typeof tickInternal>>> | null = null

function formatPeriod(d: Date): string {
  const pad = (n: number) => String(n).padStart(2, '0')
  return `ZR${d.getFullYear()}${pad(d.getMonth() + 1)}${pad(d.getDate())}${pad(d.getHours())}${pad(d.getMinutes())}${pad(d.getSeconds())}${String(d.getMilliseconds()).padStart(3, '0')}${crypto.randomInt(100, 999)}`
}

export function payoutMultiplier(zone: ZooRouletteZone, winner: ZooRouletteAnimal): number {
  if (zone === winner) return ZONE_MULT[zone]
  if (zone === 'beast' && BEAST_ANIMALS.has(winner)) return ZONE_MULT.beast
  if (zone === 'bird' && BIRD_ANIMALS.has(winner)) return ZONE_MULT.bird
  if (zone === 'shark' && winner === 'shark') return ZONE_MULT.shark
  return 0
}

async function getGame() {
  const game = await prisma.game.findUnique({ where: { slug: GAME_SLUG } })
  if (!game) throw notFound('Zoo Roulette game not configured')
  if (!game.enabled) throw unprocessable('Zoo Roulette is currently disabled')
  return game
}

async function createRound(now: number) {
  return prisma.zooRouletteRound.create({
    data: {
      period: formatPeriod(new Date(now)),
      phase: 'BETTING',
      bettingEndsAt: new Date(now + BETTING_MS),
    },
  })
}

async function tickInternal() {
  const game = await prisma.game.findUnique({ where: { slug: GAME_SLUG } })
  if (!game?.enabled) return null

  const now = Date.now()
  let round = await prisma.zooRouletteRound.findFirst({
    where: { phase: { in: ['BETTING', 'LOCKED', 'REVEAL'] } },
    orderBy: { createdAt: 'desc' },
  })

  if (!round) return createRound(now)

  if (round.phase === 'BETTING' && now >= round.bettingEndsAt.getTime()) {
    await settleRound(round.id)
    round = await prisma.zooRouletteRound.findUniqueOrThrow({ where: { id: round.id } })
  }

  if (round.phase === 'LOCKED') {
    const end = round.lockedEndsAt?.getTime() ?? round.bettingEndsAt.getTime() + LOCK_MS
    if (now >= end) {
      round = await prisma.zooRouletteRound.update({
        where: { id: round.id },
        data: { phase: 'REVEAL', revealEndsAt: new Date(now + REVEAL_MS) },
      })
    }
  }

  if (round.phase === 'REVEAL') {
    const end = round.revealEndsAt?.getTime() ?? now
    if (now >= end) return createRound(now)
  }
  return round
}

export function tickZooRoulette() {
  if (tickPromise) return tickPromise
  tickPromise = tickInternal().finally(() => {
    tickPromise = null
  })
  return tickPromise
}

async function settleRound(roundId: string) {
  const resultSlot = crypto.randomInt(0, ZOO_TRACK.length)
  const resultAnimal = ZOO_TRACK[resultSlot]!

  return runMoneyTx(async (tx) => {
    const round = await tx.zooRouletteRound.findUniqueOrThrow({ where: { id: roundId } })
    if (round.phase !== 'BETTING' || round.resultAnimal != null) return round

    const bets = await tx.zooRouletteBet.findMany({
      where: { roundId, state: 'ACTIVE' },
      orderBy: { createdAt: 'asc' },
    })
    let ggrDelta = 0n

    for (const bet of bets) {
      const mult = payoutMultiplier(bet.zone, resultAnimal)
      if (mult > 0) {
        const payout = bet.amount * BigInt(mult)
        await post(tx, {
          type: 'GAME_WIN',
          referenceType: 'zoo-roulette-win',
          referenceId: bet.id,
          meta: { game: GAME_SLUG, kind: 'win', resultAnimal, resultSlot, roundId, zone: bet.zone },
          legs: [
            { account: { system: 'HOUSE' }, direction: 'DEBIT', amount: payout },
            { account: { userId: bet.userId, bucket: 'MAIN' }, direction: 'CREDIT', amount: payout },
          ],
        })
        await tx.zooRouletteBet.update({
          where: { id: bet.id },
          data: { state: 'CASHED_OUT', payout, endedAt: new Date() },
        })
        ggrDelta += bet.amount - payout
      } else {
        await tx.zooRouletteBet.update({
          where: { id: bet.id },
          data: { state: 'BUST', payout: 0n, endedAt: new Date() },
        })
        await accrueForLoss(tx, {
          userId: bet.userId,
          lossAmount: bet.amount,
          referenceType: 'zoo-roulette-loss',
          referenceId: bet.id,
        })
        ggrDelta += bet.amount
      }
    }

    if (ggrDelta !== 0n) {
      await tx.game.update({ where: { slug: GAME_SLUG }, data: { ggr: { increment: ggrDelta } } })
    }

    return tx.zooRouletteRound.update({
      where: { id: roundId },
      data: {
        phase: 'LOCKED',
        resultAnimal,
        resultSlot,
        lockedEndsAt: new Date(Date.now() + LOCK_MS),
      },
    })
  })
}

function msLeftForPhase(round: {
  phase: 'BETTING' | 'LOCKED' | 'REVEAL'
  bettingEndsAt: Date
  lockedEndsAt: Date | null
  revealEndsAt: Date | null
}) {
  const now = Date.now()
  if (round.phase === 'BETTING') return Math.max(0, round.bettingEndsAt.getTime() - now)
  if (round.phase === 'LOCKED') {
    return Math.max(0, (round.lockedEndsAt?.getTime() ?? round.bettingEndsAt.getTime() + LOCK_MS) - now)
  }
  return Math.max(0, (round.revealEndsAt?.getTime() ?? now) - now)
}

function seatLabel(userId: string) {
  return `P${String(10000 + (userId.charCodeAt(userId.length - 1) || 0) * 97 + (userId.charCodeAt(8) || 0)).slice(-5)}`
}

export async function getState(userId: string | undefined, onlineCount = 0) {
  const round = await tickZooRoulette()
  if (!round) throw unprocessable('Zoo Roulette unavailable')

  const historyRows = await prisma.zooRouletteRound.findMany({
    where: { resultAnimal: { not: null }, resultSlot: { not: null } },
    orderBy: { createdAt: 'desc' },
    take: HISTORY_LIMIT,
  })
  const history = historyRows.map((r) => ({
    animal: r.resultAnimal!,
    slot: r.resultSlot!,
    period: r.period,
  }))

  const displayBets = await prisma.zooRouletteBet.findMany({
    where: {
      roundId: round.id,
      state: round.phase === 'BETTING' ? 'ACTIVE' : { in: ['ACTIVE', 'CASHED_OUT', 'BUST'] },
    },
    orderBy: { createdAt: 'desc' },
    take: PUBLIC_BETS_LIMIT,
  })

  const cellTotals: Partial<Record<ZooRouletteZone, number>> = {}
  for (const bet of displayBets) {
    cellTotals[bet.zone] = (cellTotals[bet.zone] ?? 0) + toRupees(bet.amount)
  }

  const uniquePlayers = new Set(displayBets.map((b) => b.userId))
  const publicBets = displayBets
    .filter((b) => b.userId !== userId)
    .map((b) => ({
      id: b.id,
      zone: b.zone,
      amount: toRupees(b.amount),
      at: b.createdAt.toISOString(),
      seat: seatLabel(b.userId),
    }))

  const myRows = userId
    ? await prisma.zooRouletteBet.findMany({
        where: { roundId: round.id, userId },
        orderBy: { createdAt: 'asc' },
      })
    : []
  const myBets = myRows.map((b) => ({
    id: b.id,
    zone: b.zone,
    amount: toRupees(b.amount),
    payout: toRupees(b.payout),
    state: b.state,
  }))
  const myPayout = myBets.reduce((sum, b) => sum + (b.state === 'CASHED_OUT' ? b.payout : 0), 0)
  const msLeft = msLeftForPhase(round)

  return {
    roundId: round.id,
    period: round.period,
    phase: round.phase.toLowerCase() as 'betting' | 'locked' | 'reveal',
    msLeft,
    canBet: round.phase === 'BETTING' && msLeft > 250,
    resultAnimal: round.resultAnimal,
    resultSlot: round.resultSlot,
    history,
    myBets,
    myPayout,
    publicBets,
    cellTotals,
    playersOnline: Math.max(onlineCount, uniquePlayers.size),
    playersBetting: uniquePlayers.size,
    tableWagered: Object.values(cellTotals).reduce((a, b) => a + (b ?? 0), 0),
    serverTime: new Date().toISOString(),
  }
}

function parseZone(value: unknown): ZooRouletteZone {
  if (typeof value !== 'string' || !ZOO_BET_ZONES.includes(value as ZooRouletteZone)) {
    throw badRequest('Invalid bet zone')
  }
  return value as ZooRouletteZone
}

export async function placeBet(userId: string, zoneRaw: unknown, amountRupees: number) {
  await getGame()
  const zone = parseZone(zoneRaw)
  if (!Number.isFinite(amountRupees) || amountRupees < MIN_BET || amountRupees > MAX_BET) {
    throw badRequest(`Bet must be between ${MIN_BET} and ${MAX_BET}`)
  }
  const amount = toPaisa(amountRupees)

  const round = await tickZooRoulette()
  if (!round) throw unprocessable('Zoo Roulette unavailable')
  if (round.phase !== 'BETTING' || Date.now() >= round.bettingEndsAt.getTime()) {
    throw conflict('Betting closed for this round')
  }

  return runMoneyTx(async (tx) => {
    const fresh = await tx.zooRouletteRound.findUniqueOrThrow({ where: { id: round.id } })
    if (fresh.phase !== 'BETTING' || Date.now() >= fresh.bettingEndsAt.getTime()) {
      throw conflict('Betting closed for this round')
    }

    const balances = await getBalances(tx, userId)
    if ((balances.MAIN ?? 0n) < amount) throw unprocessable('Insufficient balance')

    const bet = await tx.zooRouletteBet.create({
      data: { roundId: round.id, userId, zone, amount, state: 'ACTIVE' },
    })
    await post(tx, {
      type: 'GAME_BET',
      referenceType: 'zoo-roulette-bet',
      referenceId: bet.id,
      meta: { game: GAME_SLUG, kind: 'bet', zone, roundId: round.id },
      assertNonNegative: [{ userId, bucket: 'MAIN' }],
      legs: [
        { account: { userId, bucket: 'MAIN' }, direction: 'DEBIT', amount },
        { account: { system: 'HOUSE' }, direction: 'CREDIT', amount },
      ],
    })
    await tx.game.update({ where: { slug: GAME_SLUG }, data: { plays: { increment: 1 } } })
    await recordWagerAndRelease(tx, userId, amount)

    return {
      betId: bet.id,
      roundId: round.id,
      zone,
      amount: amountRupees,
      state: bet.state,
      at: bet.createdAt.toISOString(),
    }
  })
}

export async function rebet(userId: string) {
  await getGame()
  const current = await tickZooRoulette()
  if (!current || current.phase !== 'BETTING') throw conflict('Betting closed for this round')

  const previous = await prisma.zooRouletteRound.findFirst({
    where: { id: { not: current.id }, bets: { some: { userId } } },
    orderBy: { createdAt: 'desc' },
    include: { bets: { where: { userId }, orderBy: { createdAt: 'asc' } } },
  })
  if (!previous?.bets.length) throw conflict('No previous bets to repeat')

  const total = previous.bets.reduce((sum, bet) => sum + bet.amount, 0n)
  if (total > toPaisa(MAX_BET)) throw badRequest(`Rebet exceeds maximum ${MAX_BET}`)

  return runMoneyTx(async (tx) => {
    const fresh = await tx.zooRouletteRound.findUniqueOrThrow({ where: { id: current.id } })
    if (fresh.phase !== 'BETTING' || Date.now() >= fresh.bettingEndsAt.getTime()) {
      throw conflict('Betting closed for this round')
    }
    const balances = await getBalances(tx, userId)
    if ((balances.MAIN ?? 0n) < total) throw unprocessable('Insufficient balance')

    const created = []
    for (const old of previous.bets) {
      const bet = await tx.zooRouletteBet.create({
        data: { roundId: current.id, userId, zone: old.zone, amount: old.amount, state: 'ACTIVE' },
      })
      created.push(bet)
      await post(tx, {
        type: 'GAME_BET',
        referenceType: 'zoo-roulette-bet',
        referenceId: bet.id,
        meta: { game: GAME_SLUG, kind: 'rebet', zone: old.zone, roundId: current.id },
        assertNonNegative: [{ userId, bucket: 'MAIN' }],
        legs: [
          { account: { userId, bucket: 'MAIN' }, direction: 'DEBIT', amount: old.amount },
          { account: { system: 'HOUSE' }, direction: 'CREDIT', amount: old.amount },
        ],
      })
      await recordWagerAndRelease(tx, userId, old.amount)
    }
    await tx.game.update({
      where: { slug: GAME_SLUG },
      data: { plays: { increment: created.length } },
    })
    return {
      roundId: current.id,
      count: created.length,
      total: toRupees(total),
      bets: created.map((b) => ({
        betId: b.id,
        zone: b.zone,
        amount: toRupees(b.amount),
        state: b.state,
        at: b.createdAt.toISOString(),
      })),
    }
  })
}
