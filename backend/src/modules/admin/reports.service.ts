import { prisma } from '../../lib/prisma.js'

function dayKey(d: Date): string {
  return d.toISOString().slice(0, 10)
}

export async function financial(from?: Date, to?: Date) {
  const createdAt = from || to ? { gte: from, lte: to } : undefined
  const [dep, wd, bonus, commission] = await Promise.all([
    prisma.deposit.aggregate({ where: { status: 'APPROVED', ...(createdAt ? { processedAt: createdAt } : {}) }, _sum: { amount: true }, _count: true }),
    prisma.withdrawal.aggregate({ where: { status: 'PAID', ...(createdAt ? { processedAt: createdAt } : {}) }, _sum: { amount: true }, _count: true }),
    prisma.bonus.aggregate({ where: createdAt ? { createdAt } : {}, _sum: { amount: true } }),
    prisma.commission.aggregate({ where: createdAt ? { createdAt } : {}, _sum: { amount: true } }),
  ])
  const deposits = dep._sum.amount ?? 0n
  const withdrawals = wd._sum.amount ?? 0n
  const bonuses = bonus._sum.amount ?? 0n
  const commissions = commission._sum.amount ?? 0n
  return {
    deposits,
    depositsCount: dep._count,
    withdrawals,
    withdrawalsCount: wd._count,
    bonusesGranted: bonuses,
    commissionsAccrued: commissions,
    netCashFlow: deposits - withdrawals,
    // GGR proper requires the game engine; approximated as net deposits minus payouts for now.
    grossRevenue: deposits - withdrawals - commissions,
  }
}

export async function revenueSeries(days = 7) {
  const start = new Date()
  start.setHours(0, 0, 0, 0)
  start.setDate(start.getDate() - (days - 1))

  const [deps, wds] = await Promise.all([
    prisma.deposit.findMany({ where: { status: 'APPROVED', processedAt: { gte: start } }, select: { amount: true, processedAt: true } }),
    prisma.withdrawal.findMany({ where: { status: 'PAID', processedAt: { gte: start } }, select: { amount: true, processedAt: true } }),
  ])

  const buckets = new Map<string, { dep: bigint; wd: bigint }>()
  for (let i = 0; i < days; i++) {
    const d = new Date(start)
    d.setDate(start.getDate() + i)
    buckets.set(dayKey(d), { dep: 0n, wd: 0n })
  }
  for (const d of deps) if (d.processedAt) { const k = dayKey(d.processedAt); const b = buckets.get(k); if (b) b.dep += d.amount }
  for (const w of wds) if (w.processedAt) { const k = dayKey(w.processedAt); const b = buckets.get(k); if (b) b.wd += w.amount }

  return [...buckets.entries()].map(([date, v]) => ({ date, deposits: v.dep, withdrawals: v.wd }))
}

export async function topGames(limit = 5) {
  const { listGamesWithStats } = await import('./games.admin.service.js')
  const games = await listGamesWithStats()
  return games
    .sort((a, b) => (b.houseProfit > a.houseProfit ? 1 : b.houseProfit < a.houseProfit ? -1 : 0))
    .slice(0, limit)
    .map((g) => ({ title: g.title, emoji: g.emoji, ggr: g.houseProfit, plays: g.plays }))
}

export async function topAgents(limit = 5) {
  const grouped = await prisma.commission.groupBy({ by: ['agentId'], _sum: { amount: true }, orderBy: { _sum: { amount: 'desc' } }, take: limit })
  const out = []
  for (const g of grouped) {
    const agent = await prisma.user.findUnique({ where: { id: g.agentId }, select: { displayName: true, phone: true, _count: { select: { referrals: true } } } })
    out.push({ agentId: g.agentId, name: agent?.displayName ?? '—', phone: agent?.phone, referrals: agent?._count.referrals ?? 0, commission: g._sum.amount ?? 0n })
  }
  return out
}
