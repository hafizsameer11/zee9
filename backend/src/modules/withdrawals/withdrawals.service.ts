import type { PaymentMethod } from '@prisma/client'
import type { Tx } from '../../lib/prisma.js'
import { prisma } from '../../lib/prisma.js'
import { runMoneyTx } from '../../core/tx.js'
import { post, getBalances } from '../../core/ledger.js'
import { getSettings } from '../../core/settings.js'
import { toPaisa } from '../../lib/money.js'
import { conflict, notFound, unprocessable } from '../../core/errors.js'

import { notify } from '../../core/notify.js'
import { depositWagerMet } from '../../core/wager.js'

function methodEnabled(s: Awaited<ReturnType<typeof getSettings>>, method: PaymentMethod) {
  if (method === 'JAZZCASH') return s.methodJazzcash
  if (method === 'EASYPAISA') return s.methodEasypaisa
  if (method === 'WEGARS') return s.methodWegars
  return s.methodBank
}

async function hasApprovedDeposit(tx: Tx, userId: string) {
  return (await tx.deposit.count({ where: { userId, status: 'APPROVED' } })) > 0
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
    // Withdrawals draw only from MAIN (released funds). Bonus funds stay in BONUS
    // until wagering is met, so bucket separation enforces the wager rule.
    const bal = await getBalances(tx, userId)
    if (bal.MAIN! < amount) throw unprocessable('Insufficient withdrawable balance')

    if (!(await hasApprovedDeposit(tx, userId))) {
      throw unprocessable('Complete your first deposit before withdrawing')
    }

    const wagerOk = await depositWagerMet(tx, userId)
    if (!wagerOk) {
      throw unprocessable(`You must wager ${s.depositWager}x your total deposits before withdrawing`)
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

    // Freeze: MAIN -> FROZEN
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

/** Admin/agent confirms the manual payout was sent. */
export async function markPaid(id: string, adminId: string, trxId: string, payoutProofUrl?: string) {
  return runMoneyTx(async (tx) => {
    const wd = await tx.withdrawal.findUnique({ where: { id } })
    if (!wd) throw notFound('Withdrawal not found')
    if (wd.status !== 'PENDING') throw conflict('Withdrawal already processed')

    await tx.withdrawal.update({
      where: { id },
      data: { status: 'PAID', trxId, payoutProofUrl, processedById: adminId, processedAt: new Date() },
    })
    await notify(tx, wd.userId, 'withdrawal', 'Withdrawal paid', `Your withdrawal of Rs ${(Number(wd.amount) / 100).toLocaleString('en-PK')} has been sent.`)
    // FROZEN -> out (GATEWAY_CLEARING)
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
    await notify(tx, wd.userId, 'withdrawal', 'Withdrawal rejected', reason || 'Your withdrawal was rejected and funds returned.')
    // Unfreeze: FROZEN -> MAIN
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
