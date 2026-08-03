import { prisma, type Tx } from '../../lib/prisma.js'
import { logger } from '../../lib/logger.js'
import { runMoneyTx } from '../../core/tx.js'
import { post } from '../../core/ledger.js'
import {
  commissionRateBps,
  getSettings,
  mentorCommissionRateBps,
  type Settings,
} from '../../core/settings.js'
import { applyBps } from '../../lib/money.js'
import {
  countValidDirectReferrals,
  promoterCommissionRateBps,
} from '../referrals/promoterLevel.js'

const PKT_OFFSET_MS = 5 * 60 * 60 * 1000
const CHECK_MS = 30_000

type Bounds = { key: string; start: Date; end: Date; displayAt: Date }
type Recipient = { agentId: string; level: number; rateBps: number }

function dateKeyAt(timestamp: number): string {
  return new Date(timestamp + PKT_OFFSET_MS).toISOString().slice(0, 10)
}

function shiftDate(key: string, days: number): string {
  const timestamp = Date.parse(`${key}T00:00:00.000Z`) + days * 86_400_000
  return new Date(timestamp).toISOString().slice(0, 10)
}

function boundsFor(key: string): Bounds {
  const startMs = Date.parse(`${key}T00:00:00.000Z`) - PKT_OFFSET_MS
  const endMs = startMs + 86_400_000
  return {
    key,
    start: new Date(startMs),
    end: new Date(endMs),
    // History must show one entry at the requested end-of-day time.
    displayAt: new Date(endMs - 1_000),
  }
}

async function sumGameEntries(
  tx: Tx,
  accountId: string,
  type: 'GAME_BET' | 'GAME_WIN',
  before: Date,
): Promise<bigint> {
  const result = await tx.ledgerEntry.aggregate({
    where: {
      accountId,
      createdAt: { lt: before },
      direction: type === 'GAME_BET' ? 'DEBIT' : 'CREDIT',
      transaction: { type, status: 'POSTED' },
    },
    _sum: { amount: true },
  })
  return result._sum.amount ?? 0n
}

async function approvedDepositsBefore(tx: Tx, userId: string, before: Date): Promise<bigint> {
  const result = await tx.deposit.aggregate({
    where: {
      userId,
      status: 'APPROVED',
      OR: [
        { processedAt: { lt: before } },
        { processedAt: null, createdAt: { lt: before } },
      ],
    },
    _sum: { amount: true },
  })
  return result._sum.amount ?? 0n
}

/** Registration + deposit bonuses credited to MAIN — count toward commission loss basis. */
async function bonusCreditsBefore(tx: Tx, userId: string, before: Date): Promise<bigint> {
  const result = await tx.ledgerEntry.aggregate({
    where: {
      account: { ownerId: userId, bucket: 'MAIN' },
      direction: 'CREDIT',
      createdAt: { lt: before },
      transaction: {
        type: { in: ['REGISTRATION_BONUS', 'DEPOSIT_BONUS'] },
        status: 'POSTED',
      },
    },
    _sum: { amount: true },
  })
  return result._sum.amount ?? 0n
}

/** Total player funding (deposits + signup/deposit bonuses) used to cap net loss for commission. */
async function commissionFundingBefore(tx: Tx, userId: string, before: Date): Promise<bigint> {
  const [deposits, bonuses] = await Promise.all([
    approvedDepositsBefore(tx, userId, before),
    bonusCreditsBefore(tx, userId, before),
  ])
  return deposits + bonuses
}

function principalLossTarget(funding: bigint, wagered: bigint, won: bigint): bigint {
  const netLoss = wagered > won ? wagered - won : 0n
  return netLoss < funding ? netLoss : funding
}

async function recipientsFor(
  tx: Tx,
  sourceUserId: string,
  settings: Settings,
): Promise<Map<string, Recipient>> {
  const recipients = new Map<string, Recipient>()
  const add = (agentId: string, level: number, rateBps: number) => {
    if (rateBps <= 0) return
    const key = `${agentId}:${level}`
    const prior = recipients.get(key)
    recipients.set(key, {
      agentId,
      level,
      // One payout per person/level — mentor, agent, and channel paths must not stack.
      rateBps: Math.max(prior?.rateBps ?? 0, rateBps),
    })
  }

  const edges = await tx.referralEdge.findMany({
    where: { descendantId: sourceUserId, level: { lte: settings.commissionLevels } },
    include: { ancestor: { select: { id: true, referralAgentActive: true, role: true } } },
    orderBy: { level: 'asc' },
  })

  for (const edge of edges) {
    let rateBps: number
    if (edge.ancestor.role === 'MENTOR') {
      rateBps = mentorCommissionRateBps(settings, edge.level)
    } else {
      const validRefs = await countValidDirectReferrals(tx, edge.ancestorId)
      rateBps = await promoterCommissionRateBps(
        edge.level,
        validRefs,
        edge.ancestor.referralAgentActive,
      )
    }
    if (rateBps > 0) add(edge.ancestorId, edge.level, rateBps)
  }

  const source = await tx.user.findUnique({
    where: { id: sourceUserId },
    select: { channelCode: true },
  })
  if (source?.channelCode) {
    const channel = await tx.channel.findUnique({
      where: { code: source.channelCode },
      select: { ownerId: true, enabled: true, owner: { select: { role: true } } },
    })
    if (channel?.enabled && channel.owner.role === 'MENTOR') {
      const level = edges.find((edge) => edge.ancestorId === channel.ownerId)?.level ?? 1
      if (level <= settings.commissionLevels) {
        const key = `${channel.ownerId}:${level}`
        if (!recipients.has(key)) {
          add(channel.ownerId, level, mentorCommissionRateBps(settings, level))
        }
      }
    }
  }

  return recipients
}

async function commissionBalance(tx: Tx, userId: string): Promise<bigint> {
  const account = await tx.ledgerAccount.findFirst({
    where: { ownerId: userId, bucket: 'COMMISSION', currency: 'PKR' },
    select: { balance: true },
  })
  return account?.balance ?? 0n
}

async function settlePlayer(accountId: string, sourceUserId: string, day: Bounds, settings: Settings) {
  const todayKey = dateKeyAt(Date.now())
  const allowRerun = day.key === todayKey

  await runMoneyTx(async (tx) => {
    if (!allowRerun) {
      const alreadySettled = await tx.dailyCommissionSettlement.findUnique({
        where: {
          sourceUserId_settlementDate: {
            sourceUserId,
            settlementDate: day.key,
          },
        },
        select: { id: true },
      })
      if (alreadySettled) return
    }

    const [
      fundingAtStart,
      fundingAtEnd,
      wageredAtStart,
      wageredAtEnd,
      wonAtStart,
      wonAtEnd,
    ] = await Promise.all([
      commissionFundingBefore(tx, sourceUserId, day.start),
      commissionFundingBefore(tx, sourceUserId, day.end),
      sumGameEntries(tx, accountId, 'GAME_BET', day.start),
      sumGameEntries(tx, accountId, 'GAME_BET', day.end),
      sumGameEntries(tx, accountId, 'GAME_WIN', day.start),
      sumGameEntries(tx, accountId, 'GAME_WIN', day.end),
    ])

    const lossAtStart = principalLossTarget(fundingAtStart, wageredAtStart, wonAtStart)
    const lossAtEnd = principalLossTarget(fundingAtEnd, wageredAtEnd, wonAtEnd)
    const lossDelta = lossAtEnd - lossAtStart
    const recipients = await recipientsFor(tx, sourceUserId, settings)

    // Include old per-bet recipients so their entries can be consolidated or reversed.
    const oldRows = await tx.commission.findMany({
      where: {
        sourceUserId,
        createdAt: { gte: day.start, lt: day.end },
      },
      select: { agentId: true, level: true, rateBps: true, amount: true },
    })
    for (const row of oldRows) {
      const key = `${row.agentId}:${row.level}`
      if (!recipients.has(key)) {
        recipients.set(key, { agentId: row.agentId, level: row.level, rateBps: 0 })
      }
    }

    for (const recipient of recipients.values()) {
      const existing = oldRows
        .filter((row) => row.agentId === recipient.agentId && row.level === recipient.level)
        .reduce((sum, row) => sum + row.amount, 0n)
      const magnitude = applyBps(lossDelta < 0n ? -lossDelta : lossDelta, recipient.rateBps)
      const desired = lossDelta < 0n ? -magnitude : magnitude
      const requestedAdjustment = desired - existing
      let appliedAdjustment = requestedAdjustment

      if (requestedAdjustment > 0n) {
        await post(tx, {
          type: 'COMMISSION',
          referenceType: 'daily-principal-loss',
          referenceId: `${day.key}:${sourceUserId}`,
          idempotencyKey: `commission-daily:${day.key}:${sourceUserId}:${recipient.agentId}:${recipient.level}:credit:${requestedAdjustment}`,
          meta: { settlementDate: day.key, sourceUserId, level: recipient.level },
          legs: [
            { account: { system: 'HOUSE' }, direction: 'DEBIT', amount: requestedAdjustment },
            { account: { userId: recipient.agentId, bucket: 'COMMISSION' }, direction: 'CREDIT', amount: requestedAdjustment },
          ],
        })
      } else if (requestedAdjustment < 0n) {
        const available = await commissionBalance(tx, recipient.agentId)
        const requestedDebit = -requestedAdjustment
        const debit = requestedDebit < available ? requestedDebit : available
        appliedAdjustment = -debit
        if (debit > 0n) {
          await post(tx, {
            type: 'COMMISSION',
            referenceType: 'daily-principal-loss',
            referenceId: `${day.key}:${sourceUserId}`,
            idempotencyKey: `commission-daily:${day.key}:${sourceUserId}:${recipient.agentId}:${recipient.level}:debit:${debit}`,
            meta: { settlementDate: day.key, sourceUserId, level: recipient.level, adjustment: 'debit' },
            legs: [
              { account: { system: 'HOUSE' }, direction: 'CREDIT', amount: debit },
              { account: { userId: recipient.agentId, bucket: 'COMMISSION' }, direction: 'DEBIT', amount: debit },
            ],
          })
        }
      }

      const finalAmount = existing + appliedAdjustment
      await tx.commission.deleteMany({
        where: {
          agentId: recipient.agentId,
          sourceUserId,
          level: recipient.level,
          createdAt: { gte: day.start, lt: day.end },
        },
      })
      if (finalAmount !== 0n) {
        await tx.commission.create({
          data: {
            agentId: recipient.agentId,
            sourceUserId,
            level: recipient.level,
            rateBps: recipient.rateBps,
            amount: finalAmount,
            status: finalAmount > 0n ? 'ACCRUED' : 'PAID',
            createdAt: day.displayAt,
          },
        })
      }
    }

    await tx.dailyCommissionSettlement.upsert({
      where: {
        sourceUserId_settlementDate: {
          sourceUserId,
          settlementDate: day.key,
        },
      },
      create: {
        sourceUserId,
        settlementDate: day.key,
        depositTarget: fundingAtEnd,
        wageredTarget: wageredAtEnd,
        wonTarget: wonAtEnd,
        lossTarget: lossAtEnd,
        lossDelta,
      },
      update: {
        depositTarget: fundingAtEnd,
        wageredTarget: wageredAtEnd,
        wonTarget: wonAtEnd,
        lossTarget: lossAtEnd,
        lossDelta,
        settledAt: new Date(),
      },
    })
  })
}

export async function settleDailyCommissions(key: string) {
  const settings = await getSettings()
  if (!settings.commissionEnabled || settings.commissionBasis !== 'GGR') return

  const day = boundsFor(key)
  const players = await collectSettlementPlayers(day)

  let settled = 0
  let failed = 0
  for (const [ownerId, accountId] of players) {
    try {
      await settlePlayer(accountId, ownerId, day, settings)
      settled++
    } catch (err) {
      failed++
      logger.error({ err, settlementDate: key, sourceUserId: ownerId }, 'Daily commission settlement failed')
    }
  }
  logger.info({ settlementDate: key, players: settled, failed }, 'Daily deposited-principal commission settled')
  if (failed > 0) throw new Error(`${failed} daily commission settlement(s) failed`)
}

/** Re-run commission for one player (after win / withdraw). Defaults to today PKT. */
export async function settleCommissionsForUser(userId: string, dateKey?: string) {
  const settings = await getSettings()
  if (!settings.commissionEnabled || settings.commissionBasis !== 'GGR') return

  const key = dateKey ?? dateKeyAt(Date.now())
  const day = boundsFor(key)
  const acc = await prisma.ledgerAccount.findFirst({
    where: { ownerId: userId, bucket: 'MAIN', currency: 'PKR' },
    select: { id: true },
  })
  if (!acc) return
  await settlePlayer(acc.id, userId, day, settings)
}

/** Players whose net-loss commission may have changed today (bet, win, or withdraw). */
async function collectSettlementPlayers(day: Bounds): Promise<Map<string, string>> {
  const out = new Map<string, string>()

  async function addUser(userId: string) {
    if (out.has(userId)) return
    const acc = await prisma.ledgerAccount.findFirst({
      where: { ownerId: userId, bucket: 'MAIN', currency: 'PKR' },
      select: { id: true },
    })
    if (acc) out.set(userId, acc.id)
  }

  const inDay = { gte: day.start, lt: day.end }

  const [betRows, winRows, wdRows, commissioned] = await Promise.all([
    prisma.ledgerEntry.findMany({
      where: {
        createdAt: inDay,
        direction: 'DEBIT',
        transaction: { type: 'GAME_BET', status: 'POSTED' },
        account: { bucket: 'MAIN', ownerId: { not: null } },
      },
      select: { account: { select: { ownerId: true } } },
      distinct: ['accountId'],
    }),
    prisma.ledgerEntry.findMany({
      where: {
        createdAt: inDay,
        direction: 'CREDIT',
        transaction: { type: 'GAME_WIN', status: 'POSTED' },
        account: { bucket: 'MAIN', ownerId: { not: null } },
      },
      select: { account: { select: { ownerId: true } } },
      distinct: ['accountId'],
    }),
    prisma.withdrawal.findMany({
      where: { status: 'PAID', processedAt: inDay },
      select: { userId: true },
    }),
    prisma.commission.findMany({
      where: { createdAt: inDay },
      select: { sourceUserId: true },
      distinct: ['sourceUserId'],
    }),
  ])

  for (const r of betRows) {
    if (r.account.ownerId) await addUser(r.account.ownerId)
  }
  for (const r of winRows) {
    if (r.account.ownerId) await addUser(r.account.ownerId)
  }
  for (const w of wdRows) await addUser(w.userId)
  for (const c of commissioned) await addUser(c.sourceUserId)

  return out
}

let timer: ReturnType<typeof setInterval> | null = null
const attemptedDates = new Set<string>()

async function sweepCompletedDay() {
  const today = dateKeyAt(Date.now())
  const yesterday = shiftDate(today, -1)

  if (!attemptedDates.has(yesterday)) {
    attemptedDates.add(yesterday)
    try {
      await settleDailyCommissions(yesterday)
    } catch (err) {
      attemptedDates.delete(yesterday)
      logger.error({ err, settlementDate: yesterday }, 'Daily commission sweep failed')
    }
  }

  try {
    await settleDailyCommissions(today)
  } catch (err) {
    logger.error({ err, settlementDate: today }, 'Intraday commission sweep failed')
  }
}

export function startDailyCommissionSweeper() {
  if (timer) return
  void sweepCompletedDay()
  timer = setInterval(() => void sweepCompletedDay(), CHECK_MS)
  logger.info('Daily deposited-principal commission sweeper started (23:59:59 PKT)')
}

export function stopDailyCommissionSweeper() {
  if (!timer) return
  clearInterval(timer)
  timer = null
}
