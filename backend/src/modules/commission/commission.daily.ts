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

function principalLossTarget(deposits: bigint, wagered: bigint, won: bigint): bigint {
  const netLoss = wagered > won ? wagered - won : 0n
  return netLoss < deposits ? netLoss : deposits
}

async function recipientsFor(
  tx: Tx,
  sourceUserId: string,
  settings: Settings,
): Promise<Map<string, Recipient>> {
  const recipients = new Map<string, Recipient>()
  const add = (agentId: string, level: number, rateBps: number) => {
    const key = `${agentId}:${level}`
    const prior = recipients.get(key)
    recipients.set(key, {
      agentId,
      level,
      // If the same person qualifies as referral agent and mentor, preserve both configured rates.
      rateBps: (prior?.rateBps ?? 0) + rateBps,
    })
  }

  const edges = await tx.referralEdge.findMany({
    where: { descendantId: sourceUserId, level: { lte: settings.commissionLevels } },
    include: { ancestor: { select: { id: true, referralAgentActive: true } } },
    orderBy: { level: 'asc' },
  })

  for (const edge of edges) {
    if (!edge.ancestor.referralAgentActive) continue
    add(edge.ancestorId, edge.level, commissionRateBps(settings, edge.level))
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
        add(channel.ownerId, level, mentorCommissionRateBps(settings, level))
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
  await runMoneyTx(async (tx) => {
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

    const [
      depositsAtStart,
      depositsAtEnd,
      wageredAtStart,
      wageredAtEnd,
      wonAtStart,
      wonAtEnd,
    ] = await Promise.all([
      approvedDepositsBefore(tx, sourceUserId, day.start),
      approvedDepositsBefore(tx, sourceUserId, day.end),
      sumGameEntries(tx, accountId, 'GAME_BET', day.start),
      sumGameEntries(tx, accountId, 'GAME_BET', day.end),
      sumGameEntries(tx, accountId, 'GAME_WIN', day.start),
      sumGameEntries(tx, accountId, 'GAME_WIN', day.end),
    ])

    const lossAtStart = principalLossTarget(depositsAtStart, wageredAtStart, wonAtStart)
    const lossAtEnd = principalLossTarget(depositsAtEnd, wageredAtEnd, wonAtEnd)
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
          idempotencyKey: `commission-daily:${day.key}:${sourceUserId}:${recipient.agentId}:${recipient.level}`,
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
            idempotencyKey: `commission-daily:${day.key}:${sourceUserId}:${recipient.agentId}:${recipient.level}`,
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

    await tx.dailyCommissionSettlement.create({
      data: {
        sourceUserId,
        settlementDate: day.key,
        depositTarget: depositsAtEnd,
        wageredTarget: wageredAtEnd,
        wonTarget: wonAtEnd,
        lossTarget: lossAtEnd,
        lossDelta,
      },
    })
  })
}

export async function settleDailyCommissions(key: string) {
  const settings = await getSettings()
  if (!settings.commissionEnabled || settings.commissionBasis !== 'GGR') return

  const day = boundsFor(key)
  const accounts = await prisma.ledgerAccount.findMany({
    where: {
      ownerId: { not: null },
      bucket: 'MAIN',
      entries: {
        some: {
          createdAt: { gte: day.start, lt: day.end },
          direction: 'DEBIT',
          transaction: { type: 'GAME_BET', status: 'POSTED' },
        },
      },
    },
    select: { id: true, ownerId: true },
  })

  let settled = 0
  let failed = 0
  for (const account of accounts) {
    if (!account.ownerId) continue
    try {
      await settlePlayer(account.id, account.ownerId, day, settings)
      settled++
    } catch (err) {
      failed++
      logger.error({ err, settlementDate: key, sourceUserId: account.ownerId }, 'Daily commission settlement failed')
    }
  }
  logger.info({ settlementDate: key, players: settled, failed }, 'Daily deposited-principal commission settled')
  if (failed > 0) throw new Error(`${failed} daily commission settlement(s) failed`)
}

let timer: ReturnType<typeof setInterval> | null = null
let attemptedDate = ''

async function sweepCompletedDay() {
  const completedDate = shiftDate(dateKeyAt(Date.now()), -1)
  if (attemptedDate === completedDate) return
  attemptedDate = completedDate
  try {
    await settleDailyCommissions(completedDate)
  } catch (err) {
    attemptedDate = ''
    logger.error({ err, settlementDate: completedDate }, 'Daily commission sweep failed')
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
