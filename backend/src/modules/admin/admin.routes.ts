import { Router } from 'express'
import { z } from 'zod'
import { authenticate } from '../../middleware/authenticate.js'
import { authorize } from '../../middleware/authorize.js'
import { validate } from '../../middleware/validate.js'
import { requireScope, ADMIN_SCOPES } from '../../middleware/requireScope.js'
import { asyncHandler } from '../../lib/asyncHandler.js'
import { ok } from '../../lib/respond.js'
import { prisma } from '../../lib/prisma.js'
import { pageParams, paged } from '../../lib/pagination.js'
import { getSettings, updateSettings } from '../../core/settings.js'
import { audit } from '../../core/audit.js'
import { runMoneyTx } from '../../core/tx.js'
import { post } from '../../core/ledger.js'
import { toPaisa } from '../../lib/money.js'
import { badRequest, notFound } from '../../core/errors.js'
import * as deposits from '../deposits/deposits.service.js'
import * as withdrawals from '../withdrawals/withdrawals.service.js'
import { assign as assignPayout } from '../withdrawals/payouts.service.js'
import { balances } from '../wallet/wallet.service.js'
import { settingsPatchSchema } from './settings.schema.js'
import { reportsRoutes } from './reports.routes.js'
import { commissionRoutes } from './commissions.routes.js'
import { bonusAdminRoutes } from './bonuses.admin.routes.js'
import { ledgerRoutes } from './ledger.routes.js'
import { createAgent, makeAgent } from './agents.admin.service.js'

export const adminRoutes = Router()
adminRoutes.use(authenticate, authorize('ADMIN'))

// Mounted sub-routers (each enforces its own scope)
adminRoutes.use('/reports', reportsRoutes)
adminRoutes.use('/commissions', commissionRoutes)
adminRoutes.use('/bonuses', bonusAdminRoutes)
adminRoutes.use('/ledger', ledgerRoutes)

/* ---------------- Dashboard ---------------- */
adminRoutes.get(
  '/dashboard',
  asyncHandler(async (_req, res) => {
    const [players, agents, pendingDeposits, pendingWithdrawals, games, depSum, wdSum, commissionSum] = await Promise.all([
      prisma.user.count({ where: { role: 'PLAYER' } }),
      prisma.user.count({ where: { role: 'AGENT' } }),
      prisma.deposit.count({ where: { status: 'PENDING' } }),
      prisma.withdrawal.count({ where: { status: 'PENDING' } }),
      prisma.game.count({ where: { enabled: true } }),
      prisma.deposit.aggregate({ where: { status: 'APPROVED' }, _sum: { amount: true } }),
      prisma.withdrawal.aggregate({ where: { status: 'PAID' }, _sum: { amount: true } }),
      prisma.commission.aggregate({ _sum: { amount: true } }),
    ])
    ok(res, {
      players,
      agents,
      pendingDeposits,
      pendingWithdrawals,
      liveGames: games,
      totalDeposited: depSum._sum.amount ?? 0n,
      totalWithdrawn: wdSum._sum.amount ?? 0n,
      totalCommission: commissionSum._sum.amount ?? 0n,
    })
  }),
)

/* ---------------- Users ---------------- */
adminRoutes.get(
  '/users',
  requireScope('users'),
  asyncHandler(async (req, res) => {
    const p = pageParams(req)
    const q = ((req.query.q as string) || '').trim()
    const role = req.query.role as string | undefined
    const where: any = {
      ...(role ? { role: role as any } : {}),
    }
    if (q) {
      const ors: any[] = [
        { displayName: { contains: q, mode: 'insensitive' as const } },
        { phone: { contains: q } },
        { referralCode: { contains: q, mode: 'insensitive' as const } },
        { channelCode: { contains: q, mode: 'insensitive' as const } },
        { bindCode: { contains: q, mode: 'insensitive' as const } },
        { id: { contains: q } },
      ]
      // Game ID in player UI = last 8 chars of cuid
      if (q.length >= 4 && q.length <= 12) {
        ors.push({ id: { endsWith: q } })
      }
      where.OR = ors
    }
    const [items, total] = await Promise.all([
      prisma.user.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: p.skip,
        take: p.limit,
        select: {
          id: true, phone: true, displayName: true, role: true, status: true, vipLevel: true,
          referralCode: true, referredById: true, agentActive: true, channelCode: true, bindCode: true, createdAt: true,
        },
      }),
      prisma.user.count({ where }),
    ])

    // Bulk-attach financials (balance/bonus/deposited/withdrawn) without N+1
    const ids = items.map((u) => u.id)
    const [accts, deps, wds] = await Promise.all([
      prisma.ledgerAccount.findMany({ where: { ownerId: { in: ids } }, select: { ownerId: true, bucket: true, balance: true } }),
      prisma.deposit.groupBy({ by: ['userId'], where: { userId: { in: ids }, status: 'APPROVED' }, _sum: { amount: true } }),
      prisma.withdrawal.groupBy({ by: ['userId'], where: { userId: { in: ids }, status: 'PAID' }, _sum: { amount: true } }),
    ])
    const bal = new Map<string, { MAIN: bigint; BONUS: bigint }>()
    for (const a of accts) {
      if (!a.ownerId) continue
      const e = bal.get(a.ownerId) ?? { MAIN: 0n, BONUS: 0n }
      if (a.bucket === 'MAIN') e.MAIN = a.balance
      if (a.bucket === 'BONUS') e.BONUS = a.balance
      bal.set(a.ownerId, e)
    }
    const depMap = new Map(deps.map((d) => [d.userId, d._sum.amount ?? 0n]))
    const wdMap = new Map(wds.map((w) => [w.userId, w._sum.amount ?? 0n]))
    const enriched = items.map((u) => ({
      ...u,
      balance: bal.get(u.id)?.MAIN ?? 0n,
      bonus: bal.get(u.id)?.BONUS ?? 0n,
      deposited: depMap.get(u.id) ?? 0n,
      withdrawn: wdMap.get(u.id) ?? 0n,
    }))
    ok(res, paged(enriched, total, p))
  }),
)

// 360° user view
adminRoutes.get(
  '/users/:id',
  requireScope('users'),
  asyncHandler(async (req, res) => {
    const id = req.params.id
    const user = await prisma.user.findUnique({
      where: { id },
      select: {
        id: true, phone: true, displayName: true, role: true, status: true, vipLevel: true,
        referralCode: true, referredById: true, agentActive: true, walletsFilled: true,
        adminScopes: true, channelCode: true, bindCode: true, createdAt: true,
      },
    })
    if (!user) throw notFound('User not found')
    const [wallet, deps, wds, bonuses, directRefs, commission, accounts, channels, betAgg] = await Promise.all([
      balances(id),
      prisma.deposit.findMany({ where: { userId: id }, orderBy: { createdAt: 'desc' }, take: 20 }),
      prisma.withdrawal.findMany({ where: { userId: id }, orderBy: { createdAt: 'desc' }, take: 20 }),
      prisma.bonus.findMany({ where: { userId: id }, orderBy: { createdAt: 'desc' }, take: 50 }),
      prisma.referralEdge.count({ where: { ancestorId: id, level: 1 } }),
      prisma.commission.aggregate({ where: { agentId: id }, _sum: { amount: true } }),
      prisma.agentAccount.findMany({ where: { userId: id }, orderBy: { createdAt: 'desc' } }),
      prisma.channel.findMany({ where: { ownerId: id }, orderBy: { createdAt: 'desc' } }),
      prisma.gameRound.aggregate({ where: { userId: id }, _sum: { bet: true }, _count: true }),
    ])
    ok(res, {
      user: { ...user, gameId: user.id.slice(-8) },
      wallet,
      deposits: deps,
      withdrawals: wds,
      bonuses,
      directReferrals: directRefs,
      commissionEarned: commission._sum.amount ?? 0n,
      accounts,
      channels,
      wagerSummary: {
        totalBet: betAgg._sum.bet ?? 0n,
        rounds: betAgg._count,
      },
    })
  }),
)

/** Admin edits profile fields on any user (player / mentor / agent). */
adminRoutes.patch(
  '/users/:id',
  requireScope('users'),
  validate({
    body: z.object({
      displayName: z.string().min(1).max(80).optional(),
      phone: z.string().min(10).max(20).optional(),
      vipLevel: z.number().int().min(0).max(20).optional(),
      channelCode: z.string().max(40).nullable().optional(),
      bindCode: z.string().max(40).nullable().optional(),
      agentActive: z.boolean().optional(),
      status: z.enum(['ACTIVE', 'BANNED']).optional(),
      role: z.enum(['PLAYER', 'AGENT', 'ADMIN']).optional(),
    }),
  }),
  asyncHandler(async (req, res) => {
    const id = req.params.id
    const existing = await prisma.user.findUnique({ where: { id } })
    if (!existing) throw notFound('User not found')
    if (req.body.phone && req.body.phone !== existing.phone) {
      const clash = await prisma.user.findFirst({ where: { phone: req.body.phone, id: { not: id } } })
      if (clash) throw badRequest('Phone already in use')
    }
    const user = await prisma.user.update({ where: { id }, data: req.body })
    await audit(req, 'user.patch', 'user', id, null, req.body)
    ok(res, user)
  }),
)

/**
 * Manually adjust bonus wager on a player.
 * - mode add: add Rs to wagerProgress (counts toward release)
 * - mode set: set wagerProgress to absolute Rs
 * - mode required: set wagerRequired to absolute Rs
 * If bonusId omitted, applies to oldest ACTIVE bonus (or creates a zero-amount tracking bonus).
 */
adminRoutes.post(
  '/users/:id/wager',
  requireScope('finance'),
  validate({
    body: z.object({
      mode: z.enum(['add', 'set', 'required']),
      amount: z.number().min(0),
      bonusId: z.string().optional(),
    }),
  }),
  asyncHandler(async (req, res) => {
    const userId = req.params.id
    const user = await prisma.user.findUnique({ where: { id: userId }, select: { id: true } })
    if (!user) throw notFound('User not found')
    const paisa = toPaisa(req.body.amount)

    const result = await runMoneyTx(async (tx) => {
      let bonus = req.body.bonusId
        ? await tx.bonus.findFirst({ where: { id: req.body.bonusId, userId } })
        : await tx.bonus.findFirst({ where: { userId, status: 'ACTIVE' }, orderBy: { createdAt: 'asc' } })

      if (!bonus) {
        bonus = await tx.bonus.create({
          data: {
            userId,
            type: 'REBET',
            amount: 0n,
            wagerRequired: req.body.mode === 'required' ? paisa : 0n,
            wagerProgress: req.body.mode === 'required' ? 0n : paisa,
            status: 'ACTIVE',
          },
        })
      } else {
        const data: { wagerProgress?: bigint; wagerRequired?: bigint; status?: 'ACTIVE' | 'RELEASED' } = {}
        if (req.body.mode === 'add') data.wagerProgress = bonus.wagerProgress + paisa
        else if (req.body.mode === 'set') data.wagerProgress = paisa
        else data.wagerRequired = paisa

        const nextProgress = data.wagerProgress ?? bonus.wagerProgress
        const nextRequired = data.wagerRequired ?? bonus.wagerRequired
        if (nextRequired > 0n && nextProgress >= nextRequired) {
          data.status = 'RELEASED'
          // Credit remaining bonus amount to MAIN if still in BONUS bucket
          if (bonus.amount > 0n && bonus.status === 'ACTIVE') {
            await post(tx, {
              type: 'BONUS_RELEASE',
              referenceType: 'bonus',
              referenceId: bonus.id,
              idempotencyKey: `admin-wager-release:${bonus.id}:${Date.now()}`,
              assertNonNegative: [{ userId, bucket: 'BONUS' }],
              legs: [
                { account: { userId, bucket: 'BONUS' }, direction: 'DEBIT', amount: bonus.amount },
                { account: { userId, bucket: 'MAIN' }, direction: 'CREDIT', amount: bonus.amount },
              ],
            })
          }
        }
        bonus = await tx.bonus.update({ where: { id: bonus.id }, data })
      }
      return bonus
    })

    await audit(req, 'user.wager', 'user', userId, null, req.body)
    ok(res, result)
  }),
)

adminRoutes.post(
  '/users/:id/status',
  requireScope('users'),
  validate({ body: z.object({ status: z.enum(['ACTIVE', 'BANNED']) }) }),
  asyncHandler(async (req, res) => {
    const user = await prisma.user.update({ where: { id: req.params.id }, data: { status: req.body.status } })
    await audit(req, 'user.status', 'user', user.id, null, { status: user.status })
    ok(res, { id: user.id, status: user.status })
  }),
)

adminRoutes.post(
  '/users/:id/role',
  requireScope('users'),
  validate({ body: z.object({ role: z.enum(['PLAYER', 'AGENT', 'ADMIN']) }) }),
  asyncHandler(async (req, res) => {
    const user = await prisma.user.update({ where: { id: req.params.id }, data: { role: req.body.role } })
    await audit(req, 'user.role', 'user', user.id, null, { role: user.role })
    ok(res, { id: user.id, role: user.role })
  }),
)

// Sub-admin permission scopes (empty = full/super admin)
adminRoutes.get('/admin-scopes', requireScope('users'), asyncHandler(async (_req, res) => ok(res, ADMIN_SCOPES)))
adminRoutes.post(
  '/users/:id/scopes',
  requireScope('users'),
  validate({ body: z.object({ scopes: z.array(z.enum(ADMIN_SCOPES)) }) }),
  asyncHandler(async (req, res) => {
    const user = await prisma.user.update({ where: { id: req.params.id }, data: { adminScopes: req.body.scopes } })
    await audit(req, 'user.scopes', 'user', user.id, null, { scopes: user.adminScopes })
    ok(res, { id: user.id, adminScopes: user.adminScopes })
  }),
)

/* ---------------- Agents ---------------- */
adminRoutes.get(
  '/agents',
  requireScope('users'),
  asyncHandler(async (_req, res) => {
    const agents = await prisma.user.findMany({
      where: { role: 'AGENT' },
      orderBy: { createdAt: 'desc' },
      select: { id: true, displayName: true, phone: true, agentActive: true, walletsFilled: true, createdAt: true, _count: { select: { referrals: true } } },
    })
    const withCommission = await Promise.all(
      agents.map(async (a) => {
        const c = await prisma.commission.aggregate({ where: { agentId: a.id }, _sum: { amount: true } })
        const bal = await balances(a.id)
        return { ...a, referrals: a._count.referrals, commission: c._sum.amount ?? 0n, commissionBalance: bal.COMMISSION }
      }),
    )
    ok(res, withCommission)
  }),
)

adminRoutes.post(
  '/agents/:id/active',
  requireScope('users'),
  validate({ body: z.object({ active: z.boolean() }) }),
  asyncHandler(async (req, res) => {
    const user = await prisma.user.update({ where: { id: req.params.id }, data: { agentActive: req.body.active } })
    await audit(req, 'agent.active', 'user', user.id, null, { agentActive: user.agentActive })
    ok(res, { id: user.id, agentActive: user.agentActive })
  }),
)

/* ---------------- Agent payment accounts (C2C) ---------------- */
adminRoutes.get(
  '/agent-accounts',
  requireScope('users'),
  asyncHandler(async (req, res) => {
    const awaiting = req.query.awaitingReview === 'true'
    const accounts = await prisma.agentAccount.findMany({
      where: awaiting ? { awaitingReview: true } : {},
      orderBy: { createdAt: 'desc' },
      include: { user: { select: { id: true, displayName: true, phone: true } } },
    })
    ok(res, accounts)
  }),
)

adminRoutes.post(
  '/agent-accounts/:id/approve',
  requireScope('users'),
  asyncHandler(async (req, res) => {
    const acc = await prisma.agentAccount.findUnique({ where: { id: req.params.id } })
    if (!acc) throw notFound('Account not found')
    const updated = await prisma.agentAccount.update({
      where: { id: acc.id },
      data: { awaitingReview: false, enabled: true },
    })
    await audit(req, 'agentAccount.approve', 'agentAccount', acc.id, null, { userId: acc.userId })
    ok(res, updated)
  }),
)

adminRoutes.post(
  '/agent-accounts/:id/reject',
  requireScope('users'),
  validate({ body: z.object({ reason: z.string().optional() }) }),
  asyncHandler(async (req, res) => {
    const acc = await prisma.agentAccount.findUnique({ where: { id: req.params.id } })
    if (!acc) throw notFound('Account not found')
    await prisma.agentAccount.delete({ where: { id: acc.id } })
    await audit(req, 'agentAccount.reject', 'agentAccount', req.params.id, null, { reason: req.body.reason, userId: acc.userId })
    ok(res, { deleted: true })
  }),
)

/** Optional: admin can still add a number for an agent. Agent normally self-adds in C2C (max 30 each). */
adminRoutes.post(
  '/agents/:id/accounts',
  requireScope('users'),
  validate({
    body: z.object({
      method: z.enum(['JAZZCASH', 'EASYPAISA', 'BANK', 'WEGARS']),
      number: z.string().min(3).max(40),
      holder: z.string().min(2).max(80),
      enabled: z.boolean().optional(),
    }),
  }),
  asyncHandler(async (req, res) => {
    const agent = await prisma.user.findUnique({ where: { id: req.params.id } })
    if (!agent || agent.role !== 'AGENT') throw notFound('Agent not found')
    const s = await getSettings()
    const method = req.body.method
    const max = method === 'JAZZCASH' ? s.maxAgentJazzcash : method === 'EASYPAISA' ? s.maxAgentEasypaisa : 99
    const count = await prisma.agentAccount.count({ where: { userId: agent.id, method } })
    if (count >= max) throw badRequest(`Maximum ${max} ${method} accounts for this agent`)
    const makeEnabled = req.body.enabled !== false
    if (makeEnabled) {
      await prisma.agentAccount.updateMany({
        where: { userId: agent.id, method },
        data: { enabled: false },
      })
    }
    const acc = await prisma.agentAccount.create({
      data: {
        userId: agent.id,
        method,
        number: req.body.number,
        holder: req.body.holder,
        enabled: makeEnabled,
        awaitingReview: false,
      },
    })
    await audit(req, 'agentAccount.create', 'agentAccount', acc.id, null, { userId: agent.id })
    ok(res, acc, 201)
  }),
)

adminRoutes.get(
  '/agents/:id/accounts',
  requireScope('users'),
  asyncHandler(async (req, res) => {
    ok(res, await prisma.agentAccount.findMany({ where: { userId: req.params.id }, orderBy: { createdAt: 'desc' } }))
  }),
)

// Create a brand-new agent account; returns the generated C2C login (shown once).
adminRoutes.post(
  '/agents',
  requireScope('users'),
  validate({ body: z.object({ phone: z.string().min(7).max(20), displayName: z.string().min(2).max(40), password: z.string().min(6).max(72).optional() }) }),
  asyncHandler(async (req, res) => {
    const creds = await createAgent(req.body)
    await audit(req, 'agent.create', 'user', creds.id, null, { phone: creds.phone })
    ok(res, creds, 201)
  }),
)

// Promote an existing user who reached agent rank; issues a fresh C2C login (shown once).
adminRoutes.post(
  '/users/:id/make-agent',
  requireScope('users'),
  asyncHandler(async (req, res) => {
    const creds = await makeAgent(req.params.id)
    await audit(req, 'agent.promote', 'user', creds.id, null, { phone: creds.phone })
    ok(res, creds)
  }),
)

/* ---------------- Marketing channels (mentors) ---------------- */
adminRoutes.get('/channels', requireScope('users'), asyncHandler(async (_req, res) => {
  const channels = await prisma.channel.findMany({
    orderBy: { createdAt: 'desc' },
    include: { owner: { select: { id: true, displayName: true, phone: true, referralCode: true } } },
  })
  const withCounts = await Promise.all(
    channels.map(async (c) => ({
      ...c,
      members: await prisma.user.count({ where: { channelCode: c.code } }),
    })),
  )
  ok(res, withCounts)
}))

adminRoutes.post(
  '/channels',
  requireScope('users'),
  validate({ body: z.object({ code: z.string().min(1).max(30), name: z.string().min(1).max(60), ownerId: z.string() }) }),
  asyncHandler(async (req, res) => {
    const owner = await prisma.user.findUnique({ where: { id: req.body.ownerId }, select: { id: true } })
    if (!owner) throw notFound('Mentor (owner) not found')
    const ch = await prisma.channel.create({ data: { code: req.body.code, name: req.body.name, ownerId: req.body.ownerId } })
    await audit(req, 'channel.create', 'channel', ch.id, null, { code: ch.code })
    ok(res, ch, 201)
  }),
)

adminRoutes.patch('/channels/:id', requireScope('users'), asyncHandler(async (req, res) => {
  const ch = await prisma.channel.update({ where: { id: req.params.id }, data: req.body })
  await audit(req, 'channel.update', 'channel', ch.id)
  ok(res, ch)
}))

adminRoutes.delete('/channels/:id', requireScope('users'), asyncHandler(async (req, res) => {
  await prisma.channel.delete({ where: { id: req.params.id } })
  await audit(req, 'channel.delete', 'channel', req.params.id)
  ok(res, { deleted: true })
}))

/* ---------------- Payment channels ---------------- */
const channelSchema = z.object({
  method: z.enum(['JAZZCASH', 'EASYPAISA', 'BANK', 'WEGARS']),
  accountNumber: z.string().min(3),
  accountTitle: z.string().min(2),
  bankName: z.string().optional(),
  instructions: z.string().optional(),
  enabled: z.boolean().optional(),
  minAmount: z.number().optional(),
  maxAmount: z.number().optional(),
  priority: z.number().optional(),
})

adminRoutes.get('/payment-channels', requireScope('config'), asyncHandler(async (_req, res) => {
  ok(res, await prisma.paymentChannel.findMany({ orderBy: [{ priority: 'desc' }, { createdAt: 'asc' }] }))
}))
adminRoutes.post('/payment-channels', requireScope('config'), validate({ body: channelSchema }), asyncHandler(async (req, res) => {
  const b = req.body
  const ch = await prisma.paymentChannel.create({ data: { ...b, minAmount: toPaisa(b.minAmount ?? 0), maxAmount: toPaisa(b.maxAmount ?? 0) } })
  await audit(req, 'channel.create', 'paymentChannel', ch.id, null, { method: ch.method })
  ok(res, ch, 201)
}))
adminRoutes.patch('/payment-channels/:id', requireScope('config'), asyncHandler(async (req, res) => {
  const b = req.body
  const data: any = { ...b }
  if (b.minAmount !== undefined) data.minAmount = toPaisa(b.minAmount)
  if (b.maxAmount !== undefined) data.maxAmount = toPaisa(b.maxAmount)
  const ch = await prisma.paymentChannel.update({ where: { id: req.params.id }, data })
  await audit(req, 'channel.update', 'paymentChannel', ch.id)
  ok(res, ch)
}))
adminRoutes.delete('/payment-channels/:id', requireScope('config'), asyncHandler(async (req, res) => {
  await prisma.paymentChannel.delete({ where: { id: req.params.id } })
  await audit(req, 'channel.delete', 'paymentChannel', req.params.id)
  ok(res, { deleted: true })
}))

/* ---------------- Deposits ---------------- */
adminRoutes.get('/deposits', requireScope('finance'), asyncHandler(async (req, res) => {
  ok(res, await deposits.adminList(req.query.status as string | undefined))
}))
adminRoutes.post('/deposits/:id/approve', requireScope('finance'), asyncHandler(async (req, res) => {
  const d = await deposits.approve(req.params.id, req.user!.id)
  await audit(req, 'deposit.approve', 'deposit', d.id, null, { amount: Number(d.amount) })
  ok(res, d)
}))
adminRoutes.post('/deposits/:id/reject', requireScope('finance'), validate({ body: z.object({ reason: z.string().min(1) }) }), asyncHandler(async (req, res) => {
  const d = await deposits.reject(req.params.id, req.user!.id, req.body.reason)
  await audit(req, 'deposit.reject', 'deposit', d.id)
  ok(res, d)
}))

/* ---------------- Withdrawals ---------------- */
adminRoutes.get('/withdrawals', requireScope('finance'), asyncHandler(async (req, res) => {
  ok(res, await withdrawals.adminList(req.query.status as string | undefined))
}))
adminRoutes.post('/withdrawals/:id/pay', requireScope('finance'), validate({ body: z.object({ trxId: z.string().min(1), payoutProofUrl: z.string().optional() }) }), asyncHandler(async (req, res) => {
  const w = await withdrawals.markPaid(req.params.id, req.user!.id, req.body.trxId, req.body.payoutProofUrl)
  await audit(req, 'withdrawal.pay', 'withdrawal', w.id, null, { trxId: w.trxId })
  ok(res, w)
}))
adminRoutes.post('/withdrawals/:id/reject', requireScope('finance'), validate({ body: z.object({ reason: z.string().min(1) }) }), asyncHandler(async (req, res) => {
  const w = await withdrawals.reject(req.params.id, req.user!.id, req.body.reason)
  await audit(req, 'withdrawal.reject', 'withdrawal', w.id)
  ok(res, w)
}))
// Assign a pending withdrawal to an agent to pay on behalf of the platform.
adminRoutes.post('/withdrawals/:id/assign', requireScope('finance'), validate({ body: z.object({ agentId: z.string() }) }), asyncHandler(async (req, res) => {
  const order = await assignPayout(req.params.id, req.body.agentId)
  await audit(req, 'withdrawal.assign', 'withdrawal', req.params.id, null, { agentId: req.body.agentId, orderId: order.id })
  ok(res, order, 201)
}))

/* ---------------- Settings ---------------- */
adminRoutes.get('/settings', requireScope('config'), asyncHandler(async (_req, res) => ok(res, await getSettings())))
adminRoutes.patch('/settings', requireScope('config'), validate({ body: settingsPatchSchema }), asyncHandler(async (req, res) => {
  const before = await getSettings()
  const next = await updateSettings(req.body ?? {})
  await audit(req, 'settings.update', 'settings', 'core', before, next)
  ok(res, next)
}))

/* ---------------- Games ---------------- */
const gameSchema = z.object({
  slug: z.string().min(2),
  title: z.string().min(1),
  emoji: z.string().min(1),
  color: z.string().min(1),
  category: z.string().min(1),
  enabled: z.boolean().optional(),
  winPct: z.number().min(0).max(100).optional(),
  tag: z.string().nullish(),
  order: z.number().optional(),
})
const gamePatchSchema = z.object({
  title: z.string().min(1).optional(),
  emoji: z.string().min(1).optional(),
  color: z.string().min(1).optional(),
  category: z.string().min(1).optional(),
  enabled: z.boolean().optional(),
  winPct: z.number().min(0).max(100).optional(),
  tag: z.string().nullish(),
  order: z.number().optional(),
})
adminRoutes.get('/games', requireScope('config'), asyncHandler(async (_req, res) => {
  const { listGamesWithStats } = await import('./games.admin.service.js')
  ok(res, await listGamesWithStats())
}))
adminRoutes.post('/games', requireScope('config'), validate({ body: gameSchema }), asyncHandler(async (req, res) => {
  const g = await prisma.game.create({ data: req.body })
  await audit(req, 'game.create', 'game', g.id)
  ok(res, g, 201)
}))
adminRoutes.patch('/games/:id', requireScope('config'), validate({ body: gamePatchSchema }), asyncHandler(async (req, res) => {
  const g = await prisma.game.update({ where: { id: req.params.id }, data: req.body })
  await audit(req, 'game.update', 'game', g.id)
  ok(res, g)
}))
adminRoutes.delete('/games/:id', requireScope('config'), asyncHandler(async (req, res) => {
  await prisma.game.delete({ where: { id: req.params.id } })
  await audit(req, 'game.delete', 'game', req.params.id)
  ok(res, { deleted: true })
}))

/* ---------------- Cashback ---------------- */
adminRoutes.get('/cashback', requireScope('config'), asyncHandler(async (_req, res) => ok(res, await prisma.cashbackTier.findMany({ orderBy: { order: 'asc' } }))))
adminRoutes.post('/cashback', requireScope('config'), asyncHandler(async (req, res) => {
  const b = req.body
  const tier = await prisma.cashbackTier.create({ data: { name: b.name ?? 'New Tier', minLoss: toPaisa(b.minLoss ?? 0), pct: b.pct ?? 5, maxClaim: toPaisa(b.maxClaim ?? 0), enabled: b.enabled ?? true, order: b.order ?? 0 } })
  ok(res, tier, 201)
}))
adminRoutes.patch('/cashback/:id', requireScope('config'), asyncHandler(async (req, res) => {
  const b = req.body; const data: any = { ...b }
  if (b.minLoss !== undefined) data.minLoss = toPaisa(b.minLoss)
  if (b.maxClaim !== undefined) data.maxClaim = toPaisa(b.maxClaim)
  ok(res, await prisma.cashbackTier.update({ where: { id: req.params.id }, data }))
}))
adminRoutes.delete('/cashback/:id', requireScope('config'), asyncHandler(async (req, res) => {
  await prisma.cashbackTier.delete({ where: { id: req.params.id } })
  ok(res, { deleted: true })
}))

/* ---------------- Offers ---------------- */
adminRoutes.get('/offers', requireScope('config'), asyncHandler(async (_req, res) => ok(res, await prisma.offer.findMany())))
adminRoutes.post('/offers', requireScope('config'), validate({ body: z.object({ title: z.string(), desc: z.string(), type: z.enum(['Deposit', 'Cashback', 'Festival', 'Referral']), reward: z.string(), enabled: z.boolean().optional() }) }), asyncHandler(async (req, res) => {
  ok(res, await prisma.offer.create({ data: { ...req.body, enabled: req.body.enabled ?? true } }), 201)
}))
adminRoutes.patch('/offers/:id', requireScope('config'), asyncHandler(async (req, res) => {
  ok(res, await prisma.offer.update({ where: { id: req.params.id }, data: req.body }))
}))
adminRoutes.delete('/offers/:id', requireScope('config'), asyncHandler(async (req, res) => {
  await prisma.offer.delete({ where: { id: req.params.id } })
  ok(res, { deleted: true })
}))

/* ---------------- Wheel prizes ---------------- */
adminRoutes.get('/wheel', requireScope('config'), asyncHandler(async (req, res) => {
  const wheel = (req.query.wheel as string) || undefined
  ok(res, await prisma.wheelPrize.findMany({
    where: wheel ? { wheel } : {},
    orderBy: { order: 'asc' },
  }))
}))
adminRoutes.post('/wheel', requireScope('config'), validate({ body: z.object({ label: z.string(), color: z.string(), weight: z.number().int().min(0), isPhysical: z.boolean().optional(), order: z.number().optional(), wheel: z.enum(['SPIN', 'DEPOSIT']).optional() }) }), asyncHandler(async (req, res) => {
  ok(res, await prisma.wheelPrize.create({ data: { ...req.body, wheel: req.body.wheel ?? 'SPIN' } }), 201)
}))
adminRoutes.patch('/wheel/:id', requireScope('config'), asyncHandler(async (req, res) => {
  ok(res, await prisma.wheelPrize.update({ where: { id: req.params.id }, data: req.body }))
}))
adminRoutes.delete('/wheel/:id', requireScope('config'), asyncHandler(async (req, res) => {
  await prisma.wheelPrize.delete({ where: { id: req.params.id } })
  ok(res, { deleted: true })
}))

/* ---------------- Manual wallet adjust ---------------- */
adminRoutes.post(
  '/wallet/adjust',
  requireScope('finance'),
  validate({ body: z.object({ userId: z.string(), bucket: z.enum(['MAIN', 'BONUS', 'COMMISSION']), amount: z.number(), reason: z.string().min(1) }) }),
  asyncHandler(async (req, res) => {
    const { userId, bucket, amount, reason } = req.body
    const target = await prisma.user.findUnique({ where: { id: userId }, select: { id: true } })
    if (!target) throw notFound('User not found')
    if (amount === 0) throw badRequest('Amount cannot be zero')
    const paisa = toPaisa(Math.abs(amount))
    const credit = amount > 0

    await runMoneyTx(async (tx) => {
      await post(tx, {
        type: 'ADMIN_ADJUST',
        referenceType: 'user',
        referenceId: userId,
        createdById: req.user!.id,
        meta: { reason },
        assertNonNegative: credit ? [] : [{ userId, bucket }],
        legs: credit
          ? [
              { account: { system: 'HOUSE' }, direction: 'DEBIT', amount: paisa },
              { account: { userId, bucket }, direction: 'CREDIT', amount: paisa },
            ]
          : [
              { account: { userId, bucket }, direction: 'DEBIT', amount: paisa },
              { account: { system: 'HOUSE' }, direction: 'CREDIT', amount: paisa },
            ],
      })
    })
    await audit(req, 'wallet.adjust', 'user', userId, null, { bucket, amount, reason })
    ok(res, { adjusted: true })
  }),
)

/* ---------------- Audit log ---------------- */
adminRoutes.get('/audit', requireScope('reports'), asyncHandler(async (req, res) => {
  const p = pageParams(req)
  const [items, total] = await Promise.all([
    prisma.auditLog.findMany({ orderBy: { createdAt: 'desc' }, skip: p.skip, take: p.limit }),
    prisma.auditLog.count(),
  ])
  ok(res, paged(items, total, p))
}))
