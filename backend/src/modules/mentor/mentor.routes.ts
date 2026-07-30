import { Router } from 'express'
import { authenticate } from '../../middleware/authenticate.js'
import { authorize } from '../../middleware/authorize.js'
import { asyncHandler } from '../../lib/asyncHandler.js'
import { ok } from '../../lib/respond.js'
import { prisma } from '../../lib/prisma.js'
import { forbidden, notFound } from '../../core/errors.js'
import { balances } from '../wallet/wallet.service.js'
import { toRupees } from '../../lib/money.js'
import { getSettings } from '../../core/settings.js'

export const mentorRoutes = Router()

mentorRoutes.use(authenticate, authorize('MENTOR', 'ADMIN'))

async function mentorChannel(userId: string, role: string) {
  if (role === 'ADMIN') {
    const ch = await prisma.channel.findFirst({ orderBy: { createdAt: 'asc' } })
    return ch
  }
  const ch = await prisma.channel.findFirst({ where: { ownerId: userId }, orderBy: { createdAt: 'asc' } })
  if (!ch) throw forbidden('No channel assigned')
  return ch
}

mentorRoutes.get(
  '/summary',
  asyncHandler(async (req, res) => {
    const ch = await mentorChannel(req.user!.id, req.user!.role)
    if (!ch) throw notFound('No channel')
    const bal = await balances(req.user!.id)
    const members = await prisma.user.count({ where: { channelCode: ch.code } })
    const agents = await prisma.user.count({
      where: { channelCode: ch.code, referralAgentActive: true },
    })
    const weekAgo = new Date(Date.now() - 7 * 24 * 3600 * 1000)
    const [earnedAll, earnedWeek] = await Promise.all([
      prisma.commission.aggregate({ where: { agentId: req.user!.id, amount: { gt: 0 } }, _sum: { amount: true } }),
      prisma.commission.aggregate({
        where: { agentId: req.user!.id, amount: { gt: 0 }, createdAt: { gte: weekAgo } },
        _sum: { amount: true },
      }),
    ])
    const s = await getSettings()
    ok(res, {
      channel: { id: ch.id, code: ch.code, name: ch.name, enabled: ch.enabled },
      members,
      referralAgents: agents,
      commissionBalance: toRupees(bal.COMMISSION),
      earnedTotal: toRupees(earnedAll._sum.amount ?? 0n),
      earnedWeek: toRupees(earnedWeek._sum.amount ?? 0n),
      rates: {
        l1: s.mentorCommissionL1,
        l2: s.mentorCommissionL2,
        l3: s.mentorCommissionL3,
      },
      sharePath: `/?channel=${encodeURIComponent(ch.code)}`,
    })
  }),
)

mentorRoutes.get(
  '/members',
  asyncHandler(async (req, res) => {
    const ch = await mentorChannel(req.user!.id, req.user!.role)
    if (!ch) throw notFound('No channel')
    const q = String(req.query.q || '').trim()
    const onlyAgents = req.query.agents === 'true'
    const qAsNo = /^\d+$/.test(q) ? Number(q) : NaN
    const users = await prisma.user.findMany({
      where: {
        channelCode: ch.code,
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
      take: 200,
      select: {
        id: true,
        playerNo: true,
        displayName: true,
        phone: true,
        role: true,
        status: true,
        referralAgentActive: true,
        createdAt: true,
        referredById: true,
      },
    })

    const items = await Promise.all(
      users.map(async (u) => {
        const [dep, wd] = await Promise.all([
          prisma.deposit.aggregate({ where: { userId: u.id, status: 'APPROVED' }, _sum: { amount: true } }),
          prisma.withdrawal.aggregate({ where: { userId: u.id, status: 'PAID' }, _sum: { amount: true } }),
        ])
        const gameId = u.playerNo != null ? String(u.playerNo) : u.id.slice(-8)
        return {
          id: u.id,
          gameId,
          playerNo: u.playerNo,
          name: u.displayName,
          phone: u.phone,
          role: u.role,
          status: u.status,
          isReferralAgent: u.referralAgentActive,
          joinedAt: u.createdAt,
          deposited: toRupees(dep._sum.amount ?? 0n),
          withdrawn: toRupees(wd._sum.amount ?? 0n),
        }
      }),
    )
    ok(res, { items, channelCode: ch.code })
  }),
)

mentorRoutes.get(
  '/reports/deposits',
  asyncHandler(async (req, res) => {
    const ch = await mentorChannel(req.user!.id, req.user!.role)
    if (!ch) throw notFound('No channel')
    const memberIds = (
      await prisma.user.findMany({ where: { channelCode: ch.code }, select: { id: true } })
    ).map((u) => u.id)
    const rows = await prisma.deposit.findMany({
      where: { userId: { in: memberIds } },
      orderBy: { createdAt: 'desc' },
      take: 100,
      include: { user: { select: { displayName: true, phone: true } } },
    })
    ok(
      res,
      rows.map((d) => ({
        id: d.id,
        amount: toRupees(d.amount),
        status: d.status,
        at: d.createdAt,
        user: d.user.displayName,
        phone: d.user.phone,
      })),
    )
  }),
)

mentorRoutes.get(
  '/reports/withdrawals',
  asyncHandler(async (req, res) => {
    const ch = await mentorChannel(req.user!.id, req.user!.role)
    if (!ch) throw notFound('No channel')
    const memberIds = (
      await prisma.user.findMany({ where: { channelCode: ch.code }, select: { id: true } })
    ).map((u) => u.id)
    const rows = await prisma.withdrawal.findMany({
      where: { userId: { in: memberIds } },
      orderBy: { createdAt: 'desc' },
      take: 100,
      include: { user: { select: { displayName: true, phone: true } } },
    })
    ok(
      res,
      rows.map((w) => ({
        id: w.id,
        amount: toRupees(w.amount),
        status: w.status,
        at: w.createdAt,
        user: w.user.displayName,
        phone: w.user.phone,
      })),
    )
  }),
)

mentorRoutes.get(
  '/reports/bets',
  asyncHandler(async (req, res) => {
    const ch = await mentorChannel(req.user!.id, req.user!.role)
    if (!ch) throw notFound('No channel')
    const memberIds = (
      await prisma.user.findMany({ where: { channelCode: ch.code }, select: { id: true } })
    ).map((u) => u.id)
    const rows = await prisma.gameRound.findMany({
      where: { userId: { in: memberIds } },
      orderBy: { createdAt: 'desc' },
      take: 100,
      include: { user: { select: { displayName: true, phone: true } } },
    })
    ok(
      res,
      rows.map((r) => ({
        id: r.id,
        game: r.gameSlug,
        bet: toRupees(r.bet),
        payout: toRupees(r.payout),
        state: r.state,
        at: r.createdAt,
        user: r.user.displayName,
        phone: r.user.phone,
      })),
    )
  }),
)

mentorRoutes.get(
  '/commissions',
  asyncHandler(async (req, res) => {
    const rows = await prisma.commission.findMany({
      where: { agentId: req.user!.id },
      orderBy: { createdAt: 'desc' },
      take: 100,
      include: { sourceUser: { select: { displayName: true, phone: true } } },
    })
    ok(
      res,
      rows.map((c) => ({
        id: c.id,
        level: c.level,
        amount: toRupees(c.amount),
        status: c.status,
        at: c.createdAt,
        source: c.sourceUser.displayName,
        sourcePhone: c.sourceUser.phone,
      })),
    )
  }),
)
