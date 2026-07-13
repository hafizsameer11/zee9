import type { PaymentMethod } from '@prisma/client'
import { prisma } from '../../lib/prisma.js'
import { runMoneyTx } from '../../core/tx.js'
import { post } from '../../core/ledger.js'
import { getSettings } from '../../core/settings.js'
import { toPaisa, applyPct } from '../../lib/money.js'
import { badRequest, conflict, notFound, unprocessable } from '../../core/errors.js'
import { accrueForDeposit, updateAgentship } from '../commission/commission.service.js'
import { notify } from '../../core/notify.js'
import { toRupees } from '../../lib/money.js'
import type { BonusType } from '@prisma/client'
import { releaseIfNoWager } from '../../core/wager.js'

function methodEnabled(s: Awaited<ReturnType<typeof getSettings>>, method: PaymentMethod) {
  if (method === 'JAZZCASH') return s.methodJazzcash
  if (method === 'EASYPAISA') return s.methodEasypaisa
  if (method === 'WEGARS') return s.methodWegars
  return s.methodBank
}

export async function create(userId: string, input: {
  amount: number
  method: PaymentMethod
  channelId?: string
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
  if (input.channelId) {
    const ch = await prisma.paymentChannel.findFirst({ where: { id: input.channelId, enabled: true } })
    if (!ch) throw badRequest('Invalid payment channel')
  }

  return prisma.deposit.create({
    data: {
      userId,
      amount,
      method: input.method,
      channelId: input.channelId,
      senderAccount: input.senderAccount,
      trxId: input.trxId,
      receiptUrl: input.receiptUrl,
      status: 'PENDING',
    },
  })
}

export function listMine(userId: string) {
  return prisma.deposit.findMany({ where: { userId }, orderBy: { createdAt: 'desc' }, take: 100 })
}

/** Preview deposit bonus % for the next approved deposit. */
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
    include: { user: { select: { displayName: true, phone: true } }, channel: { select: { method: true, accountNumber: true } } },
  })
}

const DEPOSIT_BONUS_TYPE: BonusType[] = ['DEPOSIT_1', 'DEPOSIT_2', 'DEPOSIT_3']

export async function approve(depositId: string, adminId: string) {
  return runMoneyTx(async (tx) => {
    const dep = await tx.deposit.findUnique({ where: { id: depositId }, include: { user: true, channel: true } })
    if (!dep) throw notFound('Deposit not found')
    if (dep.status !== 'PENDING') throw conflict('Deposit already processed')

    const s = await getSettings()

    await tx.deposit.update({
      where: { id: depositId },
      data: { status: 'APPROVED', processedById: adminId, processedAt: new Date() },
    })

    // 1) Credit principal to MAIN
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

    // 2) Deposit bonus (nth deposit → 1st/2nd/3rd/daily), credited to BONUS
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
    if (bonusType && bonusPct > 0) {
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

    // 3) Referral commission (admin-configured basis)
    await accrueForDeposit(tx, { ...dep, status: 'APPROVED' }, s)

    // 4) Update the direct referrer's agentship progress
    if (dep.user.referredById) await updateAgentship(tx, dep.user.referredById, s)

    // 5) Notify the player
    await notify(tx, dep.userId, 'deposit', 'Deposit approved', `Your deposit of Rs ${toRupees(dep.amount).toLocaleString('en-PK')} has been approved and added to your wallet.`)

    // 6) Create agent collection order when deposit channel matches an agent account
    if (dep.channel) {
      const agentAcc = await tx.agentAccount.findFirst({
        where: { number: dep.channel.accountNumber, enabled: true, awaitingReview: false },
      })
      if (agentAcc) {
        const existing = await tx.collectionOrder.findFirst({ where: { playerId: dep.userId, type: 'DEPOSIT', status: { in: ['PENDING', 'CHECKING', 'PROCESSING'] } } })
        if (!existing) {
          await tx.collectionOrder.create({
            data: {
              orderNo: 'DEP' + Date.now(),
              type: 'DEPOSIT',
              amount: dep.amount,
              reward: applyPct(dep.amount, s.payoutReward),
              playerId: dep.userId,
              agentId: agentAcc.userId,
              walletAccount: dep.senderAccount,
              collectionAccount: dep.channel.accountNumber,
              method: dep.method,
              status: 'PENDING',
            },
          })
        }
      }
    }

    return tx.deposit.findUniqueOrThrow({ where: { id: depositId } })
  })
}

export async function reject(depositId: string, adminId: string, reason: string) {
  const dep = await prisma.deposit.findUnique({ where: { id: depositId } })
  if (!dep) throw notFound('Deposit not found')
  if (dep.status !== 'PENDING') throw conflict('Deposit already processed')
  const updated = await prisma.deposit.update({
    where: { id: depositId },
    data: { status: 'REJECTED', rejectReason: reason, processedById: adminId, processedAt: new Date() },
  })
  await notify(prisma, dep.userId, 'deposit', 'Deposit rejected', `Your deposit was rejected. Reason: ${reason}`)
  return updated
}
