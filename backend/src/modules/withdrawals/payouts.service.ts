import { prisma } from '../../lib/prisma.js'
import { runMoneyTx } from '../../core/tx.js'
import { post } from '../../core/ledger.js'
import { getBalances } from '../../core/ledger.js'
import { getSettings } from '../../core/settings.js'
import { applyPct, toRupees } from '../../lib/money.js'
import { badRequest, conflict, notFound, unprocessable } from '../../core/errors.js'
import { notify } from '../../core/notify.js'

function orderNo() {
  return 'PB' + Date.now() + Math.floor(Math.random() * 1000)
}

/** Open withdrawal pool — any active agent can claim (first click wins). */
export function listAvailable() {
  return prisma.withdrawal.findMany({
    where: { status: 'PENDING', agentId: null },
    orderBy: { createdAt: 'asc' },
    take: 50,
    include: { user: { select: { displayName: true, phone: true } } },
  }).then(async (rows) => {
    if (rows.length === 0) return []
    const claimed = await prisma.collectionOrder.findMany({
      where: {
        type: 'WITHDRAW',
        withdrawalId: { in: rows.map((r) => r.id) },
        status: { in: ['PENDING', 'CHECKING', 'PROCESSING', 'SUCCESS'] },
      },
      select: { withdrawalId: true },
    })
    const taken = new Set(claimed.map((c) => c.withdrawalId).filter(Boolean) as string[])
    return rows.filter((r) => !taken.has(r.id))
  })
}

/** First agent to claim locks the withdrawal. */
export async function claim(withdrawalId: string, agentId: string) {
  const [wd, agent, settings] = await Promise.all([
    prisma.withdrawal.findUnique({ where: { id: withdrawalId } }),
    prisma.user.findUnique({ where: { id: agentId }, select: { id: true, role: true, agentActive: true } }),
    getSettings(),
  ])
  if (!wd) throw notFound('Withdrawal not found')
  if (wd.status !== 'PENDING') throw conflict('Withdrawal is not pending')
  if (!agent || agent.role !== 'AGENT' || !agent.agentActive) throw badRequest('Not an active agent')

  const existing = await prisma.collectionOrder.findFirst({
    where: { withdrawalId, status: { in: ['PENDING', 'CHECKING', 'PROCESSING', 'SUCCESS'] } },
  })
  if (existing) throw conflict('Already claimed by another agent')

  const bal = await getBalances(prisma as any, agentId).catch(() => null)
  // getBalances expects Tx - use prisma directly via wallet service
  const { balances } = await import('../wallet/wallet.service.js')
  const agentBal = await balances(agentId)
  if ((agentBal.MAIN ?? 0n) < wd.amount) {
    throw unprocessable(`Insufficient agent float. Need Rs ${toRupees(wd.amount).toLocaleString('en-PK')}`)
  }

  const payee = (wd.accountDetails as any) || {}
  const player = await prisma.user.findUnique({ where: { id: wd.userId }, select: { phone: true, displayName: true } })

  // Atomic claim: set agentId if still unclaimed + create order
  return runMoneyTx(async (tx) => {
    const again = await tx.collectionOrder.findFirst({
      where: { withdrawalId, status: { in: ['PENDING', 'CHECKING', 'PROCESSING', 'SUCCESS'] } },
    })
    if (again) throw conflict('Already claimed by another agent')

    const order = await tx.collectionOrder.create({
      data: {
        orderNo: orderNo(),
        type: 'WITHDRAW',
        amount: wd.amount,
        reward: applyPct(wd.amount, settings.payoutReward),
        playerId: wd.userId,
        agentId,
        method: wd.method,
        status: 'PROCESSING',
        withdrawalId,
        walletAccount: player?.phone ?? null,
        collectionAccount: payee.number ?? null,
        payeeName: payee.title ?? player?.displayName ?? null,
        payeeBank: payee.bank ?? null,
      },
    })
    await tx.withdrawal.update({ where: { id: withdrawalId }, data: { agentId } })
    return order
  })
}

/** Admin assigns a pending withdrawal to a specific agent (optional override). */
export async function assign(withdrawalId: string, agentId: string) {
  return claim(withdrawalId, agentId)
}

/** Payout orders this agent has claimed / was assigned. */
export function listForAgent(agentId: string) {
  return prisma.collectionOrder.findMany({
    where: { agentId, type: 'WITHDRAW', status: { in: ['PENDING', 'PROCESSING', 'CHECKING'] } },
    orderBy: { createdAt: 'asc' },
  })
}

/**
 * Agent confirms they paid the player from their float:
 * - cut withdrawal amount from agent MAIN (float)
 * - clear player FROZEN
 * - credit agent COMMISSION with 2% reward only
 * - notify player
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

    const bal = await getBalances(tx, agentId)
    if ((bal.MAIN ?? 0n) < order.amount) throw unprocessable('Insufficient agent float to pay this withdrawal')

    await tx.collectionOrder.update({
      where: { id: orderId },
      data: { status: 'SUCCESS', trxId, senderAccount, resolvedAt: new Date() },
    })
    await tx.withdrawal.update({
      where: { id: wd.id },
      data: { status: 'PAID', trxId, agentId, processedAt: new Date() },
    })

    // 1) Cut float from agent + settle player FROZEN into HOUSE
    await post(tx, {
      type: 'WITHDRAWAL_PAID',
      referenceType: 'payout',
      referenceId: order.id,
      idempotencyKey: `payout:${order.id}`,
      assertNonNegative: [{ userId: agentId, bucket: 'MAIN' }, { userId: wd.userId, bucket: 'FROZEN' }],
      legs: [
        { account: { userId: agentId, bucket: 'MAIN' }, direction: 'DEBIT', amount: order.amount },
        { account: { userId: wd.userId, bucket: 'FROZEN' }, direction: 'DEBIT', amount: order.amount },
        { account: { system: 'HOUSE' }, direction: 'CREDIT', amount: order.amount },
        { account: { system: 'HOUSE' }, direction: 'CREDIT', amount: order.amount },
      ],
    })

    // 2) Agent earns only the reward % into COMMISSION (not the payout principal)
    if (order.reward > 0n) {
      await post(tx, {
        type: 'COMMISSION',
        referenceType: 'payout',
        referenceId: order.id,
        idempotencyKey: `payout-reward:${order.id}`,
        legs: [
          { account: { system: 'HOUSE' }, direction: 'DEBIT', amount: order.reward },
          { account: { userId: agentId, bucket: 'COMMISSION' }, direction: 'CREDIT', amount: order.reward },
        ],
      })
    }

    await notify(
      tx,
      wd.userId,
      'withdrawal',
      'Withdrawal paid',
      `Your withdrawal of Rs ${toRupees(order.amount).toLocaleString('en-PK')} has been paid. TRX: ${trxId}`,
    )

    return tx.collectionOrder.findUniqueOrThrow({ where: { id: orderId } })
  })
}
