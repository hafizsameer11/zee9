import { prisma } from '../../lib/prisma.js'
import { getSettings, type Settings, type WheelTier } from '../../core/settings.js'
import { toRupees } from '../../lib/money.js'
import type { Prisma } from '@prisma/client'

export type WheelKind = 'SPIN' | 'DEPOSIT'

export type TicketStatus = {
  tickets: number
  earned: number
  used: number
  /** Next tier amount (rupees) shown in UI */
  depositPerSpin: number
  depositProgress: number
  depositRequired: number
  progressPct: number
  totalDeposits: number
  totalWagered: number
  source: 'deposit' | 'betting'
  tiers: WheelTier
}

/** Highest tier spins for an amount (rupees). 4000 → 1, 5000 → 2, etc. */
export function spinsForAmount(amountRupees: number, tiers: WheelTier): number {
  let best = 0
  for (const t of tiers) {
    if (amountRupees + 1e-9 >= t.amount) best = t.spins
  }
  return best
}

/** Next tier above current amount (for progress UI). */
export function nextTier(amountRupees: number, tiers: WheelTier): { amount: number; spins: number } | null {
  for (const t of tiers) {
    if (amountRupees < t.amount) return t
  }
  return null
}

function sortTiers(tiers: WheelTier): WheelTier {
  return [...tiers].sort((a, b) => a.amount - b.amount)
}

/**
 * Deposit wheel: each approved deposit awards spins from the deposit-tier table
 * (e.g. Rs 4000 → 1, Rs 5000 → 2 — not linear Rs1000×N).
 */
async function earnedFromDeposits(
  client: Prisma.TransactionClient | typeof prisma,
  userId: string,
  tiers: WheelTier,
): Promise<{ earned: number; totalDeposits: bigint }> {
  const deposits = await client.deposit.findMany({
    where: { userId, status: 'APPROVED' },
    select: { amount: true },
  })
  let earned = 0
  let total = 0n
  for (const d of deposits) {
    total += d.amount
    earned += spinsForAmount(toRupees(d.amount), tiers)
  }
  return { earned, totalDeposits: total }
}

/**
 * Betting wheel: lifetime GAME_BET volume maps to the highest betting tier
 * (e.g. Rs 5000 wagered → 1 spin, Rs 10000 → 2, …).
 */
async function earnedFromBetting(
  client: Prisma.TransactionClient | typeof prisma,
  userId: string,
  tiers: WheelTier,
): Promise<{ earned: number; totalWagered: bigint }> {
  const accounts = await client.ledgerAccount.findMany({
    where: { ownerId: userId },
    select: { id: true },
  })
  const ids = accounts.map((a) => a.id)
  if (ids.length === 0) return { earned: 0, totalWagered: 0n }

  const agg = await client.ledgerEntry.aggregate({
    where: {
      accountId: { in: ids },
      direction: 'DEBIT',
      transaction: { type: 'GAME_BET' },
    },
    _sum: { amount: true },
  })
  const totalWagered = agg._sum.amount ?? 0n
  const earned = spinsForAmount(toRupees(totalWagered), tiers)
  return { earned, totalWagered }
}

function formatStatus(opts: {
  earned: number
  used: number
  totalDeposits: bigint
  totalWagered: bigint
  tiers: WheelTier
  source: 'deposit' | 'betting'
}): TicketStatus {
  const tiers = sortTiers(opts.tiers)
  const tickets = Math.max(0, opts.earned - opts.used)
  const basisRupees =
    opts.source === 'deposit' ? toRupees(opts.totalDeposits) : toRupees(opts.totalWagered)
  const next = nextTier(basisRupees, tiers)
  let depositRequired = next?.amount ?? tiers[tiers.length - 1]?.amount ?? 0
  let depositProgress = basisRupees
  let progressPct = 100
  if (next) {
    depositProgress = basisRupees
    depositRequired = next.amount
    progressPct = Math.min(100, Math.round((basisRupees / Math.max(1, next.amount)) * 100))
  } else if (tiers.length) {
    depositRequired = tiers[tiers.length - 1]!.amount
    depositProgress = basisRupees
    progressPct = 100
  }

  return {
    tickets,
    earned: opts.earned,
    used: opts.used,
    depositPerSpin: next?.amount ?? depositRequired,
    depositProgress,
    depositRequired,
    progressPct,
    totalDeposits: toRupees(opts.totalDeposits),
    totalWagered: toRupees(opts.totalWagered),
    source: opts.source,
    tiers,
  }
}

export async function getWheelStatus(userId: string, kind: WheelKind = 'DEPOSIT') {
  const s = await getSettings()
  return computeTickets(userId, s, kind)
}

export async function computeTickets(userId: string, s: Settings, kind: WheelKind = 'DEPOSIT') {
  return computeTicketsWith(prisma, userId, s, kind)
}

export async function computeTicketsInsideTx(
  tx: Prisma.TransactionClient,
  userId: string,
  s: Settings,
  kind: WheelKind = 'DEPOSIT',
) {
  return computeTicketsWith(tx, userId, s, kind)
}

async function computeTicketsWith(
  client: Prisma.TransactionClient | typeof prisma,
  userId: string,
  s: Settings,
  kind: WheelKind,
): Promise<TicketStatus> {
  const used = await client.wheelSpin.count({ where: { userId, wheel: kind } })

  if (kind === 'SPIN') {
    const tiers = sortTiers(s.wheelBetTiers?.length ? s.wheelBetTiers : DEFAULT_BET_TIERS)
    const { earned, totalWagered } = await earnedFromBetting(client, userId, tiers)
    const deposits = await client.deposit.aggregate({
      where: { userId, status: 'APPROVED' },
      _sum: { amount: true },
    })
    return formatStatus({
      earned,
      used,
      totalDeposits: deposits._sum.amount ?? 0n,
      totalWagered,
      tiers,
      source: 'betting',
    })
  }

  const tiers = sortTiers(s.wheelDepositTiers?.length ? s.wheelDepositTiers : DEFAULT_DEPOSIT_TIERS)
  const { earned, totalDeposits } = await earnedFromDeposits(client, userId, tiers)
  return formatStatus({
    earned,
    used,
    totalDeposits,
    totalWagered: 0n,
    tiers,
    source: 'deposit',
  })
}

export const DEFAULT_DEPOSIT_TIERS: WheelTier = [
  { amount: 1000, spins: 1 },
  { amount: 5000, spins: 2 },
  { amount: 10000, spins: 3 },
  { amount: 20000, spins: 4 },
  { amount: 50000, spins: 5 },
  { amount: 100000, spins: 7 },
  { amount: 200000, spins: 10 },
  { amount: 500000, spins: 15 },
]

export const DEFAULT_BET_TIERS: WheelTier = [
  { amount: 5000, spins: 1 },
  { amount: 10000, spins: 2 },
  { amount: 50000, spins: 3 },
  { amount: 100000, spins: 4 },
  { amount: 500000, spins: 5 },
]
