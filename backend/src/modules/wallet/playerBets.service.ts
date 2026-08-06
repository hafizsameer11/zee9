import { prisma } from '../../lib/prisma.js'
import { SLOT_SLUGS } from '../games/slot.service.js'

export type PlayerBetRow = {
  id: string
  game: string
  bet: number
  payout: number
  state: string
  multiplier: number
  time: Date
}

const GAME_LABELS: Record<string, string> = {
  'aero-x': 'Aero X',
  'double-crash': 'Double Crash',
  aviator: 'Aviator',
  crash: 'Crash',
  mines: 'Mines',
  'chicken-road': 'Chicken Road',
  roulette: 'Roulette',
  'car-roulette': 'Car Roulette',
  'zoo-roulette': 'Zoo Roulette',
  'dragon-tiger': 'Dragon Tiger',
  '7up-down': '7 Up Down',
  'wingo-lottery': 'WinGo Lottery',
  'money-coming': 'Money Coming',
  'fortune-gems-2': 'Fortune Gems 2',
  'bounty-trail': 'Bounty Trail',
  'wild-bounty': 'Wild Bounty',
  'super-ace': 'Super Ace',
  'double-fortune': 'Double Fortune',
}

const SLOT_REF_TYPES = new Set(SLOT_SLUGS.flatMap((s) => [`${s}-bet`, `${s}-feature-bet`]))

function labelFor(slug: string): string {
  if (slug.startsWith('wingo-')) return `WinGo ${slug.slice(6)}`
  return GAME_LABELS[slug] ?? slug.replace(/-/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase())
}

function toRupees(paisa: bigint): number {
  return Number(paisa) / 100
}

function row(
  id: string,
  slug: string,
  bet: bigint,
  payout: bigint,
  state: string,
  createdAt: Date,
  multiplier?: number | null,
): PlayerBetRow {
  const betN = toRupees(bet)
  const payoutN = toRupees(payout)
  const mult =
    multiplier != null && multiplier > 0
      ? multiplier
      : bet > 0n
        ? Number(payout) / Number(bet)
        : 0
  return {
    id,
    game: labelFor(slug),
    bet: betN,
    payout: payoutN,
    state,
    multiplier: Math.round(mult * 100) / 100,
    time: createdAt,
  }
}

export async function recentPlayerBets(userId: string, limit = 30): Promise<PlayerBetRow[]> {
  const take = limit

  const [
    gameRounds,
    crashBets,
    wingoBets,
    lotteryBets,
    rouletteBets,
    carBets,
    zooBets,
    dragonBets,
    sevenBets,
    slotBets,
  ] = await Promise.all([
    prisma.gameRound.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      take,
      select: { id: true, gameSlug: true, bet: true, payout: true, state: true, multiplier: true, createdAt: true },
    }),
    prisma.crashBet.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      take,
      select: {
        id: true,
        bet: true,
        payout: true,
        state: true,
        cashoutAt: true,
        createdAt: true,
        round: { select: { gameSlug: true } },
      },
    }),
    prisma.wingoBet.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      take,
      select: {
        id: true,
        amount: true,
        payout: true,
        state: true,
        createdAt: true,
        round: { select: { mode: true } },
      },
    }),
    prisma.lotteryBet.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      take,
      select: { id: true, amount: true, payout: true, state: true, createdAt: true },
    }),
    prisma.rouletteBet.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      take,
      select: { id: true, amount: true, payout: true, state: true, createdAt: true },
    }),
    prisma.carRouletteBet.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      take,
      select: { id: true, amount: true, payout: true, state: true, createdAt: true },
    }),
    prisma.zooRouletteBet.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      take,
      select: { id: true, amount: true, payout: true, state: true, createdAt: true },
    }),
    prisma.dragonTigerBet.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      take,
      select: { id: true, amount: true, payout: true, state: true, createdAt: true },
    }),
    prisma.sevenUpBet.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      take,
      select: { id: true, amount: true, payout: true, state: true, createdAt: true },
    }),
    fetchSlotBetsFromLedger(userId, take),
  ])

  const merged: PlayerBetRow[] = [
    ...gameRounds.map((r) => row(r.id, r.gameSlug, r.bet, r.payout, r.state, r.createdAt, r.multiplier)),
    ...crashBets.map((b) =>
      row(b.id, b.round.gameSlug, b.bet, b.payout, b.state, b.createdAt, b.cashoutAt),
    ),
    ...wingoBets.map((b) =>
      row(b.id, `wingo-${b.round.mode}`, b.amount, b.payout, b.state, b.createdAt),
    ),
    ...lotteryBets.map((b) => row(b.id, 'wingo-lottery', b.amount, b.payout, b.state, b.createdAt)),
    ...rouletteBets.map((b) => row(b.id, 'roulette', b.amount, b.payout, b.state, b.createdAt)),
    ...carBets.map((b) => row(b.id, 'car-roulette', b.amount, b.payout, b.state, b.createdAt)),
    ...zooBets.map((b) => row(b.id, 'zoo-roulette', b.amount, b.payout, b.state, b.createdAt)),
    ...dragonBets.map((b) => row(b.id, 'dragon-tiger', b.amount, b.payout, b.state, b.createdAt)),
    ...sevenBets.map((b) => row(b.id, '7up-down', b.amount, b.payout, b.state, b.createdAt)),
    ...slotBets,
  ]

  merged.sort((a, b) => b.time.getTime() - a.time.getTime())
  return merged.slice(0, limit)
}

async function fetchSlotBetsFromLedger(userId: string, take: number): Promise<PlayerBetRow[]> {
  const accountIds = (
    await prisma.ledgerAccount.findMany({
      where: { ownerId: userId, bucket: 'MAIN' },
      select: { id: true },
    })
  ).map((a) => a.id)
  if (!accountIds.length) return []

  const entries = await prisma.ledgerEntry.findMany({
    where: {
      accountId: { in: accountIds },
      direction: 'DEBIT',
      transaction: {
        type: 'GAME_BET',
        referenceType: { in: [...SLOT_REF_TYPES] },
      },
    },
    include: {
      transaction: { select: { id: true, referenceType: true, meta: true, createdAt: true } },
    },
    orderBy: { createdAt: 'desc' },
    take,
  })
  if (!entries.length) return []

  const oldest = entries[entries.length - 1]!.transaction.createdAt
  const wins = await prisma.ledgerEntry.findMany({
    where: {
      accountId: { in: accountIds },
      direction: 'CREDIT',
      transaction: {
        type: 'GAME_WIN',
        createdAt: { gte: oldest },
      },
    },
    include: { transaction: { select: { createdAt: true, meta: true } } },
    orderBy: { createdAt: 'asc' },
  })

  return entries.map((entry) => {
    const ref = entry.transaction.referenceType ?? ''
    const meta = (entry.transaction.meta && typeof entry.transaction.meta === 'object'
      ? entry.transaction.meta
      : {}) as { game?: string }
    const slug = meta.game ?? ref.replace(/-(bet|feature-bet)$/, '')
    const bet = entry.amount
    const betAt = entry.transaction.createdAt.getTime()
    const winEntry = wins.find((w) => {
      const metaWin = (w.transaction.meta && typeof w.transaction.meta === 'object'
        ? w.transaction.meta
        : {}) as { game?: string }
      if (metaWin.game && metaWin.game !== slug) return false
      const t = w.transaction.createdAt.getTime()
      return t >= betAt && t <= betAt + 5000
    })
    const payout = winEntry?.amount ?? 0n
    const state = payout > 0n ? 'CASHED_OUT' : 'BUST'
    return row(entry.transaction.id, slug, bet, payout, state, entry.transaction.createdAt)
  })
}
