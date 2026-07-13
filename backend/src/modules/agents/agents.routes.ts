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
import { listForAgent as listPayouts, submitPay } from '../withdrawals/payouts.service.js'

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

    const acc = await prisma.agentAccount.create({ data: { ...req.body, userId: req.user!.id, enabled: false, awaitingReview: true } })
    ok(res, acc, 201)
  }),
)

agentRoutes.patch(
  '/accounts/:id',
  validate({ body: z.object({ enabled: z.boolean() }) }),
  asyncHandler(async (req, res) => {
    const acc = await prisma.agentAccount.findFirst({ where: { id: req.params.id, userId: req.user!.id } })
    if (!acc) throw notFound('Account not found')
    if (req.body.enabled && acc.awaitingReview) throw unprocessable('Account is awaiting admin review')
    const updated = await prisma.agentAccount.update({ where: { id: acc.id }, data: { enabled: req.body.enabled } })
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
    const status = req.query.status as string | undefined
    const orders = await prisma.collectionOrder.findMany({
      where: { agentId: req.user!.id, ...(status ? { status: status as any } : {}) },
      orderBy: { createdAt: 'desc' },
      take: 100,
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
    const result = await runMoneyTx(async (tx) => {
      const order = await tx.collectionOrder.findFirst({ where: { id: req.params.id, agentId } })
      if (!order) throw notFound('Order not found')
      if (order.status === 'SUCCESS' || order.status === 'FAIL') throw conflict('Order already resolved')

      const updated = await tx.collectionOrder.update({
        where: { id: order.id },
        data: {
          status: req.body.status,
          trxId: req.body.trxId ?? order.trxId,
          resolvedAt: new Date(),
        },
      })

      if (req.body.status === 'SUCCESS' && order.type === 'DEPOSIT' && order.reward > 0n) {
        await post(tx, {
          type: 'COMMISSION',
          referenceType: 'collectionOrder',
          referenceId: order.id,
          idempotencyKey: `col-reward:${order.id}`,
          legs: [
            { account: { system: 'HOUSE' }, direction: 'DEBIT', amount: order.reward },
            { account: { userId: agentId, bucket: 'MAIN' }, direction: 'CREDIT', amount: order.reward },
          ],
        })
      }

      return updated
    })
    ok(res, result)
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

const paySchema = z.object({ trxId: z.string().min(1), senderAccount: z.string().min(3) })
agentRoutes.post(
  '/payouts/:id/pay',
  validate({ body: paySchema }),
  asyncHandler(async (req, res) => {
    ok(res, await submitPay(req.params.id, req.user!.id, req.body.trxId, req.body.senderAccount))
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
