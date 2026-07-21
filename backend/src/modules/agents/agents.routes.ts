import { Router } from 'express'
import { z } from 'zod'
import { authenticate } from '../../middleware/authenticate.js'
import { authorize } from '../../middleware/authorize.js'
import { validate } from '../../middleware/validate.js'
import { asyncHandler } from '../../lib/asyncHandler.js'
import { ok } from '../../lib/respond.js'
import { prisma } from '../../lib/prisma.js'
import { balances } from '../wallet/wallet.service.js'
import { runMoneyTx } from '../../core/tx.js'
import { post } from '../../core/ledger.js'
import { conflict, notFound, unprocessable } from '../../core/errors.js'
import { getSettings } from '../../core/settings.js'
import { listForAgent as listPayouts, listAvailable, claim, submitPay } from '../withdrawals/payouts.service.js'
import { create as createDeposit, agentConfirmDeposit, agentRejectDeposit } from '../deposits/deposits.service.js'
import { toPaisa, toRupees } from '../../lib/money.js'

export const agentRoutes = Router()

agentRoutes.use(authenticate, authorize('AGENT', 'ADMIN'))

agentRoutes.get(
  '/summary',
  asyncHandler(async (req, res) => {
    const userId = req.user!.id
    const [bal, me, orders, commission] = await Promise.all([
      balances(userId),
      prisma.user.findUniqueOrThrow({ where: { id: userId }, select: { agentActive: true, walletsFilled: true, referrals: { select: { id: true } } } }),
      prisma.collectionOrder.count({ where: { agentId: userId, status: { in: ['PENDING', 'CHECKING', 'PROCESSING'] } } }),
      prisma.commission.aggregate({ where: { agentId: userId }, _sum: { amount: true } }),
    ])
    ok(res, {
      balance: bal.MAIN,
      commission: bal.COMMISSION,
      frozen: bal.FROZEN,
      agentActive: me.agentActive,
      walletsFilled: me.walletsFilled,
      referrals: me.referrals.length,
      openOrders: orders,
      totalCommission: commission._sum.amount ?? 0n,
    })
  }),
)

agentRoutes.get(
  '/accounts',
  asyncHandler(async (req, res) => {
    ok(res, await prisma.agentAccount.findMany({ where: { userId: req.user!.id }, orderBy: { createdAt: 'desc' } }))
  }),
)

const accountSchema = z.object({
  method: z.enum(['JAZZCASH', 'EASYPAISA', 'BANK', 'WEGARS']),
  number: z.string().min(3),
  holder: z.string().min(2),
})

agentRoutes.post(
  '/accounts',
  validate({ body: accountSchema }),
  asyncHandler(async (req, res) => {
    const s = await getSettings()
    const method = req.body.method
    const max =
      method === 'JAZZCASH' ? s.maxAgentJazzcash : method === 'EASYPAISA' ? s.maxAgentEasypaisa : 99
    const count = await prisma.agentAccount.count({ where: { userId: req.user!.id, method } })
    if (count >= max) throw unprocessable(`Maximum ${max} ${method} accounts allowed`)

    // Agent self-adds numbers — no admin review. Starts off; only one per method can be on.
    const acc = await prisma.agentAccount.create({
      data: { ...req.body, userId: req.user!.id, enabled: false, awaitingReview: false },
    })
    ok(res, acc, 201)
  }),
)

agentRoutes.patch(
  '/accounts/:id',
  validate({ body: z.object({ enabled: z.boolean() }) }),
  asyncHandler(async (req, res) => {
    const userId = req.user!.id
    const acc = await prisma.agentAccount.findFirst({ where: { id: req.params.id, userId } })
    if (!acc) throw notFound('Account not found')

    // Only one JazzCash and one Easypaisa active at a time
    if (req.body.enabled) {
      await prisma.$transaction([
        prisma.agentAccount.updateMany({
          where: { userId, method: acc.method, id: { not: acc.id } },
          data: { enabled: false },
        }),
        prisma.agentAccount.update({
          where: { id: acc.id },
          data: { enabled: true, awaitingReview: false },
        }),
      ])
      ok(res, await prisma.agentAccount.findUniqueOrThrow({ where: { id: acc.id } }))
      return
    }

    const updated = await prisma.agentAccount.update({
      where: { id: acc.id },
      data: { enabled: false },
    })
    ok(res, updated)
  }),
)

agentRoutes.delete(
  '/accounts/:id',
  asyncHandler(async (req, res) => {
    const acc = await prisma.agentAccount.findFirst({ where: { id: req.params.id, userId: req.user!.id } })
    if (!acc) throw notFound('Account not found')
    await prisma.agentAccount.delete({ where: { id: acc.id } })
    ok(res, { deleted: true })
  }),
)

agentRoutes.get(
  '/orders',
  asyncHandler(async (req, res) => {
    const status = (req.query.status as string | undefined) || undefined
    const method = (req.query.method as string | undefined) || undefined
    const type = (req.query.type as string | undefined) || undefined
    const collectionAccount = (req.query.collectionAccount as string | undefined)?.trim() || undefined
    const from = req.query.from ? new Date(String(req.query.from)) : undefined
    const to = req.query.to ? new Date(String(req.query.to)) : undefined

    const where: Record<string, unknown> = { agentId: req.user!.id }
    if (status) where.status = status
    if (method) where.method = method
    if (type) where.type = type
    if (collectionAccount) where.collectionAccount = collectionAccount
    if (from || to) {
      const createdAt: Record<string, Date> = {}
      if (from && !Number.isNaN(from.getTime())) createdAt.gte = from
      if (to && !Number.isNaN(to.getTime())) {
        const end = new Date(to)
        end.setHours(23, 59, 59, 999)
        createdAt.lte = end
      }
      where.createdAt = createdAt
    }

    const orders = await prisma.collectionOrder.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      take: 200,
    })
    ok(res, orders)
  }),
)

agentRoutes.post(
  '/orders/:id/accept',
  asyncHandler(async (req, res) => {
    const order = await prisma.collectionOrder.findFirst({ where: { id: req.params.id, agentId: req.user!.id } })
    if (!order) throw notFound('Order not found')
    if (order.status !== 'PENDING') throw conflict('Order already handled')
    ok(res, await prisma.collectionOrder.update({ where: { id: order.id }, data: { status: 'CHECKING' } }))
  }),
)

const resolveSchema = z.object({
  status: z.enum(['SUCCESS', 'FAIL']),
  trxId: z.string().optional(),
})

agentRoutes.post(
  '/orders/:id/resolve',
  validate({ body: resolveSchema }),
  asyncHandler(async (req, res) => {
    const agentId = req.user!.id
    const order = await prisma.collectionOrder.findFirst({ where: { id: req.params.id, agentId } })
    if (!order) throw notFound('Order not found')
    if (order.status === 'SUCCESS' || order.status === 'FAIL') throw conflict('Order already resolved')

    if (order.type === 'DEPOSIT') {
      if (req.body.status === 'SUCCESS') {
        ok(res, await agentConfirmDeposit(order.id, agentId, req.body.trxId))
        return
      }
      ok(res, await agentRejectDeposit(order.id, agentId, 'Payment not received'))
      return
    }

    // Non-deposit orders (legacy) — status only
    const updated = await prisma.collectionOrder.update({
      where: { id: order.id },
      data: { status: req.body.status, trxId: req.body.trxId ?? order.trxId, resolvedAt: new Date() },
    })
    ok(res, updated)
  }),
)

agentRoutes.get(
  '/commission',
  asyncHandler(async (req, res) => {
    ok(res, await prisma.commission.findMany({ where: { agentId: req.user!.id }, orderBy: { createdAt: 'desc' }, take: 100 }))
  }),
)

agentRoutes.post(
  '/commission/transfer',
  asyncHandler(async (req, res) => {
    const userId = req.user!.id
    const bal = await balances(userId)
    const amount = bal.COMMISSION ?? 0n
    if (amount <= 0n) throw unprocessable('No commission balance to transfer')

    await runMoneyTx(async (tx) => {
      await post(tx, {
        type: 'COMMISSION',
        referenceType: 'user',
        referenceId: userId,
        idempotencyKey: `comm-transfer:${userId}:${Date.now()}`,
        legs: [
          { account: { userId, bucket: 'COMMISSION' }, direction: 'DEBIT', amount },
          { account: { userId, bucket: 'MAIN' }, direction: 'CREDIT', amount },
        ],
      })
    })
    ok(res, { transferred: Number(amount) / 100 })
  }),
)

agentRoutes.get(
  '/payouts',
  asyncHandler(async (req, res) => {
    ok(res, await listPayouts(req.user!.id))
  }),
)

agentRoutes.get(
  '/payouts/available',
  asyncHandler(async (_req, res) => {
    ok(res, await listAvailable())
  }),
)

agentRoutes.post(
  '/payouts/:withdrawalId/claim',
  asyncHandler(async (req, res) => {
    ok(res, await claim(req.params.withdrawalId, req.user!.id), 201)
  }),
)

const paySchema = z.object({ trxId: z.string().min(1), senderAccount: z.string().min(3) })
agentRoutes.post(
  '/payouts/:id/pay',
  validate({ body: paySchema }),
  asyncHandler(async (req, res) => {
    ok(res, await submitPay(req.params.id, req.user!.id, req.body.trxId, req.body.senderAccount))
  }),
)

/** Sum COMMISSION credits still inside the hold window (actual ledger, not seed orders). */
async function lockedEarnings(userId: string, unlockBefore: Date) {
  const acc = await prisma.ledgerAccount.findFirst({
    where: { ownerId: userId, bucket: 'COMMISSION' },
    select: { id: true },
  })
  if (!acc) return 0n
  const recent = await prisma.ledgerEntry.aggregate({
    where: {
      accountId: acc.id,
      direction: 'CREDIT',
      createdAt: { gt: unlockBefore },
      transaction: { type: 'COMMISSION', status: 'POSTED' },
    },
    _sum: { amount: true },
  })
  return recent._sum.amount ?? 0n
}

/** Earnings: locked vs available after admin hold days; withdraw available → MAIN */
agentRoutes.get(
  '/earnings',
  asyncHandler(async (req, res) => {
    const s = await getSettings()
    const holdMs = (s.agentEarnHoldDays ?? 7) * 24 * 60 * 60 * 1000
    const unlockBefore = new Date(Date.now() - holdMs)
    const bal = await balances(req.user!.id)
    const lockedRaw = await lockedEarnings(req.user!.id, unlockBefore)
    const total = bal.COMMISSION ?? 0n
    const locked = lockedRaw > total ? total : lockedRaw
    const available = total > locked ? total - locked : 0n
    ok(res, {
      total,
      locked,
      available,
      holdDays: s.agentEarnHoldDays ?? 7,
    })
  }),
)

agentRoutes.post(
  '/earnings/withdraw',
  validate({ body: z.object({ amount: z.number().positive().optional() }) }),
  asyncHandler(async (req, res) => {
    const userId = req.user!.id
    const s = await getSettings()
    const holdMs = (s.agentEarnHoldDays ?? 7) * 24 * 60 * 60 * 1000
    const unlockBefore = new Date(Date.now() - holdMs)
    const bal = await balances(userId)
    const lockedRaw = await lockedEarnings(userId, unlockBefore)
    const total = bal.COMMISSION ?? 0n
    const locked = lockedRaw > total ? total : lockedRaw
    const available = total > locked ? total - locked : 0n
    const want = req.body.amount != null ? toPaisa(req.body.amount) : available
    if (want <= 0n || want > available) throw unprocessable('No unlocked earnings available yet')

    await runMoneyTx(async (tx) => {
      await post(tx, {
        type: 'COMMISSION',
        referenceType: 'user',
        referenceId: userId,
        idempotencyKey: `earn-withdraw:${userId}:${Date.now()}`,
        assertNonNegative: [{ userId, bucket: 'COMMISSION' }],
        legs: [
          { account: { userId, bucket: 'COMMISSION' }, direction: 'DEBIT', amount: want },
          { account: { userId, bucket: 'MAIN' }, direction: 'CREDIT', amount: want },
        ],
      })
    })
    ok(res, { withdrawn: toRupees(want) })
  }),
)

/** Platform payment numbers agents use to top up their own float (admin confirms). */
agentRoutes.get(
  '/float/channels',
  asyncHandler(async (req, res) => {
    const method = req.query.method as string | undefined
    const channels = await prisma.paymentChannel.findMany({
      where: { enabled: true, ...(method ? { method: method as any } : {}) },
      orderBy: { createdAt: 'desc' },
    })
    ok(
      res,
      channels.map((c) => ({
        id: c.id,
        method: c.method,
        accountNumber: c.accountNumber,
        accountTitle: c.accountTitle,
        instructions: c.instructions,
        minAmount: c.minAmount,
        maxAmount: c.maxAmount,
      })),
    )
  }),
)

agentRoutes.get(
  '/float/topups',
  asyncHandler(async (req, res) => {
    ok(res, await prisma.deposit.findMany({
      where: { userId: req.user!.id, agentAccountId: null },
      orderBy: { createdAt: 'desc' },
      take: 50,
    }))
  }),
)

agentRoutes.post(
  '/float/topup',
  validate({
    body: z.object({
      amount: z.number().positive(),
      method: z.enum(['JAZZCASH', 'EASYPAISA', 'BANK', 'WEGARS']),
      channelId: z.string().min(1),
      senderAccount: z.string().min(3),
      trxId: z.string().min(1),
    }),
  }),
  asyncHandler(async (req, res) => {
    const ch = await prisma.paymentChannel.findFirst({
      where: { id: req.body.channelId, enabled: true, method: req.body.method },
    })
    if (!ch) throw notFound('Payment account not found')
    // Force platform channel only — never another agent's collection number
    // Pass platform channelId only — createDeposit must not treat it as an agentAccount id
    const dep = await createDeposit(req.user!.id, {
      amount: req.body.amount,
      method: req.body.method,
      channelId: ch.id,
      senderAccount: req.body.senderAccount,
      trxId: req.body.trxId,
    })
    if (dep.agentAccountId) throw conflict('Float top-up must use platform accounts')
    ok(res, dep, 201)
  }),
)

agentRoutes.get(
  '/stats',
  asyncHandler(async (req, res) => {
    const agentId = req.user!.id
    const now = new Date()
    const startToday = new Date(now); startToday.setHours(0, 0, 0, 0)
    const startWeek = new Date(now); startWeek.setDate(now.getDate() - 6); startWeek.setHours(0, 0, 0, 0)
    const startMonth = new Date(now); startMonth.setDate(now.getDate() - 29); startMonth.setHours(0, 0, 0, 0)

    async function period(from: Date) {
      const [col, pay] = await Promise.all([
        prisma.collectionOrder.aggregate({ where: { agentId, status: 'SUCCESS', type: 'DEPOSIT', createdAt: { gte: from } }, _sum: { amount: true, reward: true } }),
        prisma.collectionOrder.aggregate({ where: { agentId, status: 'SUCCESS', type: 'WITHDRAW', createdAt: { gte: from } }, _sum: { amount: true, reward: true } }),
      ])
      return {
        colAmount: col._sum.amount ?? 0n,
        colReward: col._sum.reward ?? 0n,
        payAmount: pay._sum.amount ?? 0n,
        payReward: pay._sum.reward ?? 0n,
      }
    }

    const [today, week, month] = await Promise.all([period(startToday), period(startWeek), period(startMonth)])
    ok(res, { today, week, month })
  }),
)
