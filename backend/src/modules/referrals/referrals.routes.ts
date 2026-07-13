import { Router } from 'express'
import { authenticate } from '../../middleware/authenticate.js'
import { asyncHandler } from '../../lib/asyncHandler.js'
import { ok } from '../../lib/respond.js'
import { prisma } from '../../lib/prisma.js'
import { getSettings } from '../../core/settings.js'

export const referralRoutes = Router()

referralRoutes.use(authenticate)

referralRoutes.get(
  '/',
  asyncHandler(async (req, res) => {
    const userId = req.user!.id
    const me = await prisma.user.findUniqueOrThrow({
      where: { id: userId },
      select: { referralCode: true, agentActive: true, walletsFilled: true, channelCode: true },
    })
    const s = await getSettings()

    // A mentor shares under the channel they own; others under the channel they joined.
    const ownedChannel = await prisma.channel.findFirst({ where: { ownerId: userId, enabled: true }, select: { code: true } })
    const channelCode = ownedChannel?.code ?? me.channelCode ?? ''
    const base = (s.shareLink || '').split('?')[0] || 'http://localhost:5174/'
    const params = new URLSearchParams()
    if (channelCode) params.set('channel', channelCode)
    params.set('shareCode', me.referralCode)
    params.set('bindCode', me.referralCode)
    const shareUrl = `${base}?${params.toString()}`

    const edges = await prisma.referralEdge.groupBy({
      by: ['level'],
      where: { ancestorId: userId },
      _count: true,
    })
    const byLevel = { 1: 0, 2: 0, 3: 0 } as Record<number, number>
    for (const e of edges) byLevel[e.level] = e._count

    const direct = await prisma.referralEdge.findMany({
      where: { ancestorId: userId, level: 1 },
      include: { descendant: { select: { displayName: true, phone: true, createdAt: true } } },
      take: 100,
      orderBy: { id: 'desc' },
    })

    const commission = await prisma.commission.aggregate({ where: { agentId: userId }, _sum: { amount: true } })

    ok(res, {
      referralCode: me.referralCode,
      channelCode,
      shareUrl,
      shareLink: shareUrl,
      agentActive: me.agentActive,
      walletsFilled: me.walletsFilled,
      walletsRequired: s.walletsRequired,
      counts: { level1: byLevel[1], level2: byLevel[2], level3: byLevel[3] },
      commissionRates: { l1: s.commissionL1, l2: s.commissionL2, l3: s.commissionL3 },
      totalCommission: commission._sum.amount ?? 0n,
      direct: direct.map((d) => ({ name: d.descendant.displayName, phone: d.descendant.phone, joined: d.descendant.createdAt })),
    })
  }),
)

function maskName(name: string): string {
  if (name.length <= 2) return name[0] + '***'
  return name[0] + '*****' + name[name.length - 1]
}

referralRoutes.get(
  '/ranking',
  asyncHandler(async (_req, res) => {
    const since = new Date()
    since.setDate(since.getDate() - 7)

    const rows = await prisma.commission.groupBy({
      by: ['agentId'],
      where: { createdAt: { gte: since } },
      _sum: { amount: true },
    })
    const sorted = rows
      .sort((a, b) => Number(b._sum.amount ?? 0n) - Number(a._sum.amount ?? 0n))
      .slice(0, 10)

    const agents = await prisma.user.findMany({
      where: { id: { in: sorted.map((r) => r.agentId) } },
      select: { id: true, displayName: true },
    })
    const nameMap = Object.fromEntries(agents.map((a) => [a.id, a.displayName]))

    ok(res, sorted.map((r, i) => ({
      rank: i + 1,
      name: maskName(nameMap[r.agentId] ?? 'User'),
      amount: Number(r._sum.amount ?? 0n) / 100,
    })))
  }),
)

referralRoutes.get(
  '/earnings',
  asyncHandler(async (req, res) => {
    const userId = req.user!.id
    const since = new Date()
    since.setHours(0, 0, 0, 0)

    const today = await prisma.commission.aggregate({
      where: { agentId: userId, createdAt: { gte: since } },
      _sum: { amount: true },
    })

    const items = await prisma.commission.findMany({
      where: { agentId: userId },
      orderBy: { createdAt: 'desc' },
      take: 50,
      include: { sourceUser: { select: { displayName: true } } },
    })

    ok(res, {
      todayEarnings: Number(today._sum.amount ?? 0n) / 100,
      items: items.map((c) => ({
        id: c.id,
        level: c.level,
        amount: Number(c.amount) / 100,
        rateBps: c.rateBps,
        from: c.sourceUser?.displayName ?? 'User',
        time: c.createdAt,
      })),
    })
  }),
)
