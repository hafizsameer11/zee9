import type { PaymentMethod, BonusType } from '@prisma/client'
import { prisma } from '../../lib/prisma.js'
import { runMoneyTx } from '../../core/tx.js'
import { post } from '../../core/ledger.js'
import { getSettings } from '../../core/settings.js'
import { toPaisa, applyPct, toRupees } from '../../lib/money.js'
import { badRequest, conflict, notFound, unprocessable } from '../../core/errors.js'
import { accrueForDeposit, updateAgentship } from '../commission/commission.service.js'
import { notify } from '../../core/notify.js'
import { releaseIfNoWager } from '../../core/wager.js'

function methodEnabled(s: Awaited<ReturnType<typeof getSettings>>, method: PaymentMethod) {
  if (method === 'JAZZCASH') return s.methodJazzcash
  if (method === 'EASYPAISA') return s.methodEasypaisa
  if (method === 'WEGARS') return s.methodWegars
  return s.methodBank
}

function orderNo(prefix: string) {
  return prefix + Date.now() + Math.floor(Math.random() * 1000)
}

export async function create(userId: string, input: {
  amount: number
  method: PaymentMethod
  channelId?: string
  agentAccountId?: string
  senderAccount?: string
  trxId?: string
  receiptUrl?: string
}) {
  const s = await getSettings()
  if (!methodEnabled(s, input.method)) throw unprocessable('Payment method is disabled')
  const amount = toPaisa(input.amount)
  if (amount < toPaisa(s.minDeposit) || amount > toPaisa(s.maxDeposit)) {
    throw unprocessable(`Deposit must be between ${s.minDeposit} and ${s.maxDeposit}`)
  }

  // Prefer agent collection account (C2C). channelId from player UI is often an agentAccount id.
  const accountId = input.agentAccountId || input.channelId
  let agentAccount = accountId
    ? await prisma.agentAccount.findFirst({
        where: { id: accountId, enabled: true, awaitingReview: false },
        include: { user: { select: { id: true, role: true, agentActive: true } } },
      })
    : null

  // Legacy platform PaymentChannel fallback
  let channelId: string | undefined
  if (!agentAccount && input.channelId) {
    const ch = await prisma.paymentChannel.findFirst({ where: { id: input.channelId, enabled: true } })
    if (!ch) throw badRequest('Invalid payment account')
    channelId = ch.id
  }

  if (agentAccount && (agentAccount.user.role !== 'AGENT' || !agentAccount.user.agentActive)) {
    throw unprocessable('This collection account is not available right now')
  }

  return runMoneyTx(async (tx) => {
    const dep = await tx.deposit.create({
      data: {
        userId,
        amount,
        method: input.method,
        channelId: channelId ?? null,
        agentAccountId: agentAccount?.id ?? null,
        agentId: agentAccount?.userId ?? null,
        senderAccount: input.senderAccount,
        trxId: input.trxId,
        receiptUrl: input.receiptUrl,
        status: 'PENDING',
      },
    })

    // Route to the agent's C2C queue (not admin) when an agent account was used
    if (agentAccount) {
      await tx.collectionOrder.create({
        data: {
          orderNo: orderNo('DEP'),
          type: 'DEPOSIT',
          amount: dep.amount,
          reward: applyPct(dep.amount, s.payoutReward),
          playerId: userId,
          agentId: agentAccount.userId,
          walletAccount: input.senderAccount ?? null,
          collectionAccount: agentAccount.number,
          method: input.method,
          status: 'PENDING',
          depositId: dep.id,
          trxId: input.trxId ?? null,
        },
      })
    }

    return dep
  })
}

export function listMine(userId: string) {
  return prisma.deposit.findMany({ where: { userId }, orderBy: { createdAt: 'desc' }, take: 100 })
}

export async function bonusEstimate(userId: string, amountRupees: number) {
  const s = await getSettings()
  const amount = toPaisa(amountRupees)
  const priorApproved = await prisma.deposit.count({ where: { userId, status: 'APPROVED' } })
  let bonusPct = 0
  let label = 'No bonus'
  if (priorApproved < 3) {
    bonusPct = [s.depositBonus1, s.depositBonus2, s.depositBonus3][priorApproved]!
    label = `${priorApproved + 1}${priorApproved === 0 ? 'st' : priorApproved === 1 ? 'nd' : 'rd'} deposit bonus`
  } else {
    const since = new Date(); since.setHours(0, 0, 0, 0)
    const dailyToday = await prisma.bonus.count({ where: { userId, type: 'DAILY_DEPOSIT', createdAt: { gte: since } } })
    if (dailyToday === 0) { bonusPct = s.dailyDepositBonus; label = 'Daily deposit bonus' }
  }
  const bonusAmount = applyPct(amount, bonusPct)
  return { pct: bonusPct, bonusAmount: Number(bonusAmount) / 100, label, depositNumber: priorApproved + 1 }
}

export function adminList(status?: string) {
  return prisma.deposit.findMany({
    where: status ? { status: status as any } : {},
    orderBy: { createdAt: 'desc' },
    take: 200,
    include: {
      user: { select: { displayName: true, phone: true } },
      channel: { select: { method: true, accountNumber: true } },
      agentAccount: { select: { number: true, holder: true, method: true, user: { select: { displayName: true, phone: true } } } },
    },
  })
}

const DEPOSIT_BONUS_TYPE: BonusType[] = ['DEPOSIT_1', 'DEPOSIT_2', 'DEPOSIT_3']

/** Credit player wallet + bonuses. Used by admin approve OR agent C2C confirm. */
export async function creditDeposit(tx: any, depositId: string, processedById: string) {
  const dep = await tx.deposit.findUnique({ where: { id: depositId }, include: { user: true } })
  if (!dep) throw notFound('Deposit not found')
  if (dep.status !== 'PENDING') throw conflict('Deposit already processed')

  const s = await getSettings()

  await tx.deposit.update({
    where: { id: depositId },
    data: { status: 'APPROVED', processedById, processedAt: new Date() },
  })

  await post(tx, {
    type: 'DEPOSIT',
    referenceType: 'deposit',
    referenceId: dep.id,
    idempotencyKey: `deposit:${dep.id}`,
    legs: [
      { account: { system: 'GATEWAY_CLEARING' }, direction: 'DEBIT', amount: dep.amount },
      { account: { userId: dep.userId, bucket: 'MAIN' }, direction: 'CREDIT', amount: dep.amount },
    ],
  })

  const priorApproved = await tx.deposit.count({ where: { userId: dep.userId, status: 'APPROVED', id: { not: dep.id } } })
  let bonusPct = 0
  let bonusType: BonusType | null = null
  if (priorApproved < 3) {
    bonusPct = [s.depositBonus1, s.depositBonus2, s.depositBonus3][priorApproved]!
    bonusType = DEPOSIT_BONUS_TYPE[priorApproved]!
  } else {
    const since = new Date(); since.setHours(0, 0, 0, 0)
    const dailyToday = await tx.bonus.count({ where: { userId: dep.userId, type: 'DAILY_DEPOSIT', createdAt: { gte: since } } })
    if (dailyToday === 0) { bonusPct = s.dailyDepositBonus; bonusType = 'DAILY_DEPOSIT' }
  }
  // Agent float top-ups credit MAIN only — no player deposit bonuses / referral accrual
  const isAgentFloat = dep.user.role === 'AGENT' || dep.user.role === 'ADMIN'
  if (!isAgentFloat && bonusType && bonusPct > 0) {
    const bonusAmt = applyPct(dep.amount, bonusPct)
    if (bonusAmt > 0n) {
      await post(tx, {
        type: 'DEPOSIT_BONUS',
        referenceType: 'deposit',
        referenceId: dep.id,
        idempotencyKey: `deposit-bonus:${dep.id}`,
        legs: [
          { account: { system: 'BONUS_POOL' }, direction: 'DEBIT', amount: bonusAmt },
          { account: { userId: dep.userId, bucket: 'BONUS' }, direction: 'CREDIT', amount: bonusAmt },
        ],
      })
      const bonus = await tx.bonus.create({
        data: { userId: dep.userId, type: bonusType, amount: bonusAmt, wagerRequired: applyPct(bonusAmt, s.bonusWager * 100), status: 'ACTIVE' },
      })
      await releaseIfNoWager(tx, bonus.id)
    }
  }

  if (!isAgentFloat) {
    await accrueForDeposit(tx, { ...dep, status: 'APPROVED' }, s)
    if (dep.user.referredById) await updateAgentship(tx, dep.user.referredById, s)
  }

  await notify(
    tx,
    dep.userId,
    'deposit',
    isAgentFloat ? 'Float top-up approved' : 'Deposit approved',
    isAgentFloat
      ? `Rs ${toRupees(dep.amount).toLocaleString('en-PK')} was added to your agent float.`
      : `Your deposit of Rs ${toRupees(dep.amount).toLocaleString('en-PK')} has been approved and added to your wallet.`,
  )

  return dep
}

export async function approve(depositId: string, adminId: string) {
  return runMoneyTx(async (tx) => {
    await creditDeposit(tx, depositId, adminId)
    // If a C2C order exists, mark it success without double-paying agent (admin override path)
    const order = await tx.collectionOrder.findFirst({ where: { depositId, type: 'DEPOSIT' } })
    if (order && order.status !== 'SUCCESS' && order.status !== 'FAIL') {
      await tx.collectionOrder.update({
        where: { id: order.id },
        data: { status: 'SUCCESS', resolvedAt: new Date() },
      })
    }
    return tx.deposit.findUniqueOrThrow({ where: { id: depositId } })
  })
}

export async function reject(depositId: string, adminId: string, reason: string) {
  return runMoneyTx(async (tx) => {
    const dep = await tx.deposit.findUnique({ where: { id: depositId } })
    if (!dep) throw notFound('Deposit not found')
    if (dep.status !== 'PENDING') throw conflict('Deposit already processed')
    const updated = await tx.deposit.update({
      where: { id: depositId },
      data: { status: 'REJECTED', rejectReason: reason, processedById: adminId, processedAt: new Date() },
    })
    const order = await tx.collectionOrder.findFirst({ where: { depositId, type: 'DEPOSIT' } })
    if (order && order.status !== 'SUCCESS' && order.status !== 'FAIL') {
      await tx.collectionOrder.update({ where: { id: order.id }, data: { status: 'FAIL', resolvedAt: new Date() } })
    }
    await notify(tx, dep.userId, 'deposit', 'Deposit rejected', `Your deposit was rejected. Reason: ${reason}`)
    return updated
  })
}

/**
 * Agent confirms a C2C deposit collection:
 * - credits the player (full deposit + bonuses)
 * - credits agent only the configured % (payoutReward, default 2%) into COMMISSION
 * Full deposit amount is NEVER added to the agent balance.
 */
export async function agentConfirmDeposit(orderId: string, agentId: string, trxId?: string) {
  return runMoneyTx(async (tx) => {
    const order = await tx.collectionOrder.findFirst({ where: { id: orderId, agentId, type: 'DEPOSIT' } })
    if (!order) throw notFound('Order not found')
    if (order.status === 'SUCCESS' || order.status === 'FAIL') throw conflict('Order already resolved')
    if (!order.depositId) throw badRequest('Order is not linked to a deposit')

    await creditDeposit(tx, order.depositId, agentId)

    await tx.collectionOrder.update({
      where: { id: order.id },
      data: { status: 'SUCCESS', trxId: trxId ?? order.trxId, resolvedAt: new Date() },
    })

    // Only 2% (payoutReward) to agent COMMISSION — not the deposit principal
    if (order.reward > 0n) {
      await post(tx, {
        type: 'COMMISSION',
        referenceType: 'collectionOrder',
        referenceId: order.id,
        idempotencyKey: `col-reward:${order.id}`,
        legs: [
          { account: { system: 'HOUSE' }, direction: 'DEBIT', amount: order.reward },
          { account: { userId: agentId, bucket: 'COMMISSION' }, direction: 'CREDIT', amount: order.reward },
        ],
      })
    }

    return tx.collectionOrder.findUniqueOrThrow({ where: { id: order.id } })
  })
}

export async function agentRejectDeposit(orderId: string, agentId: string, reason = 'Not received') {
  return runMoneyTx(async (tx) => {
    const order = await tx.collectionOrder.findFirst({ where: { id: orderId, agentId, type: 'DEPOSIT' } })
    if (!order) throw notFound('Order not found')
    if (order.status === 'SUCCESS' || order.status === 'FAIL') throw conflict('Order already resolved')

    await tx.collectionOrder.update({
      where: { id: order.id },
      data: { status: 'FAIL', resolvedAt: new Date() },
    })

    if (order.depositId) {
      const dep = await tx.deposit.findUnique({ where: { id: order.depositId } })
      if (dep && dep.status === 'PENDING') {
        await tx.deposit.update({
          where: { id: dep.id },
          data: { status: 'REJECTED', rejectReason: reason, processedById: agentId, processedAt: new Date() },
        })
        await notify(tx, dep.userId, 'deposit', 'Deposit rejected', `Your deposit was rejected by the agent. Reason: ${reason}`)
      }
    }

    return tx.collectionOrder.findUniqueOrThrow({ where: { id: order.id } })
  })
}
