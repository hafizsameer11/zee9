import type { PaymentMethod } from '@prisma/client'
import type { Tx } from '../../lib/prisma.js'
import { prisma } from '../../lib/prisma.js'
import { runMoneyTx } from '../../core/tx.js'
import { post, getBalances } from '../../core/ledger.js'
import { getSettings } from '../../core/settings.js'
import { toPaisa, toRupees } from '../../lib/money.js'
import { badRequest, conflict, notFound, unprocessable } from '../../core/errors.js'

import { notify } from '../../core/notify.js'
import { depositWagerMet, getEffectiveWager } from '../../core/wager.js'
import { queueWithdrawUpdate } from '../../core/walletPush.js'
import { queueCommissionSettlement } from '../commission/commission.queue.js'
import { broadcastWithdrawAvailable } from '../agents/agent.realtime.js'
import { verifyPassword } from '../../lib/hash.js'

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
  const { depositWager } = await getEffectiveWager(userId)
  const { balances } = await import('../wallet/wallet.service.js')
  const bal = await balances(userId)
  const main = bal.MAIN ?? 0n
  const hasDeposit = await hasApprovedDeposit(prisma, userId)
  const [depSum, wagered] = await Promise.all([
    prisma.deposit.aggregate({ where: { userId, status: 'APPROVED' }, _sum: { amount: true } }),
    prisma.ledgerEntry.aggregate({
      where: {
        direction: 'DEBIT',
        account: { ownerId: userId, bucket: { in: ['MAIN', 'BONUS'] } },
        transaction: { type: 'GAME_BET' },
      },
      _sum: { amount: true },
    }),
  ])
  const deposited = depSum._sum.amount ?? 0n
  const wageredAmt = wagered._sum.amount ?? 0n
  const required =
    depositWager <= 0 || deposited <= 0n
      ? 0n
      : (deposited * BigInt(Math.round(depositWager * 100))) / 100n
  const remaining = required > wageredAmt ? required - wageredAmt : 0n
  const wagerOk = remaining <= 0n
  const minP = toPaisa(s.minWithdraw)
  const maxP = toPaisa(s.maxWithdraw)

  const openPending = await prisma.withdrawal.findFirst({
    where: { userId, status: 'PENDING' },
    select: { id: true },
  })

  let reason: string | null = null
  let canWithdraw = true
  if (!hasDeposit) {
    canWithdraw = false
    reason = 'Pehle deposit complete karein, phir withdraw'
  } else if (!wagerOk) {
    canWithdraw = false
    // Amount only — never show wager % / multiplier to the player
    reason = null
  } else if (openPending) {
    canWithdraw = false
    reason = 'Pehle wala withdraw pending hai — complete hone ka wait karein'
  } else if (main < minP) {
    canWithdraw = false
    reason = `Withdraw ke liye kam az kam Rs ${s.minWithdraw} balance chahiye`
  }

  const eligibleCap = main < maxP ? main : maxP
  const eligibleAmount = canWithdraw && eligibleCap >= minP ? eligibleCap : 0n

  return {
    canWithdraw: canWithdraw && eligibleAmount >= minP,
    eligibleAmount,
    balance: main,
    minWithdraw: s.minWithdraw,
    maxWithdraw: s.maxWithdraw,
    depositWager,
    hasDeposit,
    deposited,
    wagered: wageredAmt,
    wagerRequired: required,
    wagerRemaining: remaining,
    wagerOk,
    reason,
    hasWithdrawPin: !!(await prisma.user.findUnique({ where: { id: userId }, select: { withdrawPinHash: true } }))?.withdrawPinHash,
  }
}

export async function verifyWithdrawPin(userId: string, pin: string) {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { withdrawPinHash: true },
  })
  if (!user?.withdrawPinHash) {
    throw unprocessable('Set a 6-digit withdraw PIN before withdrawing')
  }
  const ok = await verifyPassword(pin, user.withdrawPinHash)
  if (!ok) throw unprocessable('Incorrect withdraw PIN')
}

export async function create(userId: string, input: {
  amount: number
  method: PaymentMethod
  accountDetails: { number: string; title: string; bank?: string }
  pin: string
}) {
  const s = await getSettings()
  if (!methodEnabled(s, input.method)) throw unprocessable('Payment method is disabled')
  await verifyWithdrawPin(userId, input.pin)
  const amount = toPaisa(input.amount)
  if (amount < toPaisa(s.minWithdraw) || amount > toPaisa(s.maxWithdraw)) {
    throw unprocessable(`Withdrawal must be between ${s.minWithdraw} and ${s.maxWithdraw}`)
  }

  const wd = await runMoneyTx(async (tx) => {
    const open = await tx.withdrawal.findFirst({
      where: { userId, status: 'PENDING' },
      select: { id: true },
    })
    if (open) {
      throw conflict('You already have a pending withdrawal. Wait for it to finish.')
    }

    const bal = await getBalances(tx, userId)
    if (bal.MAIN! < amount) throw unprocessable('Insufficient withdrawable balance')

    if (!(await hasApprovedDeposit(tx, userId))) {
      throw unprocessable('Complete your first deposit before withdrawing')
    }

    const wagerOk = await depositWagerMet(tx, userId)
    if (!wagerOk) {
      const { depositWager } = await getEffectiveWager(userId, tx)
      const [depSum, betAgg] = await Promise.all([
        tx.deposit.aggregate({ where: { userId, status: 'APPROVED' }, _sum: { amount: true } }),
        tx.ledgerEntry.aggregate({
          where: {
            direction: 'DEBIT',
            account: { ownerId: userId, bucket: { in: ['MAIN', 'BONUS'] } },
            transaction: { type: 'GAME_BET' },
          },
          _sum: { amount: true },
        }),
      ])
      const deposited = depSum._sum.amount ?? 0n
      const wagered = betAgg._sum.amount ?? 0n
      const required = (deposited * BigInt(Math.round(depositWager * 100))) / 100n
      const left = required > wagered ? required - wagered : 0n
      throw unprocessable(
        `Pehle game mein Rs ${toRupees(left).toLocaleString('en-PK')} chips aur play karein, phir withdraw karein.`,
      )
    }

    const autoC2c = s.withdrawAutoC2cRelease === true
    const created = await tx.withdrawal.create({
      data: {
        userId,
        amount,
        method: input.method,
        accountDetails: input.accountDetails,
        status: 'PENDING',
        c2cReleased: autoC2c,
        wagerOk,
      },
    })

    await post(tx, {
      type: 'WITHDRAWAL_FREEZE',
      referenceType: 'withdrawal',
      referenceId: created.id,
      idempotencyKey: `wd-freeze:${created.id}`,
      assertNonNegative: [{ userId, bucket: 'MAIN' }],
      legs: [
        { account: { userId, bucket: 'MAIN' }, direction: 'DEBIT', amount },
        { account: { userId, bucket: 'FROZEN' }, direction: 'CREDIT', amount },
      ],
    })
    await notify(tx, userId, 'withdrawal', 'Withdrawal submitted', `Your withdrawal of Rs ${(Number(amount) / 100).toLocaleString('en-PK')} is being processed by our payment partners.`)
    queueWithdrawUpdate(userId, {
      id: created.id,
      status: 'PENDING',
      amount: Number(amount),
    })
    return created
  })

  if (wd.c2cReleased) {
    try {
      await notifyMerchantsWithdrawReleased([wd.id])
    } catch {
      /* non-fatal */
    }
  }

  return wd
}

export function listMine(userId: string) {
  return prisma.withdrawal.findMany({ where: { userId }, orderBy: { createdAt: 'desc' }, take: 500 })
}

export async function adminList(status?: string) {
  const rows = await prisma.withdrawal.findMany({
    where: status ? { status: status as any } : {},
    orderBy: { createdAt: 'desc' },
    take: 200,
    include: { user: { select: { displayName: true, phone: true, playerNo: true } } },
  })
  const ids = rows.map((r) => r.id)
  const orders = ids.length
    ? await prisma.collectionOrder.findMany({
        where: { withdrawalId: { in: ids }, type: 'WITHDRAW' },
        select: {
          withdrawalId: true,
          orderNo: true,
          agent: { select: { panelId: true, displayName: true } },
        },
        orderBy: { createdAt: 'desc' },
      })
    : []
  const byWd = new Map<string, (typeof orders)[number]>()
  for (const o of orders) {
    if (o.withdrawalId && !byWd.has(o.withdrawalId)) byWd.set(o.withdrawalId, o)
  }
  return rows.map((r) => ({
    ...r,
    collectionOrder: byWd.get(r.id)
      ? {
          orderNo: byWd.get(r.id)!.orderNo,
          agent: byWd.get(r.id)!.agent,
        }
      : null,
  }))
}

/** Counts for admin withdraw dashboard. */
export async function adminHoldStats() {
  const [pendingHold, pendingC2c, approved, rejected] = await Promise.all([
    prisma.withdrawal.count({ where: { status: 'PENDING', c2cReleased: false } }),
    prisma.withdrawal.count({ where: { status: 'PENDING', c2cReleased: true } }),
    prisma.withdrawal.count({ where: { status: 'PAID' } }),
    prisma.withdrawal.count({ where: { status: 'REJECTED' } }),
  ])
  return {
    pendingHold,
    pendingC2c,
    pendingTotal: pendingHold + pendingC2c,
    approved,
    rejected,
  }
}

/**
 * Release oldest held pending withdrawals into the C2C Pay On Behalf pool.
 * Admin keeps the rest to pay manually.
 */
async function notifyMerchantsWithdrawReleased(ids: string[]) {
  if (ids.length === 0) return
  const released = await prisma.withdrawal.findMany({
    where: { id: { in: ids }, c2cReleased: true },
    include: { user: { select: { displayName: true } } },
  })
  for (const wd of released) {
    try {
      const amountRs = toRupees(wd.amount)
      const methodLabel =
        wd.method === 'JAZZCASH' ? 'JazzCash' : wd.method === 'EASYPAISA' ? 'Easypaisa' : wd.method
      broadcastWithdrawAvailable({
        withdrawalId: wd.id,
        amount: amountRs,
        method: methodLabel,
        playerName: wd.user.displayName,
        title: 'New withdraw request',
        body: `${wd.user.displayName} — Rs ${amountRs.toLocaleString('en-PK')} ${methodLabel}. Claim in Pay On Behalf.`,
      })
    } catch {
      /* non-fatal */
    }
  }
}

export async function releaseToC2c(input: { count?: number; ids?: string[] }) {
  if (input.ids?.length) {
    const ids = input.ids
    const rows = await prisma.withdrawal.findMany({
      where: { id: { in: ids }, status: 'PENDING', c2cReleased: false },
      select: { id: true },
    })
    if (rows.length === 0) return { released: 0, requested: ids.length }
    const releaseIds = rows.map((r) => r.id)
    const result = await prisma.withdrawal.updateMany({
      where: { id: { in: releaseIds }, status: 'PENDING', c2cReleased: false },
      data: { c2cReleased: true },
    })
    if (result.count > 0) await notifyMerchantsWithdrawReleased(releaseIds)
    return { released: result.count, requested: ids.length }
  }

  const count = Math.max(0, Math.floor(Number(input.count) || 0))
  if (count <= 0) throw badRequest('Enter how many withdrawals to send to C2C')

  const rows = await prisma.withdrawal.findMany({
    where: { status: 'PENDING', c2cReleased: false },
    orderBy: { createdAt: 'asc' },
    take: count,
    select: { id: true },
  })
  if (rows.length === 0) return { released: 0, requested: count }

  const releaseIds = rows.map((r) => r.id)
  const result = await prisma.withdrawal.updateMany({
    where: { id: { in: releaseIds }, status: 'PENDING', c2cReleased: false },
    data: { c2cReleased: true },
  })

  if (result.count > 0) {
    await notifyMerchantsWithdrawReleased(releaseIds)
  }

  return { released: result.count, requested: count }
}

/** Re-alert C2C merchants for unclaimed pool withdrawals (no status change). */
export async function notifyC2cPool(input: { count?: number; ids?: string[] }) {
  let ids: string[] = []
  if (input.ids?.length) {
    const rows = await prisma.withdrawal.findMany({
      where: { id: { in: input.ids }, status: 'PENDING', c2cReleased: true, agentId: null },
      select: { id: true },
    })
    ids = rows.map((r) => r.id)
  } else {
    const count = Math.max(0, Math.floor(Number(input.count) || 0))
    if (count <= 0) throw badRequest('Enter how many pool withdrawals to notify')
    const rows = await prisma.withdrawal.findMany({
      where: { status: 'PENDING', c2cReleased: true, agentId: null },
      orderBy: { createdAt: 'asc' },
      take: count,
      select: { id: true },
    })
    ids = rows.map((r) => r.id)
  }
  if (ids.length === 0) return { notified: 0 }
  await notifyMerchantsWithdrawReleased(ids)
  return { notified: ids.length }
}

/** Pull unclaimed C2C-pool withdrawals back to admin hold. */
export async function recallFromC2c(input: { count?: number; ids?: string[] }) {
  if (input.ids?.length) {
    const result = await prisma.withdrawal.updateMany({
      where: { id: { in: input.ids }, status: 'PENDING', c2cReleased: true, agentId: null },
      data: { c2cReleased: false },
    })
    return { recalled: result.count }
  }

  const count = Math.max(0, Math.floor(Number(input.count) || 0))
  if (count <= 0) throw badRequest('Enter how many to recall from C2C')

  const rows = await prisma.withdrawal.findMany({
    where: { status: 'PENDING', c2cReleased: true, agentId: null },
    orderBy: { createdAt: 'desc' },
    take: count,
    select: { id: true },
  })
  if (rows.length === 0) return { recalled: 0 }

  const result = await prisma.withdrawal.updateMany({
    where: { id: { in: rows.map((r) => r.id) }, status: 'PENDING', c2cReleased: true, agentId: null },
    data: { c2cReleased: false },
  })
  return { recalled: result.count, requested: count }
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
  const wd = await runMoneyTx(async (tx) => {
    const row = await tx.withdrawal.findUnique({ where: { id } })
    if (!row) throw notFound('Withdrawal not found')
    if (row.status !== 'PENDING') throw conflict('Withdrawal already processed')

    await tx.withdrawal.update({
      where: { id },
      data: { status: 'PAID', trxId, payoutProofUrl, processedById: adminId, processedAt: new Date() },
    })
    await closeOpenPayoutOrders(tx, id, 'SUCCESS')
    await notify(tx, row.userId, 'withdrawal', 'Withdrawal paid', `Your withdrawal of Rs ${(Number(row.amount) / 100).toLocaleString('en-PK')} has been sent.`)
    await post(tx, {
      type: 'WITHDRAWAL_PAID',
      referenceType: 'withdrawal',
      referenceId: row.id,
      idempotencyKey: `wd-paid:${row.id}`,
      legs: [
        { account: { userId: row.userId, bucket: 'FROZEN' }, direction: 'DEBIT', amount: row.amount },
        { account: { system: 'GATEWAY_CLEARING' }, direction: 'CREDIT', amount: row.amount },
      ],
    })
    queueWithdrawUpdate(row.userId, {
      id: row.id,
      status: 'PAID',
      amount: Number(row.amount),
    })
    queueCommissionSettlement(row.userId)
    return tx.withdrawal.findUniqueOrThrow({ where: { id } })
  })
  return wd
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
    queueWithdrawUpdate(wd.userId, {
      id: wd.id,
      status: 'REJECTED',
      amount: Number(wd.amount),
      rejectReason: reason,
    })
    return tx.withdrawal.findUniqueOrThrow({ where: { id } })
  })
}
