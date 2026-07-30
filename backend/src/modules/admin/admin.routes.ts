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
import { toPaisa, toRupees } from '../../lib/money.js'
import { badRequest, notFound, forbidden } from '../../core/errors.js'
import * as deposits from '../deposits/deposits.service.js'
import * as withdrawals from '../withdrawals/withdrawals.service.js'
import { assign as assignPayout } from '../withdrawals/payouts.service.js'
import { balances } from '../wallet/wallet.service.js'
import { settingsPatchSchema } from './settings.schema.js'
import { reportsRoutes } from './reports.routes.js'
import { commissionRoutes } from './commissions.routes.js'
import { bonusAdminRoutes } from './bonuses.admin.routes.js'
import { ledgerRoutes } from './ledger.routes.js'
import { createAgent, makeAgent, setReferralAgentActive, createMentor, makeMentor, demoteMentor, resetMentorPassword, resetAgentPassword } from './agents.admin.service.js'

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
      const asNum = Number(q)
      if (Number.isFinite(asNum) && asNum > 0 && String(asNum) === q) {
        ors.push({ playerNo: asNum })
      }
      // Legacy: last 8 of cuid
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
          playerNo: true, referralCode: true, referredById: true, agentActive: true,
          referralAgentActive: true, channelCode: true, bindCode: true, createdAt: true,
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

/** Lookup player by Game ID (playerNo) for per-player wager overrides. */
adminRoutes.get(
  '/users/by-game-id/:playerNo',
  requireScope('finance'),
  asyncHandler(async (req, res) => {
    const playerNo = Number(req.params.playerNo)
    if (!Number.isFinite(playerNo) || playerNo <= 0) throw badRequest('Invalid Game ID')
    const user = await prisma.user.findFirst({
      where: { playerNo },
      select: {
        id: true,
        displayName: true,
        phone: true,
        playerNo: true,
        status: true,
        depositWagerOverride: true,
        bonusWagerOverride: true,
      },
    })
    if (!user) throw notFound('Player not found')
    const { getEffectiveWager } = await import('../../core/wager.js')
    const wager = await getEffectiveWager(user.id)
    ok(res, { ...user, wager })
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
        playerNo: true, panelId: true, referralCode: true, referredById: true,
        agentActive: true, referralAgentActive: true, walletsFilled: true,
        adminScopes: true, channelCode: true, bindCode: true, createdAt: true,
      },
    })
    if (!user) throw notFound('User not found')
    const [wallet, deps, wds, bonuses, directRefs, commission, accounts, channels, betAgg, gamePlayRaw] =
      await Promise.all([
      balances(id),
      prisma.deposit.findMany({ where: { userId: id }, orderBy: { createdAt: 'desc' }, take: 20 }),
      prisma.withdrawal.findMany({ where: { userId: id }, orderBy: { createdAt: 'desc' }, take: 20 }),
      prisma.bonus.findMany({ where: { userId: id }, orderBy: { createdAt: 'desc' }, take: 50 }),
      prisma.referralEdge.count({ where: { ancestorId: id, level: 1 } }),
      prisma.commission.aggregate({ where: { agentId: id }, _sum: { amount: true } }),
      prisma.agentAccount.findMany({ where: { userId: id }, orderBy: { createdAt: 'desc' } }),
      // Channels belong to Mentors only — never attach to C2C merchants
      user.role === 'AGENT'
        ? Promise.resolve([])
        : prisma.channel.findMany({ where: { ownerId: id }, orderBy: { createdAt: 'desc' } }),
      prisma.gameRound.aggregate({ where: { userId: id }, _sum: { bet: true }, _count: true }),
      prisma.$queryRaw<Array<{ game: string; bet: bigint; win: bigint }>>`
        SELECT
          COALESCE(
            NULLIF(t.meta->>'game', ''),
            regexp_replace(COALESCE(t."referenceType", 'unknown'), '-(bet|win|loss|revoke)$', '')
          ) AS game,
          COALESCE(SUM(CASE WHEN t.type = 'GAME_BET' AND e.direction = 'DEBIT' THEN e.amount ELSE 0 END), 0)::bigint AS bet,
          COALESCE(SUM(CASE WHEN t.type = 'GAME_WIN' AND e.direction = 'CREDIT' THEN e.amount ELSE 0 END), 0)::bigint AS win
        FROM "LedgerEntry" e
        JOIN "LedgerAccount" a ON a.id = e."accountId"
        JOIN "LedgerTransaction" t ON t.id = e."transactionId"
        WHERE a."ownerId" = ${id}
          AND a.bucket = 'MAIN'
          AND t.type IN ('GAME_BET', 'GAME_WIN')
        GROUP BY 1
        HAVING SUM(CASE WHEN t.type = 'GAME_BET' AND e.direction = 'DEBIT' THEN e.amount ELSE 0 END) > 0
        ORDER BY bet DESC
      `,
    ])

    const gamePlayStats = gamePlayRaw.map((row) => {
      const bet = row.bet ?? 0n
      const win = row.win ?? 0n
      const betN = Number(bet)
      const winN = Number(win)
      const winLoss = win - bet
      // % of stake returned vs lost (sums to 100% when player not in profit)
      const winningPct = betN > 0 ? Math.min(100, (Math.min(winN, betN) / betN) * 100) : 0
      const lossPct = betN > 0 ? Math.max(0, ((betN - Math.min(winN, betN)) / betN) * 100) : 0
      const rtpPct = betN > 0 ? (winN / betN) * 100 : 0
      const slug = String(row.game || 'unknown')
      const name = slug
        .split(/[-_]/)
        .filter(Boolean)
        .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
        .join(' ')
      return {
        game: slug,
        gameName: name,
        bet,
        win,
        winLoss,
        winningPct: Math.round(winningPct * 10) / 10,
        lossPct: Math.round(lossPct * 10) / 10,
        rtpPct: Math.round(rtpPct * 10) / 10,
        profitable: win > bet,
      }
    })

    ok(res, {
      user: { ...user, gameId: user.playerNo ? String(user.playerNo) : user.id.slice(-8) },
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
      gamePlayStats,
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
    const data: Record<string, unknown> = { ...req.body }
    if (req.body.role && req.body.role !== existing.role) {
      if (req.body.role === 'AGENT') {
        data.playerNo = null
        data.agentActive = true
        if (existing.panelId == null) {
          const { allocatePanelId } = await import('../../lib/panelId.js')
          data.panelId = await allocatePanelId()
        }
      } else if (existing.role === 'AGENT' && existing.playerNo == null) {
        const { allocatePlayerNo } = await import('../../lib/playerNo.js')
        data.playerNo = await allocatePlayerNo()
        data.agentActive = false
      }
    }
    const user = await prisma.user.update({ where: { id }, data })
    await audit(req, 'user.patch', 'user', id, null, req.body)
    ok(res, user)
  }),
)

/** Set or clear per-player deposit/bonus wager multipliers (null = use global). */
adminRoutes.patch(
  '/users/:id/wager-overrides',
  requireScope('finance'),
  validate({
    body: z.object({
      depositWager: z.number().min(0).max(100).nullable().optional(),
      bonusWager: z.number().min(0).max(100).nullable().optional(),
    }),
  }),
  asyncHandler(async (req, res) => {
    const id = req.params.id
    const existing = await prisma.user.findUnique({ where: { id }, select: { id: true } })
    if (!existing) throw notFound('User not found')

    const data: { depositWagerOverride?: number | null; bonusWagerOverride?: number | null } = {}
    if ('depositWager' in req.body) data.depositWagerOverride = req.body.depositWager
    if ('bonusWager' in req.body) data.bonusWagerOverride = req.body.bonusWager

    const user = await prisma.user.update({
      where: { id },
      data,
      select: {
        id: true,
        displayName: true,
        phone: true,
        playerNo: true,
        depositWagerOverride: true,
        bonusWagerOverride: true,
      },
    })
    const { getEffectiveWager } = await import('../../core/wager.js')
    const wager = await getEffectiveWager(user.id)
    await audit(req, 'user.wager_overrides', 'user', id, null, req.body)
    ok(res, { ...user, wager })
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
    const existing = await prisma.user.findUnique({ where: { id: req.params.id } })
    if (!existing) throw notFound('User not found')
    const data: { role: 'PLAYER' | 'AGENT' | 'ADMIN'; playerNo?: number | null; agentActive?: boolean; panelId?: number } = {
      role: req.body.role,
    }
    if (req.body.role === 'AGENT') {
      data.playerNo = null
      data.agentActive = true
      if (existing.panelId == null) {
        const { allocatePanelId } = await import('../../lib/panelId.js')
        data.panelId = await allocatePanelId()
      }
    } else if (existing.role === 'AGENT' && existing.playerNo == null) {
      const { allocatePlayerNo } = await import('../../lib/playerNo.js')
      data.playerNo = await allocatePlayerNo()
      data.agentActive = false
    }
    const user = await prisma.user.update({ where: { id: req.params.id }, data })
    await audit(req, 'user.role', 'user', user.id, null, { role: user.role, playerNo: user.playerNo })
    ok(res, { id: user.id, role: user.role, playerNo: user.playerNo })
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
      select: {
        id: true, displayName: true, phone: true, agentActive: true, walletsFilled: true,
        panelId: true, orderSharePct: true, playerNo: true, createdAt: true,
        _count: { select: { referrals: true } },
      },
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

adminRoutes.post(
  '/agents/:id/reset-password',
  requireScope('users'),
  validate({ body: z.object({ password: z.string().min(6).max(72).optional() }) }),
  asyncHandler(async (req, res) => {
    const creds = await resetAgentPassword(req.params.id, req.body.password)
    await audit(req, 'agent.resetPassword', 'user', creds.id)
    ok(res, creds)
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
      // Approve only — merchant turns collection On afterwards
      data: { awaitingReview: false, enabled: false },
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

/** Promote existing player → Mentor (+ channel). */
adminRoutes.post(
  '/users/:id/make-mentor',
  requireScope('users'),
  validate({
    body: z.object({
      channelCode: z.string().min(1).max(30).optional(),
      channelName: z.string().min(1).max(60).optional(),
      password: z.string().min(6).max(72).optional(),
    }),
  }),
  asyncHandler(async (req, res) => {
    const result = await makeMentor(req.params.id, req.body)
    await audit(req, 'mentor.promote', 'user', result.id, null, {
      channel: result.channel?.code,
      alreadyMentor: result.alreadyMentor,
    })
    ok(res, result)
  }),
)

adminRoutes.post(
  '/users/:id/demote-mentor',
  requireScope('users'),
  asyncHandler(async (req, res) => {
    const result = await demoteMentor(req.params.id)
    await audit(req, 'mentor.demote', 'user', result.id)
    ok(res, result)
  }),
)

/* ---------------- Referral Agents (salary program — not C2C) ---------------- */
adminRoutes.get(
  '/referral-agents',
  requireScope('users'),
  asyncHandler(async (_req, res) => {
    const agents = await prisma.user.findMany({
      where: { OR: [{ referralAgentActive: true }, { walletsFilled: { gt: 0 } }] },
      orderBy: { createdAt: 'desc' },
      take: 200,
      select: {
        id: true,
        displayName: true,
        phone: true,
        playerNo: true,
        role: true,
        referralAgentActive: true,
        salaryTransferOpen: true,
        salaryApprovedPaisa: true,
        walletsFilled: true,
        createdAt: true,
        _count: { select: { referrals: true } },
      },
    })
    const withCommission = await Promise.all(
      agents.map(async (a) => {
        const c = await prisma.commission.aggregate({ where: { agentId: a.id }, _sum: { amount: true } })
        const bal = await balances(a.id)
        const commissionBal = bal.COMMISSION
        let approved = a.salaryApprovedPaisa
        if (approved < 0n) approved = 0n
        if (approved > commissionBal) approved = commissionBal
        const byLevel = await prisma.referralEdge.groupBy({
          by: ['level'],
          where: { ancestorId: a.id },
          _count: { _all: true },
        })
        const levels: Record<number, number> = { 1: 0, 2: 0, 3: 0 }
        for (const e of byLevel) levels[e.level] = e._count._all
        return {
          ...a,
          salaryApprovedPaisa: approved,
          referrals: a._count.referrals,
          commission: c._sum.amount ?? 0n,
          commissionBalance: commissionBal,
          salaryApproved: approved,
          salaryHold: commissionBal - approved,
          downline: { level3: levels[3], level2: levels[2], level1: levels[1] },
        }
      }),
    )
    ok(res, withCommission)
  }),
)

adminRoutes.post(
  '/referral-agents/:id/active',
  requireScope('users'),
  validate({ body: z.object({ active: z.boolean() }) }),
  asyncHandler(async (req, res) => {
    const result = await setReferralAgentActive(req.params.id, req.body.active)
    await audit(req, 'referralAgent.active', 'user', result.id, null, { active: result.referralAgentActive })
    ok(res, result)
  }),
)

/** Open/close "Transfer to balance" button on agent salary UI. */
adminRoutes.post(
  '/referral-agents/:id/salary-transfer',
  requireScope('users'),
  validate({ body: z.object({ open: z.boolean() }) }),
  asyncHandler(async (req, res) => {
    const id = req.params.id
    const user = await prisma.user.findUnique({
      where: { id },
      select: { id: true, referralAgentActive: true, salaryTransferOpen: true },
    })
    if (!user) throw notFound('Agent not found')
    const updated = await prisma.user.update({
      where: { id },
      data: { salaryTransferOpen: req.body.open },
      select: {
        id: true,
        salaryTransferOpen: true,
        salaryApprovedPaisa: true,
        displayName: true,
        playerNo: true,
      },
    })
    await audit(req, 'referralAgent.salaryTransfer', 'user', id, null, { open: req.body.open })
    ok(res, {
      id: updated.id,
      salaryTransferOpen: updated.salaryTransferOpen,
      salaryApproved: toRupees(updated.salaryApprovedPaisa),
    })
  }),
)

/**
 * Approve additional salary for transfer (from hold → transferable).
 * amount = rupees to add to approved pool (capped by current COMMISSION − already approved).
 */
adminRoutes.post(
  '/referral-agents/:id/salary-approve',
  requireScope('users'),
  validate({ body: z.object({ amount: z.number().positive() }) }),
  asyncHandler(async (req, res) => {
    const id = req.params.id
    const user = await prisma.user.findUnique({
      where: { id },
      select: { id: true, salaryApprovedPaisa: true, salaryTransferOpen: true, displayName: true, playerNo: true },
    })
    if (!user) throw notFound('Agent not found')
    const bal = await balances(id)
    const commissionBal = bal.COMMISSION
    let approved = user.salaryApprovedPaisa
    if (approved < 0n) approved = 0n
    if (approved > commissionBal) approved = commissionBal
    const hold = commissionBal - approved
    const want = toPaisa(req.body.amount)
    if (want <= 0n) throw badRequest('Invalid amount')
    if (hold <= 0n) throw badRequest('Nothing on hold to approve')
    const add = want > hold ? hold : want
    const next = approved + add
    await prisma.user.update({
      where: { id },
      data: { salaryApprovedPaisa: next, salaryTransferOpen: true },
    })
    await audit(req, 'referralAgent.salaryApprove', 'user', id, null, {
      amount: toRupees(add),
      approved: toRupees(next),
      hold: toRupees(commissionBal - next),
    })
    ok(res, {
      id,
      name: user.displayName,
      playerNo: user.playerNo,
      commissionBalance: toRupees(commissionBal),
      salaryTransferOpen: true,
      salaryApproved: toRupees(next),
      salaryHold: toRupees(commissionBal - next),
      approvedNow: toRupees(add),
    })
  }),
)

adminRoutes.get(
  '/referral-agents/:id/downline',
  requireScope('users'),
  asyncHandler(async (req, res) => {
    const edges = await prisma.referralEdge.findMany({
      where: { ancestorId: req.params.id, level: { lte: 3 } },
      orderBy: [{ level: 'desc' }, { descendantId: 'asc' }],
      take: 500,
      include: {
        descendant: {
          select: {
            id: true,
            displayName: true,
            phone: true,
            playerNo: true,
            status: true,
            createdAt: true,
            referralAgentActive: true,
          },
        },
      },
    })
    ok(
      res,
      edges.map((e) => ({
        level: e.level,
        id: e.descendant.id,
        name: e.descendant.displayName,
        phone: e.descendant.phone,
        playerNo: e.descendant.playerNo,
        status: e.descendant.status,
        joinedAt: e.descendant.createdAt,
        isReferralAgent: e.descendant.referralAgentActive,
      })),
    )
  }),
)

/* ---------------- Mentors ---------------- */
adminRoutes.get(
  '/mentors',
  requireScope('users'),
  asyncHandler(async (_req, res) => {
    const mentors = await prisma.user.findMany({
      where: { role: 'MENTOR' },
      orderBy: { createdAt: 'desc' },
      select: { id: true, displayName: true, phone: true, playerNo: true, referralCode: true, createdAt: true, status: true },
    })
    const rows = await Promise.all(
      mentors.map(async (m) => {
        const channels = await prisma.channel.findMany({ where: { ownerId: m.id } })
        const bal = await balances(m.id)
        const c = await prisma.commission.aggregate({ where: { agentId: m.id }, _sum: { amount: true } })
        return {
          ...m,
          channels,
          commission: c._sum.amount ?? 0n,
          commissionBalance: bal.COMMISSION,
        }
      }),
    )
    ok(res, rows)
  }),
)

adminRoutes.post(
  '/mentors',
  requireScope('users'),
  validate({
    body: z.object({
      phone: z.string().min(7).max(20),
      displayName: z.string().min(2).max(40),
      password: z.string().min(6).max(72).optional(),
      channelCode: z.string().min(1).max(30),
      channelName: z.string().min(1).max(60),
    }),
  }),
  asyncHandler(async (req, res) => {
    const creds = await createMentor(req.body)
    await audit(req, 'mentor.create', 'user', creds.id, null, { phone: creds.phone, channel: creds.channel.code })
    ok(res, creds, 201)
  }),
)

adminRoutes.post(
  '/mentors/:id/reset-password',
  requireScope('users'),
  validate({ body: z.object({ password: z.string().min(6).max(72).optional() }) }),
  asyncHandler(async (req, res) => {
    const creds = await resetMentorPassword(req.params.id, req.body.password)
    await audit(req, 'mentor.resetPassword', 'user', creds.id)
    ok(res, creds)
  }),
)

/**
 * Mentor channel downline — all members + referral agents under mentor's channels.
 * Includes deposit / withdraw / win-loss / commission paid to this mentor (sorted high → low).
 */
adminRoutes.get(
  '/mentors/:id/downline',
  requireScope('users'),
  asyncHandler(async (req, res) => {
    const mentorId = req.params.id
    const mentor = await prisma.user.findUnique({
      where: { id: mentorId },
      select: { id: true, role: true, displayName: true },
    })
    if (!mentor) throw notFound('Mentor not found')

    const channels = await prisma.channel.findMany({
      where: { ownerId: mentorId },
      select: { id: true, code: true, name: true, enabled: true },
    })
    const codes = channels.map((c) => c.code)
    const s = await getSettings()
    const rates = {
      l1: s.mentorCommissionL1,
      l2: s.mentorCommissionL2,
      l3: s.mentorCommissionL3,
    }

    if (codes.length === 0) {
      ok(res, {
        mentorId,
        mentorName: mentor.displayName,
        rates,
        channels: [],
        items: [],
        totals: { members: 0, agents: 0, deposited: 0, withdrawn: 0, winLoss: 0, commission: 0 },
      })
      return
    }

    const q = String(req.query.q || '').trim()
    const onlyAgents = req.query.agents === 'true'
    const qAsNo = /^\d+$/.test(q) ? Number(q) : NaN

    const users = await prisma.user.findMany({
      where: {
        channelCode: { in: codes },
        ...(onlyAgents ? { referralAgentActive: true } : {}),
        ...(q
          ? {
              OR: [
                { phone: { contains: q } },
                { displayName: { contains: q, mode: 'insensitive' } },
                { id: { contains: q } },
                ...(Number.isFinite(qAsNo) ? [{ playerNo: qAsNo }] : []),
              ],
            }
          : {}),
      },
      orderBy: { createdAt: 'desc' },
      take: 500,
      select: {
        id: true,
        playerNo: true,
        displayName: true,
        phone: true,
        role: true,
        status: true,
        referralAgentActive: true,
        channelCode: true,
        createdAt: true,
      },
    })

    const ids = users.map((u) => u.id)
    if (ids.length === 0) {
      ok(res, {
        mentorId,
        mentorName: mentor.displayName,
        rates,
        channels,
        items: [],
        totals: { members: 0, agents: 0, deposited: 0, withdrawn: 0, winLoss: 0, commission: 0 },
      })
      return
    }

    const [deps, wds, bets, commissions, edges] = await Promise.all([
      prisma.deposit.groupBy({
        by: ['userId'],
        where: { userId: { in: ids }, status: 'APPROVED' },
        _sum: { amount: true },
      }),
      prisma.withdrawal.groupBy({
        by: ['userId'],
        where: { userId: { in: ids }, status: 'PAID' },
        _sum: { amount: true },
      }),
      prisma.gameRound.groupBy({
        by: ['userId'],
        where: { userId: { in: ids } },
        _sum: { bet: true, payout: true },
      }),
      prisma.commission.groupBy({
        by: ['sourceUserId'],
        where: { agentId: mentorId, sourceUserId: { in: ids } },
        _sum: { amount: true },
      }),
      prisma.referralEdge.findMany({
        where: { ancestorId: mentorId, descendantId: { in: ids }, level: { lte: 3 } },
        select: { descendantId: true, level: true },
      }),
    ])

    const depMap = new Map(deps.map((d) => [d.userId, d._sum.amount ?? 0n]))
    const wdMap = new Map(wds.map((w) => [w.userId, w._sum.amount ?? 0n]))
    const betMap = new Map(bets.map((b) => [b.userId, { bet: b._sum.bet ?? 0n, payout: b._sum.payout ?? 0n }]))
    const commMap = new Map(commissions.map((c) => [c.sourceUserId, c._sum.amount ?? 0n]))
    const levelMap = new Map(edges.map((e) => [e.descendantId, e.level]))

    const items = users.map((u) => {
      const deposited = depMap.get(u.id) ?? 0n
      const withdrawn = wdMap.get(u.id) ?? 0n
      const round = betMap.get(u.id) ?? { bet: 0n, payout: 0n }
      const winLoss = round.payout - round.bet
      const commission = commMap.get(u.id) ?? 0n
      const level = levelMap.get(u.id) ?? 1
      const ratePct = level === 1 ? rates.l1 : level === 2 ? rates.l2 : rates.l3
      const gameId = u.playerNo != null ? String(u.playerNo) : u.id.slice(-8)
      return {
        id: u.id,
        gameId,
        playerNo: u.playerNo,
        name: u.displayName,
        phone: u.phone,
        role: u.role,
        status: u.status,
        kind: u.referralAgentActive ? 'AGENT' : 'MEMBER',
        isReferralAgent: u.referralAgentActive,
        channelCode: u.channelCode,
        level,
        ratePct,
        joinedAt: u.createdAt,
        deposited: toRupees(deposited),
        withdrawn: toRupees(withdrawn),
        wagered: toRupees(round.bet),
        won: toRupees(round.payout),
        winLoss: toRupees(winLoss),
        commission: toRupees(commission),
      }
    })

    items.sort((a, b) => b.commission - a.commission || b.deposited - a.deposited)

    const totals = {
      members: items.length,
      agents: items.filter((i) => i.isReferralAgent).length,
      deposited: items.reduce((s, i) => s + i.deposited, 0),
      withdrawn: items.reduce((s, i) => s + i.withdrawn, 0),
      winLoss: items.reduce((s, i) => s + i.winLoss, 0),
      commission: items.reduce((s, i) => s + i.commission, 0),
    }

    ok(res, { mentorId, mentorName: mentor.displayName, rates, channels, items, totals })
  }),
)

adminRoutes.post(
  '/agents/:id/order-share',
  requireScope('users'),
  validate({ body: z.object({ orderSharePct: z.number().int().min(0).max(1000) }) }),
  asyncHandler(async (req, res) => {
    const user = await prisma.user.findUnique({ where: { id: req.params.id } })
    if (!user || user.role !== 'AGENT') throw notFound('C2C merchant not found')
    const updated = await prisma.user.update({
      where: { id: req.params.id },
      data: { orderSharePct: req.body.orderSharePct },
      select: { id: true, orderSharePct: true, panelId: true, displayName: true },
    })
    await audit(req, 'agent.orderShare', 'user', updated.id, null, { orderSharePct: updated.orderSharePct })
    ok(res, updated)
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
    const owner = await prisma.user.findUnique({ where: { id: req.body.ownerId }, select: { id: true, role: true } })
    if (!owner) throw notFound('Mentor (owner) not found')
    if (owner.role === 'AGENT') throw badRequest('C2C merchants cannot own marketing channels')
    if (owner.role !== 'MENTOR' && owner.role !== 'ADMIN') {
      await prisma.user.update({ where: { id: owner.id }, data: { role: 'MENTOR' } })
    }
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

/* ---------------- Payment channels (C2C float bank accounts) ---------------- */
const channelSchema = z.object({
  method: z.enum(['BANK']).default('BANK'),
  accountNumber: z.string().min(3),
  accountTitle: z.string().min(2),
  bankName: z.string().optional(),
  instructions: z.string().optional(),
  enabled: z.boolean().optional(),
  agentFloat: z.boolean().optional(),
  minAmount: z.number().optional(),
  maxAmount: z.number().optional(),
  priority: z.number().optional(),
})

adminRoutes.get('/payment-channels', requireScope('finance'), asyncHandler(async (_req, res) => {
  ok(
    res,
    await prisma.paymentChannel.findMany({
      where: { agentFloat: true },
      orderBy: [{ priority: 'desc' }, { createdAt: 'asc' }],
    }),
  )
}))
adminRoutes.post('/payment-channels', requireScope('finance'), validate({ body: channelSchema }), asyncHandler(async (req, res) => {
  const b = req.body
  const ch = await prisma.paymentChannel.create({
    data: {
      method: 'BANK',
      accountNumber: b.accountNumber,
      accountTitle: b.accountTitle,
      bankName: b.bankName,
      instructions: b.instructions ?? 'Send to this bank account for C2C float top-up, then submit TID in merchant panel.',
      enabled: b.enabled ?? true,
      agentFloat: true,
      minAmount: toPaisa(b.minAmount ?? 10000),
      maxAmount: toPaisa(b.maxAmount ?? 1000000),
      priority: b.priority ?? 0,
    },
  })
  await audit(req, 'channel.create', 'paymentChannel', ch.id, null, { method: ch.method, agentFloat: true })
  ok(res, ch, 201)
}))

/** C2C merchant bank top-ups — separate from player game deposits. */
adminRoutes.get('/payment-channels/topups', requireScope('finance'), asyncHandler(async (_req, res) => {
  const rows = await prisma.deposit.findMany({
    where: {
      user: { role: 'AGENT' },
      channel: { agentFloat: true },
      agentAccountId: null,
    },
    orderBy: { createdAt: 'desc' },
    take: 200,
    include: {
      user: {
        select: {
          displayName: true,
          phone: true,
          panelId: true,
        },
      },
      channel: {
        select: {
          bankName: true,
          accountNumber: true,
          accountTitle: true,
        },
      },
    },
  })
  ok(res, rows)
}))

adminRoutes.post(
  '/payment-channels/topups/:id/approve',
  requireScope('finance'),
  asyncHandler(async (req, res) => {
    const topup = await prisma.deposit.findFirst({
      where: {
        id: req.params.id,
        user: { role: 'AGENT' },
        channel: { agentFloat: true },
        agentAccountId: null,
      },
    })
    if (!topup) throw notFound('C2C float top-up not found')
    const approved = await deposits.approve(topup.id, req.user!.id)
    await audit(req, 'c2cFloat.approve', 'deposit', topup.id, null, {
      amount: toRupees(topup.amount),
      merchantId: topup.userId,
    })
    ok(res, approved)
  }),
)

adminRoutes.post(
  '/payment-channels/topups/:id/reject',
  requireScope('finance'),
  validate({ body: z.object({ reason: z.string().min(2).max(200).optional() }) }),
  asyncHandler(async (req, res) => {
    const topup = await prisma.deposit.findFirst({
      where: {
        id: req.params.id,
        user: { role: 'AGENT' },
        channel: { agentFloat: true },
        agentAccountId: null,
      },
    })
    if (!topup) throw notFound('C2C float top-up not found')
    const rejected = await deposits.reject(
      topup.id,
      req.user!.id,
      req.body.reason || 'Bank transfer not received',
    )
    await audit(req, 'c2cFloat.reject', 'deposit', topup.id, null, {
      reason: req.body.reason || 'Bank transfer not received',
      merchantId: topup.userId,
    })
    ok(res, rejected)
  }),
)

adminRoutes.patch('/payment-channels/:id', requireScope('finance'), asyncHandler(async (req, res) => {
  const b = req.body
  const data: any = { ...b }
  if (b.minAmount !== undefined) data.minAmount = toPaisa(b.minAmount)
  if (b.maxAmount !== undefined) data.maxAmount = toPaisa(b.maxAmount)
  if (data.method && data.method !== 'BANK') delete data.method
  data.agentFloat = true
  const ch = await prisma.paymentChannel.update({ where: { id: req.params.id }, data })
  await audit(req, 'channel.update', 'paymentChannel', ch.id)
  ok(res, ch)
}))
adminRoutes.delete('/payment-channels/:id', requireScope('finance'), asyncHandler(async (req, res) => {
  await prisma.paymentChannel.delete({ where: { id: req.params.id } })
  await audit(req, 'channel.delete', 'paymentChannel', req.params.id)
  ok(res, { deleted: true })
}))

/* ---------------- Deposits (C2C merchants handle; admin can Manual Done rejected) ---------------- */
adminRoutes.get('/deposits', requireScope('finance'), asyncHandler(async (req, res) => {
  ok(res, await deposits.adminList(req.query.status as string | undefined))
}))
adminRoutes.post('/deposits/:id/approve', requireScope('finance'), asyncHandler(async (_req, _res) => {
  throw forbidden('Use Manual Done on rejected C2C deposits, or have the merchant confirm in C2C panel.')
}))
adminRoutes.post('/deposits/:id/reject', requireScope('finance'), asyncHandler(async (_req, _res) => {
  throw forbidden('Deposits are handled by C2C merchants. Admin cannot reject deposits.')
}))
/** Merchant rejected but player proved payment — credit player + cut merchant float like C2C confirm. */
adminRoutes.post(
  '/deposits/:id/manual-done',
  requireScope('finance'),
  asyncHandler(async (req, res) => {
    const dep = await deposits.adminManualDoneDeposit(req.params.id, req.user!.id)
    await audit(req, 'deposit.manualDone', 'deposit', dep.id, null, {
      orderNo: dep.collectionOrder?.orderNo,
      amount: dep.amount,
    })
    ok(res, dep)
  }),
)

/* ---------------- Withdrawals ---------------- */
adminRoutes.get('/withdrawals', requireScope('finance'), asyncHandler(async (req, res) => {
  ok(res, await withdrawals.adminList(req.query.status as string | undefined))
}))
adminRoutes.get('/withdrawals/stats', requireScope('finance'), asyncHandler(async (_req, res) => {
  ok(res, await withdrawals.adminHoldStats())
}))
adminRoutes.post(
  '/withdrawals/release-c2c',
  requireScope('finance'),
  validate({
    body: z.object({
      count: z.number().int().positive().optional(),
      ids: z.array(z.string().min(1)).optional(),
    }).refine((b) => (b.count != null && b.count > 0) || (b.ids && b.ids.length > 0), {
      message: 'Provide count or ids',
    }),
  }),
  asyncHandler(async (req, res) => {
    const result = await withdrawals.releaseToC2c(req.body)
    await audit(req, 'withdrawal.release_c2c', 'withdrawal', undefined, null, result)
    ok(res, result)
  }),
)
adminRoutes.post(
  '/withdrawals/recall-c2c',
  requireScope('finance'),
  validate({
    body: z.object({
      count: z.number().int().positive().optional(),
      ids: z.array(z.string().min(1)).optional(),
    }).refine((b) => (b.count != null && b.count > 0) || (b.ids && b.ids.length > 0), {
      message: 'Provide count or ids',
    }),
  }),
  asyncHandler(async (req, res) => {
    const result = await withdrawals.recallFromC2c(req.body)
    await audit(req, 'withdrawal.recall_c2c', 'withdrawal', undefined, null, result)
    ok(res, result)
  }),
)
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

/* ---------------- Crash-family ops (crash / aviator / aero-x / double-crash) ---------------- */
const crashForceSchema = z.object({
  mult: z.number().min(1).max(100).optional(),
  crashPoint: z.number().min(1).max(100).optional(),
}).refine((b) => (b.mult ?? b.crashPoint) != null, { message: 'mult or crashPoint required' })

function crashFamilyAdmin(slug: 'crash' | 'aviator' | 'aero-x' | 'double-crash') {
  const load = async () => {
    if (slug === 'crash') {
      const svc = await import('../games/crash.service.js')
      const { kickCrashRealtime } = await import('../games/crash.realtime.js')
      return { svc, kick: kickCrashRealtime }
    }
    if (slug === 'aviator') {
      const svc = await import('../games/aviator.service.js')
      const { kickAviatorRealtime } = await import('../games/aviator.realtime.js')
      return { svc, kick: kickAviatorRealtime }
    }
    if (slug === 'aero-x') {
      const svc = await import('../games/aeroX.service.js')
      const { kickAeroXRealtime } = await import('../games/aeroX.realtime.js')
      return { svc, kick: kickAeroXRealtime }
    }
    const svc = await import('../games/doubleCrash.service.js')
    const { kickDoubleCrashRealtime } = await import('../games/doubleCrash.realtime.js')
    return { svc, kick: kickDoubleCrashRealtime }
  }

  adminRoutes.get(
    `/games/${slug}/live`,
    requireScope('config'),
    asyncHandler(async (_req, res) => {
      const { svc, kick } = await load()
      const data = await svc.getLiveAdmin()
      kick()
      ok(res, data)
    }),
  )
  adminRoutes.post(
    `/games/${slug}/force`,
    requireScope('config'),
    validate({ body: crashForceSchema }),
    asyncHandler(async (req, res) => {
      const { svc, kick } = await load()
      const point = req.body.mult ?? req.body.crashPoint
      const data = await svc.forceNextCrashPoint(point)
      await audit(req, `${slug}.force`, 'game', slug, null, {
        mult: point,
        applied: data.applied,
      })
      kick()
      ok(res, data)
    }),
  )
  adminRoutes.post(
    `/games/${slug}/force/clear`,
    requireScope('config'),
    asyncHandler(async (req, res) => {
      const { svc, kick } = await load()
      const data = await svc.clearForce()
      await audit(req, `${slug}.force.clear`, 'game', slug)
      kick()
      ok(res, data)
    }),
  )
}

crashFamilyAdmin('crash')
crashFamilyAdmin('aviator')
crashFamilyAdmin('aero-x')
crashFamilyAdmin('double-crash')

/* ---------------- WinGo Lottery ops ---------------- */
adminRoutes.get(
  '/games/wingo-lottery/live',
  requireScope('config'),
  asyncHandler(async (_req, res) => {
    const lottery = await import('../games/wingoLottery.service.js')
    const { kickLotteryRealtime } = await import('../games/wingoLottery.realtime.js')
    const data = await lottery.getLiveAdmin()
    kickLotteryRealtime()
    ok(res, data)
  }),
)
adminRoutes.post(
  '/games/wingo-lottery/force',
  requireScope('config'),
  validate({ body: z.object({ result: z.number().int().min(0).max(9) }) }),
  asyncHandler(async (req, res) => {
    const lottery = await import('../games/wingoLottery.service.js')
    const { kickLotteryRealtime } = await import('../games/wingoLottery.realtime.js')
    const data = await lottery.forceNextResult(req.body.result)
    await audit(req, 'lottery.force', 'game', 'wingo-lottery', null, { result: req.body.result, applied: data.applied })
    kickLotteryRealtime()
    ok(res, data)
  }),
)
adminRoutes.post(
  '/games/wingo-lottery/force/clear',
  requireScope('config'),
  asyncHandler(async (req, res) => {
    const lottery = await import('../games/wingoLottery.service.js')
    const { kickLotteryRealtime } = await import('../games/wingoLottery.realtime.js')
    const data = await lottery.clearForce()
    await audit(req, 'lottery.force.clear', 'game', 'wingo-lottery')
    kickLotteryRealtime()
    ok(res, data)
  }),
)

/* ---------------- Roulette ops ---------------- */
adminRoutes.get(
  '/games/roulette/live',
  requireScope('config'),
  asyncHandler(async (_req, res) => {
    const roulette = await import('../games/roulette.service.js')
    const { kickRouletteRealtime } = await import('../games/roulette.realtime.js')
    const data = await roulette.getLiveAdmin()
    kickRouletteRealtime()
    ok(res, data)
  }),
)
adminRoutes.post(
  '/games/roulette/force',
  requireScope('config'),
  validate({ body: z.object({ result: z.number().int().min(0).max(36) }) }),
  asyncHandler(async (req, res) => {
    const roulette = await import('../games/roulette.service.js')
    const { kickRouletteRealtime } = await import('../games/roulette.realtime.js')
    const data = await roulette.forceNextResult(req.body.result)
    await audit(req, 'roulette.force', 'game', 'roulette', null, {
      result: req.body.result,
      applied: data.applied,
    })
    kickRouletteRealtime()
    ok(res, data)
  }),
)
adminRoutes.post(
  '/games/roulette/force/clear',
  requireScope('config'),
  asyncHandler(async (req, res) => {
    const roulette = await import('../games/roulette.service.js')
    const { kickRouletteRealtime } = await import('../games/roulette.realtime.js')
    const data = await roulette.clearForce()
    await audit(req, 'roulette.force.clear', 'game', 'roulette')
    kickRouletteRealtime()
    ok(res, data)
  }),
)

/* ---------------- WinGo force ---------------- */
adminRoutes.get(
  '/games/wingo/live',
  requireScope('config'),
  asyncHandler(async (req, res) => {
    const mode = typeof req.query.mode === 'string' ? req.query.mode : '30s'
    const wingo = await import('../games/wingo.service.js')
    const { kickWingoRealtime } = await import('../games/wingo.realtime.js')
    const data = await wingo.getLiveAdmin(mode)
    kickWingoRealtime(mode)
    ok(res, data)
  }),
)
adminRoutes.post(
  '/games/wingo/force',
  requireScope('config'),
  validate({
    body: z.object({
      result: z.number().int().min(0).max(9),
      mode: z.enum(['30s', '1min', '3min', '5min']).default('30s'),
    }),
  }),
  asyncHandler(async (req, res) => {
    const wingo = await import('../games/wingo.service.js')
    const { kickWingoRealtime } = await import('../games/wingo.realtime.js')
    const data = await wingo.forceNextResult(req.body.mode, req.body.result)
    await audit(req, 'wingo.force', 'game', 'wingo', null, {
      result: req.body.result,
      mode: req.body.mode,
      applied: data.applied,
    })
    kickWingoRealtime(req.body.mode)
    ok(res, data)
  }),
)
adminRoutes.post(
  '/games/wingo/force/clear',
  requireScope('config'),
  validate({ body: z.object({ mode: z.enum(['30s', '1min', '3min', '5min']).default('30s') }) }),
  asyncHandler(async (req, res) => {
    const wingo = await import('../games/wingo.service.js')
    const { kickWingoRealtime } = await import('../games/wingo.realtime.js')
    const mode = req.body.mode ?? '30s'
    const data = await wingo.clearForce(mode)
    await audit(req, 'wingo.force.clear', 'game', 'wingo', null, { mode })
    kickWingoRealtime(mode)
    ok(res, data)
  }),
)

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
