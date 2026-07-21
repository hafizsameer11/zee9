import type { PaymentMethod } from '@prisma/client'
import type { Tx } from '../../lib/prisma.js'
import { prisma } from '../../lib/prisma.js'
import { runMoneyTx } from '../../core/tx.js'
import { post, getBalances } from '../../core/ledger.js'
import { getSettings } from '../../core/settings.js'
import { toPaisa, toRupees } from '../../lib/money.js'
import { conflict, notFound, unprocessable } from '../../core/errors.js'

import { notify } from '../../core/notify.js'
import { depositWagerMet } from '../../core/wager.js'

function methodEnabled(s: Awaited<ReturnType<typeof getSettings>>, method: PaymentMethod) {
  if (method === 'JAZZCASH') return s.methodJazzcash
  if (method === 'EASYPAISA') return s.methodEasypaisa
  if (method === 'WEGARS') return s.methodWegars
  return s.methodBank
}

async function hasApprovedDeposit(tx: Tx | typeof prisma, userId: string) {
  return (await tx.deposit.count({ where: { userId, status: 'APPROVED' } })) > 0
}

/** Player-facing eligibility (why withdraw may be blocked). */
export async function eligibility(userId: string) {
  const s = await getSettings()
  const { balances } = await import('../wallet/wallet.service.js')
  const bal = await balances(userId)
  const main = bal.MAIN ?? 0n
  const hasDeposit = await hasApprovedDeposit(prisma, userId)
  const [depSum, betSum] = await Promise.all([
    prisma.deposit.aggregate({ where: { userId, status: 'APPROVED' }, _sum: { amount: true } }),
    prisma.gameRound.aggregate({ where: { userId }, _sum: { bet: true } }),
  ])
  const deposited = depSum._sum.amount ?? 0n
  const wagered = betSum._sum.bet ?? 0n
  const required =
    s.depositWager <= 0 || deposited <= 0n
      ? 0n
      : (deposited * BigInt(Math.round(s.depositWager * 100))) / 100n
  const remaining = required > wagered ? required - wagered : 0n
  const wagerOk = remaining <= 0n
  const minP = toPaisa(s.minWithdraw)
  const maxP = toPaisa(s.maxWithdraw)

  let reason: string | null = null
  let canWithdraw = true
  if (!hasDeposit) {
    canWithdraw = false
    reason = 'Complete your first deposit before withdrawing'
  } else if (!wagerOk) {
    canWithdraw = false
    reason = `Wager Rs ${toRupees(remaining).toLocaleString('en-PK')} more (${s.depositWager}× deposits required)`
  } else if (main < minP) {
    canWithdraw = false
    reason = `Need at least Rs ${s.minWithdraw} in MAIN balance`
  }

  const eligibleCap = main < maxP ? main : maxP
  const eligibleAmount = canWithdraw && eligibleCap >= minP ? eligibleCap : 0n

  return {
    canWithdraw: canWithdraw && eligibleAmount >= minP,
    eligibleAmount,
    balance: main,
    minWithdraw: s.minWithdraw,
    maxWithdraw: s.maxWithdraw,
    depositWager: s.depositWager,
    hasDeposit,
    deposited,
    wagered,
    wagerRequired: required,
    wagerRemaining: remaining,
    wagerOk,
    reason,
  }
}

export async function create(userId: string, input: {
  amount: number
  method: PaymentMethod
  accountDetails: { number: string; title: string; bank?: string }
}) {
  const s = await getSettings()
  if (!methodEnabled(s, input.method)) throw unprocessable('Payment method is disabled')
  const amount = toPaisa(input.amount)
  if (amount < toPaisa(s.minWithdraw) || amount > toPaisa(s.maxWithdraw)) {
    throw unprocessable(`Withdrawal must be between ${s.minWithdraw} and ${s.maxWithdraw}`)
  }

  return runMoneyTx(async (tx) => {
    const bal = await getBalances(tx, userId)
    if (bal.MAIN! < amount) throw unprocessable('Insufficient withdrawable balance')

    if (!(await hasApprovedDeposit(tx, userId))) {
      throw unprocessable('Complete your first deposit before withdrawing')
    }

    const wagerOk = await depositWagerMet(tx, userId)
    if (!wagerOk) {
      const [depSum, betSum] = await Promise.all([
        tx.deposit.aggregate({ where: { userId, status: 'APPROVED' }, _sum: { amount: true } }),
        tx.gameRound.aggregate({ where: { userId }, _sum: { bet: true } }),
      ])
      const deposited = depSum._sum.amount ?? 0n
      const wagered = betSum._sum.bet ?? 0n
      const required = (deposited * BigInt(Math.round(s.depositWager * 100))) / 100n
      const left = required > wagered ? required - wagered : 0n
      throw unprocessable(
        `You must wager ${s.depositWager}x deposits before withdrawing. Still need Rs ${toRupees(left).toLocaleString('en-PK')} more play.`,
      )
    }

    const wd = await tx.withdrawal.create({
      data: {
        userId,
        amount,
        method: input.method,
        accountDetails: input.accountDetails,
        status: 'PENDING',
        wagerOk,
      },
    })

    await post(tx, {
      type: 'WITHDRAWAL_FREEZE',
      referenceType: 'withdrawal',
      referenceId: wd.id,
      idempotencyKey: `wd-freeze:${wd.id}`,
      assertNonNegative: [{ userId, bucket: 'MAIN' }],
      legs: [
        { account: { userId, bucket: 'MAIN' }, direction: 'DEBIT', amount },
        { account: { userId, bucket: 'FROZEN' }, direction: 'CREDIT', amount },
      ],
    })
    await notify(tx, userId, 'withdrawal', 'Withdrawal submitted', `Your withdrawal of Rs ${(Number(amount) / 100).toLocaleString('en-PK')} is pending review.`)
    return wd
  })
}

export function listMine(userId: string) {
  return prisma.withdrawal.findMany({ where: { userId }, orderBy: { createdAt: 'desc' }, take: 100 })
}

export function adminList(status?: string) {
  return prisma.withdrawal.findMany({
    where: status ? { status: status as any } : {},
    orderBy: { createdAt: 'desc' },
    take: 200,
    include: { user: { select: { displayName: true, phone: true } } },
  })
}

async function closeOpenPayoutOrders(tx: Tx, withdrawalId: string, status: 'SUCCESS' | 'FAIL') {
  await tx.collectionOrder.updateMany({
    where: {
      withdrawalId,
      type: 'WITHDRAW',
      status: { in: ['PENDING', 'CHECKING', 'PROCESSING'] },
    },
    data: { status, resolvedAt: new Date() },
  })
}

/** Admin confirms the manual payout was sent. */
export async function markPaid(id: string, adminId: string, trxId: string, payoutProofUrl?: string) {
  return runMoneyTx(async (tx) => {
    const wd = await tx.withdrawal.findUnique({ where: { id } })
    if (!wd) throw notFound('Withdrawal not found')
    if (wd.status !== 'PENDING') throw conflict('Withdrawal already processed')

    await tx.withdrawal.update({
      where: { id },
      data: { status: 'PAID', trxId, payoutProofUrl, processedById: adminId, processedAt: new Date() },
    })
    await closeOpenPayoutOrders(tx, id, 'SUCCESS')
    await notify(tx, wd.userId, 'withdrawal', 'Withdrawal paid', `Your withdrawal of Rs ${(Number(wd.amount) / 100).toLocaleString('en-PK')} has been sent.`)
    await post(tx, {
      type: 'WITHDRAWAL_PAID',
      referenceType: 'withdrawal',
      referenceId: wd.id,
      idempotencyKey: `wd-paid:${wd.id}`,
      legs: [
        { account: { userId: wd.userId, bucket: 'FROZEN' }, direction: 'DEBIT', amount: wd.amount },
        { account: { system: 'GATEWAY_CLEARING' }, direction: 'CREDIT', amount: wd.amount },
      ],
    })
    return tx.withdrawal.findUniqueOrThrow({ where: { id } })
  })
}

export async function reject(id: string, adminId: string, reason: string) {
  return runMoneyTx(async (tx) => {
    const wd = await tx.withdrawal.findUnique({ where: { id } })
    if (!wd) throw notFound('Withdrawal not found')
    if (wd.status !== 'PENDING') throw conflict('Withdrawal already processed')

    await tx.withdrawal.update({
      where: { id },
      data: { status: 'REJECTED', rejectReason: reason, processedById: adminId, processedAt: new Date() },
    })
    await closeOpenPayoutOrders(tx, id, 'FAIL')
    await notify(tx, wd.userId, 'withdrawal', 'Withdrawal rejected', reason || 'Your withdrawal was rejected and funds returned.')
    await post(tx, {
      type: 'WITHDRAWAL_UNFREEZE',
      referenceType: 'withdrawal',
      referenceId: wd.id,
      idempotencyKey: `wd-unfreeze:${wd.id}`,
      legs: [
        { account: { userId: wd.userId, bucket: 'FROZEN' }, direction: 'DEBIT', amount: wd.amount },
        { account: { userId: wd.userId, bucket: 'MAIN' }, direction: 'CREDIT', amount: wd.amount },
      ],
    })
    return tx.withdrawal.findUniqueOrThrow({ where: { id } })
  })
}
