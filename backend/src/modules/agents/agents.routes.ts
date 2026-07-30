import { Router } from 'express'
import { z } from 'zod'
import { authenticate } from '../../middleware/authenticate.js'
import { authorize } from '../../middleware/authorize.js'
import { requireC2cMerchant } from '../../middleware/requireC2cMerchant.js'
import { validate } from '../../middleware/validate.js'
import { asyncHandler } from '../../lib/asyncHandler.js'
import { ok } from '../../lib/respond.js'
import { prisma } from '../../lib/prisma.js'
import { balances } from '../wallet/wallet.service.js'
import { runMoneyTx } from '../../core/tx.js'
import { post } from '../../core/ledger.js'
import { conflict, notFound, unprocessable } from '../../core/errors.js'
import { getSettings } from '../../core/settings.js'
import { listForAgent as listPayouts, listAvailable, listHistory as listPayoutHistory, claim, submitPay, cancelPayout, reportAbnormalPayout } from '../withdrawals/payouts.service.js'
import { create as createDeposit, agentConfirmDeposit, agentRejectDeposit } from '../deposits/deposits.service.js'
import { toPaisa, toRupees } from '../../lib/money.js'

export const agentRoutes = Router()

agentRoutes.use(authenticate, authorize('AGENT'), requireC2cMerchant)

/** Move any leftover COMMISSION bucket into MAIN (C2C rewards are instant — no lock). */
async function flushCommissionToMain(userId: string) {
  const bal = await balances(userId)
  const amount = bal.COMMISSION ?? 0n
  if (amount <= 0n) return 0n
  await runMoneyTx(async (tx) => {
    await post(tx, {
      type: 'COMMISSION',
      referenceType: 'user',
      referenceId: userId,
      idempotencyKey: `c2c-flush-commission:${userId}:${Date.now()}`,
      assertNonNegative: [{ userId, bucket: 'COMMISSION' }],
      legs: [
        { account: { userId, bucket: 'COMMISSION' }, direction: 'DEBIT', amount },
        { account: { userId, bucket: 'MAIN' }, direction: 'CREDIT', amount },
      ],
    })
  })
  return amount
}

agentRoutes.get(
  '/summary',
  asyncHandler(async (req, res) => {
    const userId = req.user!.id
    await flushCommissionToMain(userId)
    const [bal, me, orders, rewardSum] = await Promise.all([
      balances(userId),
      prisma.user.findUniqueOrThrow({ where: { id: userId }, select: { agentActive: true, walletsFilled: true, referrals: { select: { id: true } } } }),
      prisma.collectionOrder.count({ where: { agentId: userId, status: { in: ['PENDING', 'CHECKING', 'PROCESSING'] } } }),
      prisma.collectionOrder.aggregate({
        where: { agentId: userId, status: 'SUCCESS' },
        _sum: { reward: true },
      }),
    ])
    ok(res, {
      balance: bal.MAIN,
      commission: 0n,
      frozen: bal.FROZEN,
      agentActive: me.agentActive,
      walletsFilled: me.walletsFilled,
      referrals: me.referrals.length,
      openOrders: orders,
      totalCommission: rewardSum._sum.reward ?? 0n,
    })
  }),
)

agentRoutes.patch(
  '/active',
  validate({ body: z.object({ active: z.boolean() }) }),
  asyncHandler(async (req, res) => {
    const updated = await prisma.user.update({
      where: { id: req.user!.id },
      data: { agentActive: req.body.active },
      select: { id: true, agentActive: true },
    })
    ok(res, updated)
  }),
)

/** Keep at most one collection number enabled per merchant panel. */
async function enforceOneActiveAccount(userId: string) {
  const enabled = await prisma.agentAccount.findMany({
    where: { userId, enabled: true },
    orderBy: { createdAt: 'desc' },
    select: { id: true },
  })
  if (enabled.length <= 1) return
  const keepId = enabled[0]!.id
  await prisma.agentAccount.updateMany({
    where: { userId, enabled: true, id: { not: keepId } },
    data: { enabled: false },
  })
}

agentRoutes.get(
  '/accounts',
  asyncHandler(async (req, res) => {
    const userId = req.user!.id
    await enforceOneActiveAccount(userId)
    ok(res, await prisma.agentAccount.findMany({ where: { userId }, orderBy: { createdAt: 'desc' } }))
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

    // Merchant self-adds numbers — needs admin approve before collection can be turned on.
    const acc = await prisma.agentAccount.create({
      data: { ...req.body, userId: req.user!.id, enabled: false, awaitingReview: true },
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

    // Only one collection account active per panel (JazzCash OR Easypaisa — never both)
    if (req.body.enabled) {
      if (acc.awaitingReview) {
        throw unprocessable('This number is pending admin approval. You can turn collection on after it is approved.')
      }
      await prisma.$transaction([
        prisma.agentAccount.updateMany({
          where: { userId, id: { not: acc.id } },
          data: { enabled: false },
        }),
        prisma.agentAccount.update({
          where: { id: acc.id },
          data: { enabled: true },
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
      include: {
        player: { select: { id: true, displayName: true, phone: true } },
      },
    })

    // Attach collection account holder name from the agent's wallets
    const numbers = Array.from(
      new Set(orders.map((o) => o.collectionAccount).filter((n): n is string => Boolean(n))),
    )
    const holders =
      numbers.length === 0
        ? []
        : await prisma.agentAccount.findMany({
            where: { userId: req.user!.id, number: { in: numbers } },
            select: { number: true, holder: true },
          })
    const holderByNumber = new Map(holders.map((h) => [h.number, h.holder]))

    ok(
      res,
      orders.map((o) => ({
        ...o,
        collectionHolder: o.collectionAccount ? holderByNumber.get(o.collectionAccount) ?? null : null,
        playerName: o.player?.displayName ?? null,
      })),
    )
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
  '/payouts/history',
  asyncHandler(async (req, res) => {
    ok(res, await listPayoutHistory(req.user!.id))
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

const paySchema = z.object({
  trxId: z.string().min(1),
  senderAccount: z.string().optional(),
})
agentRoutes.post(
  '/payouts/:id/pay',
  validate({ body: paySchema }),
  asyncHandler(async (req, res) => {
    ok(res, await submitPay(req.params.id, req.user!.id, req.body.trxId, req.body.senderAccount ?? ''))
  }),
)

agentRoutes.post(
  '/payouts/:id/cancel',
  asyncHandler(async (req, res) => {
    ok(res, await cancelPayout(req.params.id, req.user!.id))
  }),
)

agentRoutes.post(
  '/payouts/:id/abnormal',
  asyncHandler(async (req, res) => {
    const reason = typeof req.body?.reason === 'string' ? req.body.reason : undefined
    ok(res, await reportAbnormalPayout(req.params.id, req.user!.id, reason))
  }),
)

/** Merchant float ledger only — never player game bets/wins. */
const MERCHANT_TX_TYPES = [
  'COLLECTION',
  'DEPOSIT',
  'COMMISSION',
  'ADMIN_ADJUST',
  'WITHDRAWAL_FREEZE',
  'WITHDRAWAL_PAID',
  'WITHDRAWAL_UNFREEZE',
] as const

const MERCHANT_TX_LABEL: Record<string, string> = {
  COLLECTION: 'Collection',
  DEPOSIT: 'Float top-up',
  COMMISSION: 'C2C reward',
  ADMIN_ADJUST: 'Admin adjustment',
  WITHDRAWAL_FREEZE: 'Payout (freeze)',
  WITHDRAWAL_PAID: 'Payout (paid)',
  WITHDRAWAL_UNFREEZE: 'Payout (returned)',
}

agentRoutes.get(
  '/transactions',
  asyncHandler(async (req, res) => {
    const userId = req.user!.id
    const accountIds = (
      await prisma.ledgerAccount.findMany({
        where: { ownerId: userId, bucket: { in: ['MAIN', 'FROZEN', 'COMMISSION'] } },
        select: { id: true },
      })
    ).map((a) => a.id)

    if (accountIds.length === 0) {
      ok(res, [])
      return
    }

    const entries = await prisma.ledgerEntry.findMany({
      where: {
        accountId: { in: accountIds },
        transaction: { type: { in: [...MERCHANT_TX_TYPES] } },
      },
      include: {
        transaction: { select: { type: true, createdAt: true, referenceType: true } },
        account: { select: { bucket: true } },
      },
      orderBy: { createdAt: 'desc' },
      take: 80,
    })

    ok(
      res,
      entries.map((e) => ({
        id: e.id,
        type: MERCHANT_TX_LABEL[e.transaction.type] ?? e.transaction.type,
        amount: e.amount,
        signed: e.direction === 'CREDIT' ? e.amount : -e.amount,
        bucket: e.account.bucket,
        time: e.transaction.createdAt,
      })),
    )
  }),
)

/** Lifetime C2C rewards (already in MAIN). Lock system disabled — deposit/withdraw % credits float instantly. */
agentRoutes.get(
  '/earnings',
  asyncHandler(async (req, res) => {
    const userId = req.user!.id
    await flushCommissionToMain(userId)
    const rewardSum = await prisma.collectionOrder.aggregate({
      where: { agentId: userId, status: 'SUCCESS' },
      _sum: { reward: true },
    })
    const total = rewardSum._sum.reward ?? 0n
    ok(res, {
      total,
      locked: 0n,
      available: 0n,
      holdDays: 0,
      instantToFloat: true,
    })
  }),
)

agentRoutes.post(
  '/earnings/withdraw',
  validate({ body: z.object({ amount: z.number().positive().optional() }) }),
  asyncHandler(async (req, res) => {
    // Legacy endpoint — rewards already land in MAIN; flush any leftover COMMISSION.
    const moved = await flushCommissionToMain(req.user!.id)
    ok(res, { withdrawn: toRupees(moved), message: 'Rewards already credit float instantly' })
  }),
)

/** Platform bank accounts agents use to top up float (admin-managed, min Rs 10,000). */
const AGENT_FLOAT_MIN = 10_000

agentRoutes.get(
  '/float/channels',
  asyncHandler(async (_req, res) => {
    const channels = await prisma.paymentChannel.findMany({
      where: { enabled: true, agentFloat: true, method: 'BANK' },
      orderBy: [{ priority: 'desc' }, { createdAt: 'desc' }],
    })
    ok(
      res,
      channels.map((c) => ({
        id: c.id,
        method: c.method,
        accountNumber: c.accountNumber,
        accountTitle: c.accountTitle,
        bankName: c.bankName,
        instructions: c.instructions,
        minAmount: Math.max(Number(c.minAmount) / 100, AGENT_FLOAT_MIN),
        maxAmount: Number(c.maxAmount) / 100,
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
      channelId: z.string().min(1),
      senderAccount: z.string().min(3),
      trxId: z.string().min(1),
    }),
  }),
  asyncHandler(async (req, res) => {
    if (req.body.amount < AGENT_FLOAT_MIN) {
      throw unprocessable(`Minimum float top-up is Rs ${AGENT_FLOAT_MIN.toLocaleString('en-PK')}`)
    }
    const ch = await prisma.paymentChannel.findFirst({
      where: { id: req.body.channelId, enabled: true, agentFloat: true, method: 'BANK' },
    })
    if (!ch) throw notFound('Bank account not found')
    const chMin = Math.max(Number(ch.minAmount) / 100, AGENT_FLOAT_MIN)
    if (req.body.amount < chMin) {
      throw unprocessable(`Minimum float top-up for this account is Rs ${chMin.toLocaleString('en-PK')}`)
    }
    if (ch.maxAmount > 0n && req.body.amount > Number(ch.maxAmount) / 100) {
      throw unprocessable(`Maximum for this account is Rs ${(Number(ch.maxAmount) / 100).toLocaleString('en-PK')}`)
    }
    const dep = await createDeposit(req.user!.id, {
      amount: req.body.amount,
      method: 'BANK',
      channelId: ch.id,
      senderAccount: req.body.senderAccount,
      trxId: req.body.trxId,
      autoAssign: false,
    })
    if (dep.agentAccountId) throw conflict('Float top-up must use platform bank accounts')
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

    async function period(from?: Date, to?: Date) {
      const createdAt: Record<string, Date> = {}
      if (from) createdAt.gte = from
      if (to) createdAt.lte = to
      const range = Object.keys(createdAt).length ? { createdAt } : {}
      const [col, pay] = await Promise.all([
        prisma.collectionOrder.aggregate({
          where: { agentId, status: 'SUCCESS', type: 'DEPOSIT', ...range },
          _sum: { amount: true, reward: true },
        }),
        prisma.collectionOrder.aggregate({
          where: { agentId, status: 'SUCCESS', type: 'WITHDRAW', ...range },
          _sum: { amount: true, reward: true },
        }),
      ])
      return {
        colAmount: col._sum.amount ?? 0n,
        colReward: col._sum.reward ?? 0n,
        payAmount: pay._sum.amount ?? 0n,
        payReward: pay._sum.reward ?? 0n,
      }
    }

    const fromQ = req.query.from ? new Date(String(req.query.from)) : null
    const toQ = req.query.to ? new Date(String(req.query.to)) : null
    const customFrom = fromQ && !Number.isNaN(fromQ.getTime()) ? (() => { const d = new Date(fromQ); d.setHours(0, 0, 0, 0); return d })() : null
    const customTo = toQ && !Number.isNaN(toQ.getTime()) ? (() => { const d = new Date(toQ); d.setHours(23, 59, 59, 999); return d })() : null

    const [today, week, month, custom] = await Promise.all([
      period(startToday),
      period(startWeek),
      period(startMonth),
      customFrom || customTo ? period(customFrom ?? undefined, customTo ?? undefined) : Promise.resolve(null),
    ])
    ok(res, { today, week, month, ...(custom ? { custom } : {}) })
  }),
)
