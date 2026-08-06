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
import { applyBps, toPaisa } from '../../lib/money.js'
import {
  countValidDirectReferrals,
  promoterCommissionRateBps,
} from '../referrals/promoterLevel.js'

const PKT_OFFSET_MS = 5 * 60 * 60 * 1000
const CHECK_MS = 30_000

type Bounds = { key: string; start: Date; end: Date; displayAt: Date }
type Recipient = { agentId: string; level: number; rateBps: number }

async function playerQualifiesForCommission(
  tx: Tx,
  userId: string,
  settings: Settings,
): Promise<boolean> {
  const qualMin = toPaisa(settings.minDepositToQualify)
  const depSum = await tx.deposit.aggregate({
    where: { userId, status: 'APPROVED' },
    _sum: { amount: true },
  })
  return (depSum._sum.amount ?? 0n) >= qualMin
}

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

async function sumPaidWithdrawals(
  tx: Tx,
  userId: string,
  from: Date,
  before: Date,
): Promise<bigint> {
  const result = await tx.withdrawal.aggregate({
    where: {
      userId,
      status: 'PAID',
      processedAt: { gte: from, lt: before },
    },
    _sum: { amount: true },
  })
  return result._sum.amount ?? 0n
}

async function commissionFundingBetween(
  tx: Tx,
  userId: string,
  from: Date,
  before: Date,
): Promise<bigint> {
  const [deposits, bonuses] = await Promise.all([
    tx.deposit.aggregate({
      where: {
        userId,
        status: 'APPROVED',
        OR: [
          { processedAt: { gte: from, lt: before } },
          { processedAt: null, createdAt: { gte: from, lt: before } },
        ],
      },
      _sum: { amount: true },
    }),
    tx.ledgerEntry.aggregate({
      where: {
        account: { ownerId: userId, bucket: 'MAIN' },
        direction: 'CREDIT',
        createdAt: { gte: from, lt: before },
        transaction: {
          type: { in: ['REGISTRATION_BONUS', 'DEPOSIT_BONUS'] },
          status: 'POSTED',
        },
      },
      _sum: { amount: true },
    }),
  ])
  return (deposits._sum.amount ?? 0n) + (bonuses._sum.amount ?? 0n)
}

type FundingEvent = { time: Date; amount: bigint }

/** Deposits + signup/deposit bonuses in [from, before) as timeline events. */
async function fundingEventsBetween(
  tx: Tx,
  userId: string,
  from: Date,
  before: Date,
): Promise<FundingEvent[]> {
  const [deposits, bonuses] = await Promise.all([
    tx.deposit.findMany({
      where: {
        userId,
        status: 'APPROVED',
        OR: [
          { processedAt: { gte: from, lt: before } },
          { processedAt: null, createdAt: { gte: from, lt: before } },
        ],
      },
      select: { amount: true, processedAt: true, createdAt: true },
      orderBy: [{ processedAt: 'asc' }, { createdAt: 'asc' }],
    }),
    tx.ledgerEntry.findMany({
      where: {
        account: { ownerId: userId, bucket: 'MAIN' },
        direction: 'CREDIT',
        createdAt: { gte: from, lt: before },
        transaction: {
          type: { in: ['REGISTRATION_BONUS', 'DEPOSIT_BONUS'] },
          status: 'POSTED',
        },
      },
      select: { amount: true, createdAt: true },
      orderBy: { createdAt: 'asc' },
    }),
  ])

  const events: FundingEvent[] = []
  for (const d of deposits) {
    events.push({ time: d.processedAt ?? d.createdAt, amount: d.amount })
  }
  for (const b of bonuses) {
    events.push({ time: b.createdAt, amount: b.amount })
  }
  events.sort((a, b) => a.time.getTime() - b.time.getTime())
  return events
}

/**
 * Withdraw clawback base = profit withdrawn, not gross withdraw.
 * Per deposit→withdraw cycle: max(0, sum(withdrawals) − sum(deposits+bonuses in that cycle).
 * Example: deposit 105,150 → withdraw 205,000 → base 99,850 (10% claw = 9,985).
 * Re-deposit then loss does not re-claw prior withdraws.
 */
async function withdrawClawProfitBase(
  tx: Tx,
  userId: string,
  day: Bounds,
): Promise<bigint> {
  const withdrawals = await tx.withdrawal.findMany({
    where: {
      userId,
      status: 'PAID',
      processedAt: { gte: day.start, lt: day.end },
    },
    orderBy: { processedAt: 'asc' },
    select: { amount: true, processedAt: true },
  })
  if (withdrawals.length === 0) return 0n

  const priorWd = await tx.withdrawal.findFirst({
    where: { userId, status: 'PAID', processedAt: { lt: day.start } },
    orderBy: { processedAt: 'desc' },
    select: { processedAt: true },
  })
  const epoch = new Date(0)
  const cycleStart = priorWd?.processedAt ?? epoch

  let cycleFunding = await commissionFundingBetween(tx, userId, cycleStart, day.start)
  let cycleWithdraw = 0n
  let clawTotal = 0n
  let cursor = cycleStart

  const dayFundingEvents = await fundingEventsBetween(tx, userId, day.start, day.end)

  const closeCycle = () => {
    if (cycleWithdraw <= 0n) return
    const profit = cycleWithdraw > cycleFunding ? cycleWithdraw - cycleFunding : 0n
    clawTotal += profit
    cycleWithdraw = 0n
    cycleFunding = 0n
  }

  for (const wd of withdrawals) {
    const wdTime = wd.processedAt!
    for (const event of dayFundingEvents) {
      if (event.time > cursor && event.time <= wdTime) {
        closeCycle()
        cycleFunding += event.amount
      }
    }
    cycleWithdraw += wd.amount
    cursor = wdTime
  }

  for (const event of dayFundingEvents) {
    if (event.time > cursor) {
      closeCycle()
      cycleFunding += event.amount
    }
  }
  closeCycle()

  return clawTotal
}

/** Commission credit when member's principal loss increases (bets only — wins do not claw back). */
function lossCommissionDesired(lossDelta: bigint, rateBps: number): bigint {
  if (lossDelta <= 0n) return 0n
  return applyBps(lossDelta, rateBps)
}

/** Commission debit when member withdraws winnings (30% of clawback base). */
function withdrawClawDesired(clawbackBase: bigint, rateBps: number): bigint {
  if (clawbackBase <= 0n) return 0n
  return -applyBps(clawbackBase, rateBps)
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

/** Net COMMISSION ledger posted for one agent + member on a settlement day. */
async function commissionLedgerNet(
  tx: Tx,
  agentId: string,
  referenceType: 'daily-principal-loss' | 'daily-withdraw-claw',
  referenceId: string,
): Promise<bigint> {
  const entries = await tx.ledgerEntry.findMany({
    where: {
      account: { ownerId: agentId, bucket: 'COMMISSION', currency: 'PKR' },
      transaction: {
        type: 'COMMISSION',
        referenceType,
        referenceId,
        status: 'POSTED',
      },
    },
    select: { direction: true, amount: true },
  })
  return entries.reduce(
    (sum, entry) => sum + (entry.direction === 'CREDIT' ? entry.amount : -entry.amount),
    0n,
  )
}

async function applyCommissionTarget(
  tx: Tx,
  recipient: Recipient,
  sourceUserId: string,
  day: Bounds,
  referenceType: 'daily-principal-loss' | 'daily-withdraw-claw',
  referenceId: string,
  desired: bigint,
  meta: Record<string, unknown>,
): Promise<bigint> {
  const ledgerNet = await commissionLedgerNet(tx, recipient.agentId, referenceType, referenceId)
  const requestedAdjustment = desired - ledgerNet
  let appliedAdjustment = 0n

  if (requestedAdjustment > 0n) {
    const posted = await post(tx, {
      type: 'COMMISSION',
      referenceType,
      referenceId,
      idempotencyKey: `commission-daily:${referenceType}:${referenceId}:${recipient.agentId}:${recipient.level}:from:${ledgerNet}:to:${desired}`,
      meta: { settlementDate: day.key, sourceUserId, level: recipient.level, ...meta },
      legs: [
        { account: { system: 'HOUSE' }, direction: 'DEBIT', amount: requestedAdjustment },
        { account: { userId: recipient.agentId, bucket: 'COMMISSION' }, direction: 'CREDIT', amount: requestedAdjustment },
      ],
    })
    if (posted.created) appliedAdjustment = requestedAdjustment
  } else if (requestedAdjustment < 0n) {
    const available = await commissionBalance(tx, recipient.agentId)
    const requestedDebit = -requestedAdjustment
    const debit = requestedDebit < available ? requestedDebit : available
    if (debit > 0n) {
      const posted = await post(tx, {
        type: 'COMMISSION',
        referenceType,
        referenceId,
        idempotencyKey: `commission-daily:${referenceType}:${referenceId}:${recipient.agentId}:${recipient.level}:from:${ledgerNet}:to:${desired}`,
        meta: { settlementDate: day.key, sourceUserId, level: recipient.level, adjustment: 'debit', ...meta },
        legs: [
          { account: { system: 'HOUSE' }, direction: 'CREDIT', amount: debit },
          { account: { userId: recipient.agentId, bucket: 'COMMISSION' }, direction: 'DEBIT', amount: debit },
        ],
      })
      if (posted.created) appliedAdjustment = -debit
    }
  }

  return ledgerNet + appliedAdjustment
}

/** One-shot reversal for orphaned consolidated loss refs (idempotency-safe). */
async function clearCommissionRef(
  tx: Tx,
  recipient: Recipient,
  sourceUserId: string,
  day: Bounds,
  referenceType: 'daily-principal-loss' | 'daily-withdraw-claw',
  referenceId: string,
): Promise<void> {
  const ledgerNet = await commissionLedgerNet(tx, recipient.agentId, referenceType, referenceId)
  if (ledgerNet <= 0n) return
  const posted = await post(tx, {
    type: 'COMMISSION',
    referenceType,
    referenceId,
    idempotencyKey: `commission-clear:v2:${referenceType}:${referenceId}:${recipient.agentId}:${recipient.level}`,
    meta: { settlementDate: day.key, sourceUserId, level: recipient.level, cleared: true },
    legs: [
      { account: { system: 'HOUSE' }, direction: 'CREDIT', amount: ledgerNet },
      { account: { userId: recipient.agentId, bucket: 'COMMISSION' }, direction: 'DEBIT', amount: ledgerNet },
    ],
  })
  if (!posted.created) return
}

type LossCommissionPart = { referenceSuffix: string; base: bigint }

async function depositFundingAmount(tx: Tx, userId: string, depositId: string, depositAmount: bigint): Promise<bigint> {
  const bonus = await tx.ledgerEntry.aggregate({
    where: {
      account: { ownerId: userId, bucket: 'MAIN' },
      direction: 'CREDIT',
      transaction: {
        type: 'DEPOSIT_BONUS',
        referenceType: 'deposit',
        referenceId: depositId,
        status: 'POSTED',
      },
    },
    _sum: { amount: true },
  })
  return depositAmount + (bonus._sum.amount ?? 0n)
}

async function depositsBetween(
  tx: Tx,
  userId: string,
  from: Date,
  before: Date,
): Promise<Array<{ id: string; amount: bigint; time: Date }>> {
  const rows = await tx.deposit.findMany({
    where: {
      userId,
      status: 'APPROVED',
      OR: [
        { processedAt: { gt: from, lt: before } },
        { processedAt: null, createdAt: { gt: from, lt: before } },
      ],
    },
    select: { id: true, amount: true, processedAt: true, createdAt: true },
    orderBy: [{ processedAt: 'asc' }, { createdAt: 'asc' }],
  })
  return rows.map((row) => ({
    id: row.id,
    amount: row.amount,
    time: row.processedAt ?? row.createdAt,
  }))
}

async function principalLossAt(
  tx: Tx,
  accountId: string,
  userId: string,
  at: Date,
): Promise<bigint> {
  const [funding, wagered, won] = await Promise.all([
    commissionFundingBefore(tx, userId, at),
    sumGameEntries(tx, accountId, 'GAME_BET', at),
    sumGameEntries(tx, accountId, 'GAME_WIN', at),
  ])
  return principalLossTarget(funding, wagered, won)
}

/**
 * Loss commission parts:
 * - Before first withdraw: principal-loss delta only.
 * - After each withdraw: 10% on each new deposit (full deposit+bonus) if member lost after depositing.
 */
async function lossCommissionParts(
  tx: Tx,
  userId: string,
  accountId: string,
  day: Bounds,
): Promise<LossCommissionPart[]> {
  const withdrawals = await tx.withdrawal.findMany({
    where: {
      userId,
      status: 'PAID',
      processedAt: { gte: day.start, lt: day.end },
    },
    orderBy: { processedAt: 'asc' },
    select: { processedAt: true },
  })

  const dayFundingEvents = await fundingEventsBetween(tx, userId, day.start, day.end)
  const parts: LossCommissionPart[] = []

  if (withdrawals.length === 0) {
    const lossStart = await principalLossAt(tx, accountId, userId, day.start)
    const lossEnd = await principalLossAt(tx, accountId, userId, day.end)
    const delta = lossEnd > lossStart ? lossEnd - lossStart : 0n
    if (delta > 0n) parts.push({ referenceSuffix: '', base: delta })
    return parts
  }

  // Withdrawals same day: claw on withdraw profit only; loss commission on post-withdraw deposits.
  for (let w = 0; w < withdrawals.length; w++) {
    const wdTime = withdrawals[w].processedAt!
    const segmentEnd = withdrawals[w + 1]?.processedAt ?? day.end
    const depositsInSegment = await depositsBetween(tx, userId, wdTime, segmentEnd)
    if (depositsInSegment.length === 0) continue

    const wagerAtFirstDep = await sumGameEntries(tx, accountId, 'GAME_BET', depositsInSegment[0].time)
    const wagerAtSegmentEnd = await sumGameEntries(tx, accountId, 'GAME_BET', segmentEnd)
    if (wagerAtSegmentEnd <= wagerAtFirstDep) continue

    for (let i = 0; i < depositsInSegment.length; i++) {
      const dep = depositsInSegment[i]
      const funding = await depositFundingAmount(tx, userId, dep.id, dep.amount)
      parts.push({
        referenceSuffix: `:postwd:${w}:${dep.id}`,
        base: funding,
      })
    }
  }

  return parts
}

async function settlePlayer(
  accountId: string,
  sourceUserId: string,
  day: Bounds,
  settings: Settings,
  options?: { forceRerun?: boolean },
) {
  const todayKey = dateKeyAt(Date.now())
  const allowRerun = day.key === todayKey || options?.forceRerun === true

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
    const withdrawnInDay = await sumPaidWithdrawals(tx, sourceUserId, day.start, day.end)
    const clawbackBase = await withdrawClawProfitBase(tx, sourceUserId, day)
    const depositQualified = await playerQualifiesForCommission(tx, sourceUserId, settings)
    const lossParts = depositQualified
      ? await lossCommissionParts(tx, sourceUserId, accountId, day)
      : []
    const effectiveClawbackBase = depositQualified ? clawbackBase : 0n
    const withdrawRefId = `${day.key}:${sourceUserId}`
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
      const withdrawDesired = withdrawClawDesired(effectiveClawbackBase, recipient.rateBps)
      const legacyLossRef = `${day.key}:${sourceUserId}`
      const activeLossRefIds = new Set<string>()

      // Always zero legacy consolidated daily loss before per-deposit rows.
      await clearCommissionRef(
        tx,
        recipient,
        sourceUserId,
        day,
        'daily-principal-loss',
        legacyLossRef,
      )

      for (const part of lossParts) {
        const refId = `${day.key}:${sourceUserId}${part.referenceSuffix}`
        activeLossRefIds.add(refId)
        const desired = lossCommissionDesired(part.base, recipient.rateBps)
        await applyCommissionTarget(
          tx,
          recipient,
          sourceUserId,
          day,
          'daily-principal-loss',
          refId,
          desired,
          { lossBase: part.base.toString(), part: part.referenceSuffix },
        )
      }

      // Clear legacy consolidated loss row and stale per-deposit parts.
      const staleLossRefs = await tx.ledgerTransaction.findMany({
        where: {
          type: 'COMMISSION',
          referenceType: 'daily-principal-loss',
          referenceId: { startsWith: `${day.key}:${sourceUserId}` },
        },
        select: { referenceId: true },
        distinct: ['referenceId'],
      })
      for (const row of staleLossRefs) {
        if (!row.referenceId || activeLossRefIds.has(row.referenceId)) continue
        await applyCommissionTarget(
          tx,
          recipient,
          sourceUserId,
          day,
          'daily-principal-loss',
          row.referenceId,
          0n,
          { cleared: true },
        )
      }

      const withdrawFinal = await applyCommissionTarget(
        tx,
        recipient,
        sourceUserId,
        day,
        'daily-withdraw-claw',
        withdrawRefId,
        withdrawDesired,
        {
          clawbackBase: clawbackBase.toString(),
          withdrawnInDay: withdrawnInDay.toString(),
          clawbackProfit: clawbackBase.toString(),
        },
      )

      const lossAccruedRows: bigint[] = []
      for (const part of lossParts) {
        const refId = `${day.key}:${sourceUserId}${part.referenceSuffix}`
        const net = await commissionLedgerNet(tx, recipient.agentId, 'daily-principal-loss', refId)
        if (net > 0n) lossAccruedRows.push(net)
      }
      const lossFinal = lossAccruedRows.reduce((sum, n) => sum + n, 0n)
      const finalAmount = lossFinal + withdrawFinal
      await tx.commission.deleteMany({
        where: {
          agentId: recipient.agentId,
          sourceUserId,
          level: recipient.level,
          createdAt: { gte: day.start, lt: day.end },
        },
      })
      for (const amount of lossAccruedRows) {
        await tx.commission.create({
          data: {
            agentId: recipient.agentId,
            sourceUserId,
            level: recipient.level,
            rateBps: recipient.rateBps,
            amount,
            status: 'ACCRUED',
            createdAt: day.displayAt,
          },
        })
      }
      if (withdrawFinal < 0n) {
        await tx.commission.create({
          data: {
            agentId: recipient.agentId,
            sourceUserId,
            level: recipient.level,
            rateBps: recipient.rateBps,
            amount: withdrawFinal,
            status: 'PAID',
            createdAt: day.displayAt,
          },
        })
      } else if (lossFinal < 0n && finalAmount !== 0n) {
        await tx.commission.create({
          data: {
            agentId: recipient.agentId,
            sourceUserId,
            level: recipient.level,
            rateBps: recipient.rateBps,
            amount: finalAmount,
            status: 'PAID',
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

/** Reconcile ledger + commission rows for past days (fixes idempotency drift). */
export async function repairCommissionSettlements(fromKey: string, toKey: string) {
  const settings = await getSettings()
  if (!settings.commissionEnabled || settings.commissionBasis !== 'GGR') return

  let key = fromKey
  while (key <= toKey) {
    const day = boundsFor(key)
    const players = await collectSettlementPlayers(day)
    let settled = 0
    for (const [ownerId, accountId] of players) {
      await settlePlayer(accountId, ownerId, day, settings, { forceRerun: true })
      settled++
    }
    logger.info({ settlementDate: key, players: settled }, 'Commission settlement repaired')
    key = shiftDate(key, 1)
  }
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

  const [betRows, wdRows, commissioned] = await Promise.all([
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
