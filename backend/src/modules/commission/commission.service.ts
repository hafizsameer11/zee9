import type { Deposit } from '@prisma/client'
import type { Tx } from '../../lib/prisma.js'
import { post } from '../../core/ledger.js'
import {
  getSettings,
  commissionRateBps,
  mentorCommissionRateBps,
  type Settings,
} from '../../core/settings.js'
import { applyBps, toPaisa } from '../../lib/money.js'

type LossInput = { userId: string; lossAmount: bigint; referenceType: string; referenceId: string }
const DAILY_PRINCIPAL_SETTLEMENT = true

/**
 * Accrue referral + mentor commission on player LOSS (GGR basis).
 * Referral Agents: ancestors with referralAgentActive.
 * Mentors: channel owner with MENTOR role, using mentor rates, for channel members.
 */
export async function accrueForLoss(tx: Tx, input: LossInput, settings?: Settings) {
  // Commissions are consolidated by the PKT end-of-day settlement.
  if (DAILY_PRINCIPAL_SETTLEMENT) return
  const s = settings ?? (await getSettings())
  if (!s.commissionEnabled) return
  if (input.lossAmount <= 0n) return

  const qualMin = toPaisa(s.minDepositToQualify)
  const depSum = await tx.deposit.aggregate({
    where: { userId: input.userId, status: 'APPROVED' },
    _sum: { amount: true },
  })
  if ((depSum._sum.amount ?? 0n) < qualMin) return

  const player = await tx.user.findUnique({
    where: { id: input.userId },
    select: { channelCode: true },
  })

  const edges = await tx.referralEdge.findMany({
    where: { descendantId: input.userId, level: { lte: s.commissionLevels } },
    orderBy: { level: 'asc' },
  })

  for (const edge of edges) {
    const ancestor = await tx.user.findUnique({
      where: { id: edge.ancestorId },
      select: { id: true, referralAgentActive: true },
    })
    if (!ancestor?.referralAgentActive) continue

    const rateBps = commissionRateBps(s, edge.level)
    const amount = applyBps(input.lossAmount, rateBps)
    if (amount <= 0n) continue

    await post(tx, {
      type: 'COMMISSION',
      referenceType: input.referenceType,
      referenceId: input.referenceId,
      idempotencyKey: `commission-loss:${input.referenceId}:${ancestor.id}:${edge.level}`,
      legs: [
        { account: { system: 'HOUSE' }, direction: 'DEBIT', amount },
        { account: { userId: ancestor.id, bucket: 'COMMISSION' }, direction: 'CREDIT', amount },
      ],
    })

    await tx.commission.create({
      data: {
        agentId: ancestor.id,
        sourceUserId: input.userId,
        level: edge.level,
        rateBps,
        amount,
        status: 'ACCRUED',
      },
    })
  }

  if (player?.channelCode) {
    const channel = await tx.channel.findUnique({
      where: { code: player.channelCode },
      select: { ownerId: true, enabled: true },
    })
    if (channel?.enabled) {
      const mentor = await tx.user.findUnique({
        where: { id: channel.ownerId },
        select: { id: true, role: true },
      })
      if (mentor?.role === 'MENTOR') {
        const edgeToMentor = edges.find((e) => e.ancestorId === mentor.id)
        const level = edgeToMentor?.level ?? 1
        if (level <= s.commissionLevels) {
          const rateBps = mentorCommissionRateBps(s, level)
          const amount = applyBps(input.lossAmount, rateBps)
          if (amount > 0n) {
            await post(tx, {
              type: 'COMMISSION',
              referenceType: input.referenceType,
              referenceId: input.referenceId,
              idempotencyKey: `mentor-loss:${input.referenceId}:${mentor.id}:${level}`,
              legs: [
                { account: { system: 'HOUSE' }, direction: 'DEBIT', amount },
                { account: { userId: mentor.id, bucket: 'COMMISSION' }, direction: 'CREDIT', amount },
              ],
            })
            await tx.commission.create({
              data: {
                agentId: mentor.id,
                sourceUserId: input.userId,
                level,
                rateBps,
                amount,
                status: 'ACCRUED',
              },
            })
          }
        }
      }
    }
  }
}

async function commissionAvailable(tx: Tx, userId: string): Promise<bigint> {
  const acc = await tx.ledgerAccount.findFirst({
    where: { ownerId: userId, bucket: 'COMMISSION', currency: 'PKR' },
    select: { balance: true },
  })
  return acc?.balance ?? 0n
}

/** Claw back salary when a referred player WINS (same % as loss). Debits COMMISSION up to available. */
export async function clawbackForWin(
  tx: Tx,
  input: { userId: string; winAmount: bigint; referenceType: string; referenceId: string },
  settings?: Settings,
) {
  // Wins are netted against losses by the PKT end-of-day settlement.
  if (DAILY_PRINCIPAL_SETTLEMENT) return
  const s = settings ?? (await getSettings())
  if (!s.commissionEnabled) return
  if (input.winAmount <= 0n) return

  const qualMin = toPaisa(s.minDepositToQualify)
  const depSum = await tx.deposit.aggregate({
    where: { userId: input.userId, status: 'APPROVED' },
    _sum: { amount: true },
  })
  if ((depSum._sum.amount ?? 0n) < qualMin) return

  const player = await tx.user.findUnique({
    where: { id: input.userId },
    select: { channelCode: true },
  })

  const edges = await tx.referralEdge.findMany({
    where: { descendantId: input.userId, level: { lte: s.commissionLevels } },
    orderBy: { level: 'asc' },
  })

  async function clawFrom(userId: string, amount: bigint, level: number, keyPrefix: string) {
    if (amount <= 0n) return
    const available = await commissionAvailable(tx, userId)
    const take = amount > available ? available : amount
    if (take <= 0n) return

    await post(tx, {
      type: 'COMMISSION',
      referenceType: input.referenceType,
      referenceId: input.referenceId,
      idempotencyKey: `${keyPrefix}:${input.referenceId}:${userId}:${level}`,
      legs: [
        { account: { system: 'HOUSE' }, direction: 'CREDIT', amount: take },
        { account: { userId, bucket: 'COMMISSION' }, direction: 'DEBIT', amount: take },
      ],
    })
    await tx.commission.create({
      data: {
        agentId: userId,
        sourceUserId: input.userId,
        level,
        rateBps: 0,
        amount: -take,
        status: 'PAID',
      },
    })
  }

  for (const edge of edges) {
    const ancestor = await tx.user.findUnique({
      where: { id: edge.ancestorId },
      select: { id: true, referralAgentActive: true },
    })
    if (!ancestor?.referralAgentActive) continue
    const rateBps = commissionRateBps(s, edge.level)
    await clawFrom(ancestor.id, applyBps(input.winAmount, rateBps), edge.level, 'commission-win')
  }

  if (player?.channelCode) {
    const channel = await tx.channel.findUnique({
      where: { code: player.channelCode },
      select: { ownerId: true, enabled: true },
    })
    if (channel?.enabled) {
      const mentor = await tx.user.findUnique({
        where: { id: channel.ownerId },
        select: { id: true, role: true },
      })
      if (mentor?.role === 'MENTOR') {
        const edgeToMentor = edges.find((e) => e.ancestorId === mentor.id)
        const level = edgeToMentor?.level ?? 1
        if (level <= s.commissionLevels) {
          const rateBps = mentorCommissionRateBps(s, level)
          await clawFrom(mentor.id, applyBps(input.winAmount, rateBps), level, 'mentor-win')
        }
      }
    }
  }
}

/** Legacy deposit commission — inactive when commissionBasis is GGR. */
export async function accrueForDeposit(tx: Tx, deposit: Deposit, settings?: Settings) {
  const s = settings ?? (await getSettings())
  if (!s.commissionEnabled || s.commissionBasis === 'GGR') return

  if (deposit.amount < toPaisa(s.minDepositToQualify)) return
  if (s.commissionBasis === 'FIRST_DEPOSIT') {
    const priorApproved = await tx.deposit.count({
      where: { userId: deposit.userId, status: 'APPROVED', id: { not: deposit.id } },
    })
    if (priorApproved > 0) return
  }

  const base = s.commissionBase === 'GGR' ? 0n : deposit.amount
  if (base <= 0n) return

  const edges = await tx.referralEdge.findMany({
    where: { descendantId: deposit.userId, level: { lte: s.commissionLevels } },
    orderBy: { level: 'asc' },
  })

  for (const edge of edges) {
    const agent = await tx.user.findUnique({
      where: { id: edge.ancestorId },
      select: { id: true, referralAgentActive: true },
    })
    if (!agent?.referralAgentActive) continue

    const rateBps = commissionRateBps(s, edge.level)
    const amount = applyBps(base, rateBps)
    if (amount <= 0n) continue

    await post(tx, {
      type: 'COMMISSION',
      referenceType: 'deposit',
      referenceId: deposit.id,
      idempotencyKey: `commission:${deposit.id}:${agent.id}:${edge.level}`,
      legs: [
        { account: { system: 'HOUSE' }, direction: 'DEBIT', amount },
        { account: { userId: agent.id, bucket: 'COMMISSION' }, direction: 'CREDIT', amount },
      ],
    })

    await tx.commission.create({
      data: {
        agentId: agent.id,
        sourceUserId: deposit.userId,
        depositId: deposit.id,
        level: edge.level,
        rateBps,
        amount,
        status: 'ACCRUED',
      },
    })
  }
}

/** Recompute referral-agent eligibility wallets. Admin sets referralAgentActive. */
export async function updateAgentship(tx: Tx, referrerId: string, s?: Settings) {
  const settings = s ?? (await getSettings())
  const referrer = await tx.user.findUnique({ where: { id: referrerId }, select: { id: true } })
  if (!referrer) return

  const directRefs = await tx.referralEdge.findMany({
    where: { ancestorId: referrerId, level: 1 },
    select: { descendantId: true },
  })
  const minPer = toPaisa(settings.minPerWallet)

  let filled = 0
  for (const r of directRefs) {
    const agg = await tx.deposit.aggregate({
      where: { userId: r.descendantId, status: 'APPROVED' },
      _sum: { amount: true },
    })
    if ((agg._sum.amount ?? 0n) >= minPer) filled++
  }

  await tx.user.update({
    where: { id: referrerId },
    data: {
      walletsFilled: filled,
      ...(filled >= settings.walletsRequired ? { referralAgentActive: true } : {}),
    },
  })
}
