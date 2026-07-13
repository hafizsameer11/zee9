import type { Deposit } from '@prisma/client'
import type { Tx } from '../../lib/prisma.js'
import { post } from '../../core/ledger.js'
import { getSettings, commissionRateBps, type Settings } from '../../core/settings.js'
import { applyBps, toPaisa } from '../../lib/money.js'

/**
 * Accrue referral commission on player LOSS (GGR basis).
 * Only active agents earn; referred player must have qualified with min deposit.
 */
export async function accrueForLoss(
  tx: Tx,
  input: { userId: string; lossAmount: bigint; referenceType: string; referenceId: string },
  settings?: Settings,
) {
  const s = settings ?? (await getSettings())
  if (!s.commissionEnabled) return
  if (input.lossAmount <= 0n) return

  const qualMin = toPaisa(s.minDepositToQualify)
  const depSum = await tx.deposit.aggregate({
    where: { userId: input.userId, status: 'APPROVED' },
    _sum: { amount: true },
  })
  if ((depSum._sum.amount ?? 0n) < qualMin) return

  const edges = await tx.referralEdge.findMany({
    where: { descendantId: input.userId, level: { lte: s.commissionLevels } },
    orderBy: { level: 'asc' },
  })

  for (const edge of edges) {
    const agent = await tx.user.findUnique({
      where: { id: edge.ancestorId },
      select: { id: true, role: true, agentActive: true },
    })
    if (!agent || agent.role !== 'AGENT' || !agent.agentActive) continue

    const rateBps = commissionRateBps(s, edge.level)
    const amount = applyBps(input.lossAmount, rateBps)
    if (amount <= 0n) continue

    await post(tx, {
      type: 'COMMISSION',
      referenceType: input.referenceType,
      referenceId: input.referenceId,
      idempotencyKey: `commission-loss:${input.referenceId}:${agent.id}:${edge.level}`,
      legs: [
        { account: { system: 'HOUSE' }, direction: 'DEBIT', amount },
        { account: { userId: agent.id, bucket: 'COMMISSION' }, direction: 'CREDIT', amount },
      ],
    })

    await tx.commission.create({
      data: {
        agentId: agent.id,
        sourceUserId: input.userId,
        level: edge.level,
        rateBps,
        amount,
        status: 'ACCRUED',
      },
    })
  }
}

/** Legacy deposit commission — inactive when commissionBasis is GGR (Zee9 default). */
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
      select: { id: true, role: true, agentActive: true },
    })
    if (!agent || agent.role !== 'AGENT' || !agent.agentActive) continue

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

/**
 * Recompute a referrer's agentship: count direct referees whose total approved
 * deposits reached the per-wallet minimum; activate when the wallet count is met.
 */
export async function updateAgentship(tx: Tx, referrerId: string, s?: Settings) {
  const settings = s ?? (await getSettings())
  const referrer = await tx.user.findUnique({ where: { id: referrerId }, select: { id: true, role: true } })
  if (!referrer || referrer.role !== 'AGENT') return

  const directRefs = await tx.referralEdge.findMany({ where: { ancestorId: referrerId, level: 1 }, select: { descendantId: true } })
  const minPer = toPaisa(settings.minPerWallet)

  let filled = 0
  for (const r of directRefs) {
    const agg = await tx.deposit.aggregate({
      where: { userId: r.descendantId, status: 'APPROVED' },
      _sum: { amount: true },
    })
    if ((agg._sum.amount ?? 0n) >= minPer) filled++
  }

  const reachedThreshold = filled >= settings.walletsRequired
  await tx.user.update({
    where: { id: referrerId },
    data: { walletsFilled: filled, ...(reachedThreshold ? { agentActive: true } : {}) },
  })
}
