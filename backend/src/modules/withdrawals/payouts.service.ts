import { prisma } from '../../lib/prisma.js'
import { runMoneyTx } from '../../core/tx.js'
import { post } from '../../core/ledger.js'
import { getSettings } from '../../core/settings.js'
import { applyPct, toRupees } from '../../lib/money.js'
import { badRequest, conflict, notFound } from '../../core/errors.js'
import { notify } from '../../core/notify.js'
import { queueWithdrawUpdate } from '../../core/walletPush.js'

function orderNo() {
  return 'PB' + Date.now() + Math.floor(Math.random() * 1000)
}

/** Open withdrawal pool for C2C merchants (auto-released on create). */
export function listAvailable() {
  return prisma.withdrawal.findMany({
    where: { status: 'PENDING', agentId: null, c2cReleased: true },
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

/** First agent to claim locks the withdrawal (must already be released to C2C). */
export async function claim(withdrawalId: string, agentId: string) {
  const [wd, agent, settings] = await Promise.all([
    prisma.withdrawal.findUnique({ where: { id: withdrawalId } }),
    prisma.user.findUnique({ where: { id: agentId }, select: { id: true, role: true, agentActive: true } }),
    getSettings(),
  ])
  if (!wd) throw notFound('Withdrawal not found')
  if (wd.status !== 'PENDING') throw conflict('Withdrawal is not pending')
  if (!wd.c2cReleased) throw conflict('Withdrawal is not available in the C2C pool')
  if (!agent || agent.role !== 'AGENT' || !agent.agentActive) throw badRequest('Not an active agent')

  const existing = await prisma.collectionOrder.findFirst({
    where: { withdrawalId, status: { in: ['PENDING', 'CHECKING', 'PROCESSING', 'SUCCESS'] } },
  })
  if (existing) throw conflict('Already claimed by another agent')

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
    await notify(
      tx,
      wd.userId,
      'withdrawal',
      'Withdrawal approved',
      `An agent has accepted your withdrawal of Rs ${toRupees(wd.amount).toLocaleString('en-PK')} and is processing payment.`,
    )
    return order
  })
}

/** Admin assigns a pending withdrawal to a specific agent (optional override). */
export async function assign(withdrawalId: string, agentId: string) {
  await prisma.withdrawal.updateMany({
    where: { id: withdrawalId, status: 'PENDING' },
    data: { c2cReleased: true },
  })
  return claim(withdrawalId, agentId)
}

/** Open claimed payouts still waiting for merchant Transfer ID (not on-hold / done). */
export function listForAgent(agentId: string) {
  return prisma.collectionOrder.findMany({
    where: { agentId, type: 'WITHDRAW', status: { in: ['PENDING', 'PROCESSING'] } },
    orderBy: { createdAt: 'asc' },
  })
}

/** History: Fail, Success, and On-hold (CHECKING after Transfer ID submitted). */
export function listHistory(agentId: string) {
  return prisma.collectionOrder.findMany({
    where: {
      agentId,
      type: 'WITHDRAW',
      OR: [
        { status: { in: ['SUCCESS', 'FAIL'] } },
        { status: 'CHECKING', trxId: { not: null } },
      ],
    },
    orderBy: { createdAt: 'desc' },
    take: 100,
    include: {
      player: { select: { displayName: true, phone: true, playerNo: true } },
    },
  })
}

/** After merchant confirms Transfer ID, payout stays On-hold this long before Success + balance credit. */
export const PAYOUT_HOLD_MS = 5 * 60 * 1000

/**
 * Agent confirms they paid the player (Transfer ID):
 * - status → CHECKING (UI: Onhold) for 5 minutes
 * - player withdrawal settled immediately (FROZEN cleared)
 * - agent MAIN credit (amount + reward) happens after hold → Success
 */
export async function submitPay(orderId: string, agentId: string, trxId: string, senderAccount = '') {
  const tid = trxId.trim()
  if (!tid) throw badRequest('Transfer ID is required')

  return runMoneyTx(async (tx) => {
    const order = await tx.collectionOrder.findUnique({ where: { id: orderId } })
    if (!order || order.agentId !== agentId || order.type !== 'WITHDRAW') throw notFound('Payout order not found')
    if (order.status === 'SUCCESS' || order.status === 'FAIL') throw conflict('Order already resolved')
    if (order.status === 'CHECKING' && order.trxId) throw conflict('Payout already submitted — waiting on hold')
    if (!order.withdrawalId) throw badRequest('Order is not linked to a withdrawal')

    const wd = await tx.withdrawal.findUnique({ where: { id: order.withdrawalId } })
    if (!wd) throw notFound('Withdrawal not found')
    if (wd.status !== 'PENDING') throw conflict('Withdrawal already processed')

    const paidAt = new Date()
    await tx.collectionOrder.update({
      where: { id: orderId },
      data: {
        status: 'CHECKING',
        trxId: tid,
        senderAccount: senderAccount.trim() || null,
        submittedAt: paidAt,
      },
    })
    await tx.withdrawal.update({
      where: { id: wd.id },
      data: { status: 'PAID', trxId: tid, agentId, processedAt: paidAt },
    })

    // Settle player FROZEN now — customer is paid. Agent float credit waits for hold.
    await post(tx, {
      type: 'WITHDRAWAL_PAID',
      referenceType: 'payout',
      referenceId: order.id,
      idempotencyKey: `payout-player:${order.id}`,
      assertNonNegative: [{ userId: wd.userId, bucket: 'FROZEN' }],
      legs: [
        { account: { userId: wd.userId, bucket: 'FROZEN' }, direction: 'DEBIT', amount: order.amount },
        { account: { system: 'HOUSE' }, direction: 'CREDIT', amount: order.amount },
      ],
    })

    await notify(
      tx,
      wd.userId,
      'withdrawal',
      'Withdrawal paid',
      `An agent has paid your withdrawal of Rs ${toRupees(order.amount).toLocaleString('en-PK')}. TRX: ${tid}`,
    )

    queueWithdrawUpdate(wd.userId, {
      id: wd.id,
      status: 'PAID',
      amount: Number(order.amount),
      trxId: tid,
    })

    return tx.collectionOrder.findUniqueOrThrow({ where: { id: orderId } })
  })
}

/**
 * After 5-minute on-hold: mark SUCCESS and credit agent MAIN with withdraw amount + reward.
 * Example: 3000 + 60 → MAIN += 3060.
 */
export async function finalizePayoutHold(orderId: string) {
  return runMoneyTx(async (tx) => {
    const order = await tx.collectionOrder.findUnique({ where: { id: orderId } })
    if (!order || order.type !== 'WITHDRAW') throw notFound('Payout order not found')
    if (order.status === 'SUCCESS') return order
    if (order.status !== 'CHECKING' || !order.trxId) throw conflict('Payout is not on hold')
    if (!order.agentId) throw badRequest('Payout has no agent')

    await tx.collectionOrder.update({
      where: { id: orderId },
      data: { status: 'SUCCESS', resolvedAt: new Date() },
    })

    const credit = order.amount + order.reward
    if (credit > 0n) {
      await post(tx, {
        type: 'COMMISSION',
        referenceType: 'payout',
        referenceId: order.id,
        idempotencyKey: `payout-settle:${order.id}`,
        meta: { kind: 'payout_hold_release', amount: order.amount.toString(), reward: order.reward.toString() },
        legs: [
          { account: { system: 'HOUSE' }, direction: 'DEBIT', amount: credit },
          { account: { userId: order.agentId, bucket: 'MAIN' }, direction: 'CREDIT', amount: credit },
        ],
      })
    }

    return tx.collectionOrder.findUniqueOrThrow({ where: { id: orderId } })
  })
}

/** Sweep on-hold payouts past 5 minutes → Success + MAIN credit. */
export async function sweepPayoutHolds() {
  const deadline = new Date(Date.now() - PAYOUT_HOLD_MS)
  const rows = await prisma.collectionOrder.findMany({
    where: {
      type: 'WITHDRAW',
      status: 'CHECKING',
      trxId: { not: null },
      OR: [
        { submittedAt: { lt: deadline } },
        { submittedAt: null, createdAt: { lt: deadline } },
      ],
    },
    take: 30,
    select: { id: true, orderNo: true },
  })
  const out: { id: string; orderNo: string; ok: boolean }[] = []
  for (const row of rows) {
    try {
      await finalizePayoutHold(row.id)
      out.push({ id: row.id, orderNo: row.orderNo, ok: true })
    } catch {
      out.push({ id: row.id, orderNo: row.orderNo, ok: false })
    }
  }
  return out
}

/** Cancel claim — merchant cannot pay (no float); release so another merchant can take it. */
export async function cancelPayout(orderId: string, agentId: string) {
  return runMoneyTx(async (tx) => {
    const order = await tx.collectionOrder.findUnique({ where: { id: orderId } })
    if (!order || order.agentId !== agentId || order.type !== 'WITHDRAW') throw notFound('Payout order not found')
    if (order.status === 'SUCCESS' || order.status === 'FAIL') throw conflict('Order already resolved')
    if (order.status === 'CHECKING' && order.trxId) throw conflict('Payout is on hold — cannot cancel')
    if (!order.withdrawalId) throw badRequest('Order is not linked to a withdrawal')

    const wd = await tx.withdrawal.findUnique({ where: { id: order.withdrawalId } })
    if (!wd) throw notFound('Withdrawal not found')
    if (wd.status !== 'PENDING') throw conflict('Withdrawal already processed')

    await tx.collectionOrder.update({
      where: { id: orderId },
      data: { status: 'FAIL', resolvedAt: new Date(), trxId: 'CANCELLED' },
    })
    // Keep withdrawal PENDING; clear agent so another merchant can claim
    await tx.withdrawal.update({
      where: { id: order.withdrawalId },
      data: { agentId: null },
    })
    return { released: true }
  })
}

/**
 * Abnormal — payee account wrong / cannot pay this customer.
 * Reject withdrawal and return FROZEN funds to customer's MAIN so they can withdraw again with a correct number.
 */
export async function reportAbnormalPayout(orderId: string, agentId: string, reason?: string) {
  const note = (reason?.trim() || 'Wrong account number — please withdraw again with the correct details').slice(0, 200)

  return runMoneyTx(async (tx) => {
    const order = await tx.collectionOrder.findUnique({ where: { id: orderId } })
    if (!order || order.agentId !== agentId || order.type !== 'WITHDRAW') throw notFound('Payout order not found')
    if (order.status === 'SUCCESS' || order.status === 'FAIL') throw conflict('Order already resolved')
    if (order.status === 'CHECKING' && order.trxId) throw conflict('Payout is on hold — cannot mark abnormal')
    if (!order.withdrawalId) throw badRequest('Order is not linked to a withdrawal')

    const wd = await tx.withdrawal.findUnique({ where: { id: order.withdrawalId } })
    if (!wd) throw notFound('Withdrawal not found')
    if (wd.status !== 'PENDING') throw conflict('Withdrawal already processed')

    await tx.collectionOrder.update({
      where: { id: orderId },
      data: { status: 'FAIL', resolvedAt: new Date(), trxId: `ABNORMAL:${note.slice(0, 160)}` },
    })
    await tx.withdrawal.update({
      where: { id: wd.id },
      data: {
        status: 'REJECTED',
        rejectReason: note,
        agentId,
        processedAt: new Date(),
      },
    })

    await post(tx, {
      type: 'WITHDRAWAL_UNFREEZE',
      referenceType: 'withdrawal',
      referenceId: wd.id,
      idempotencyKey: `wd-unfreeze:${wd.id}`,
      assertNonNegative: [{ userId: wd.userId, bucket: 'FROZEN' }],
      legs: [
        { account: { userId: wd.userId, bucket: 'FROZEN' }, direction: 'DEBIT', amount: wd.amount },
        { account: { userId: wd.userId, bucket: 'MAIN' }, direction: 'CREDIT', amount: wd.amount },
      ],
    })

    await notify(
      tx,
      wd.userId,
      'withdrawal',
      'Withdrawal returned',
      `Your withdrawal of Rs ${toRupees(wd.amount).toLocaleString('en-PK')} was returned to your game balance. Reason: ${note}. You can withdraw again with the correct account number.`,
    )

    queueWithdrawUpdate(wd.userId, {
      id: wd.id,
      status: 'REJECTED',
      amount: Number(wd.amount),
      rejectReason: note,
    })

    return { refunded: true, reason: note, amount: toRupees(wd.amount) }
  })
}
