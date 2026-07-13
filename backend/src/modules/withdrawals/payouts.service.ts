import { prisma } from '../../lib/prisma.js'
import { runMoneyTx } from '../../core/tx.js'
import { post } from '../../core/ledger.js'
import { getSettings } from '../../core/settings.js'
import { applyPct } from '../../lib/money.js'
import { badRequest, conflict, notFound } from '../../core/errors.js'

function orderNo() {
  return 'PB' + Date.now() + Math.floor(Math.random() * 1000)
}

/** Admin assigns a pending withdrawal to an agent to pay on behalf of the platform. */
export async function assign(withdrawalId: string, agentId: string) {
  const [wd, agent, settings] = await Promise.all([
    prisma.withdrawal.findUnique({ where: { id: withdrawalId } }),
    prisma.user.findUnique({ where: { id: agentId }, select: { id: true, role: true, phone: true } }),
    getSettings(),
  ])
  if (!wd) throw notFound('Withdrawal not found')
  if (wd.status !== 'PENDING') throw conflict('Withdrawal is not pending')
  if (!agent || agent.role !== 'AGENT') throw badRequest('Target is not an agent')

  const existing = await prisma.collectionOrder.findFirst({
    where: { withdrawalId, status: { in: ['PENDING', 'CHECKING', 'PROCESSING', 'SUCCESS'] } },
  })
  if (existing) throw conflict('Withdrawal already assigned')

  const payee = (wd.accountDetails as any) || {}
  const player = await prisma.user.findUnique({ where: { id: wd.userId }, select: { phone: true } })

  return prisma.collectionOrder.create({
    data: {
      orderNo: orderNo(),
      type: 'WITHDRAW',
      amount: wd.amount,
      reward: applyPct(wd.amount, settings.payoutReward),
      playerId: wd.userId,
      agentId,
      method: wd.method,
      status: 'PENDING',
      withdrawalId,
      walletAccount: player?.phone ?? null,
      collectionAccount: payee.number ?? null,
      payeeName: payee.title ?? null,
      payeeBank: payee.bank ?? null,
    },
  })
}

/** Payout orders assigned to an agent that still need handling. */
export function listForAgent(agentId: string) {
  return prisma.collectionOrder.findMany({
    where: { agentId, type: 'WITHDRAW', status: { in: ['PENDING', 'PROCESSING'] } },
    orderBy: { createdAt: 'asc' },
  })
}

/**
 * Agent confirms they paid the player. Settles atomically:
 * player FROZEN + house reward -> agent MAIN; withdrawal PAID; order SUCCESS.
 */
export async function submitPay(orderId: string, agentId: string, trxId: string, senderAccount: string) {
  return runMoneyTx(async (tx) => {
    const order = await tx.collectionOrder.findUnique({ where: { id: orderId } })
    if (!order || order.agentId !== agentId || order.type !== 'WITHDRAW') throw notFound('Payout order not found')
    if (order.status === 'SUCCESS' || order.status === 'FAIL') throw conflict('Order already resolved')
    if (!order.withdrawalId) throw badRequest('Order is not linked to a withdrawal')

    const wd = await tx.withdrawal.findUnique({ where: { id: order.withdrawalId } })
    if (!wd) throw notFound('Withdrawal not found')
    if (wd.status !== 'PENDING') throw conflict('Withdrawal already processed')

    await tx.collectionOrder.update({
      where: { id: orderId },
      data: { status: 'SUCCESS', trxId, senderAccount, resolvedAt: new Date() },
    })
    await tx.withdrawal.update({
      where: { id: wd.id },
      data: { status: 'PAID', trxId, agentId, processedAt: new Date() },
    })

    // Balanced: debit player FROZEN (amount) + debit HOUSE (reward) -> credit agent MAIN (amount + reward)
    await post(tx, {
      type: 'WITHDRAWAL_PAID',
      referenceType: 'payout',
      referenceId: order.id,
      idempotencyKey: `payout:${order.id}`,
      legs: [
        { account: { userId: wd.userId, bucket: 'FROZEN' }, direction: 'DEBIT', amount: order.amount },
        { account: { system: 'HOUSE' }, direction: 'DEBIT', amount: order.reward },
        { account: { userId: agentId, bucket: 'MAIN' }, direction: 'CREDIT', amount: order.amount + order.reward },
      ],
    })

    return tx.collectionOrder.findUniqueOrThrow({ where: { id: orderId } })
  })
}
