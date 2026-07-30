import { Router } from 'express'
import { authenticate } from '../../middleware/authenticate.js'
import { asyncHandler } from '../../lib/asyncHandler.js'
import { ok } from '../../lib/respond.js'
import { prisma } from '../../lib/prisma.js'
import { getSettings } from '../../core/settings.js'
import { balances } from '../wallet/wallet.service.js'
import { toRupees } from '../../lib/money.js'
import { allocatePlayerNo } from '../../lib/playerNo.js'
import { forbidden } from '../../core/errors.js'

export const referralRoutes = Router()

referralRoutes.use(authenticate)

function dayRange(dateStr?: string) {
  const d = dateStr ? new Date(`${dateStr}T00:00:00`) : new Date()
  if (Number.isNaN(d.getTime())) {
    const now = new Date()
    now.setHours(0, 0, 0, 0)
    const end = new Date(now)
    end.setDate(end.getDate() + 1)
    return { start: now, end }
  }
  d.setHours(0, 0, 0, 0)
  const end = new Date(d)
  end.setDate(end.getDate() + 1)
  return { start: d, end }
}

async function teamStatsFor(userId: string, dateStr?: string) {
  const { start, end } = dayRange(dateStr)
  const edges = await prisma.referralEdge.findMany({
    where: { ancestorId: userId, level: { lte: 3 } },
    select: { descendantId: true },
  })
  const memberIds = [...new Set(edges.map((e) => e.descendantId))]
  const members = memberIds.length

  if (members === 0) {
    return {
      members: 0,
      deposit: 0,
      winLoss: 0,
      rollover: 0,
      commission: 0,
      date: start.toISOString().slice(0, 10),
    }
  }

  const [dep, betAgg, winAgg, dayCommission] = await Promise.all([
    prisma.deposit.aggregate({
      where: { userId: { in: memberIds }, status: 'APPROVED', createdAt: { gte: start, lt: end } },
      _sum: { amount: true },
    }),
    // All games: GAME_BET debits from MAIN = rollover
    prisma.ledgerEntry.aggregate({
      where: {
        direction: 'DEBIT',
        createdAt: { gte: start, lt: end },
        account: { ownerId: { in: memberIds }, bucket: 'MAIN' },
        transaction: { type: 'GAME_BET' },
      },
      _sum: { amount: true },
    }),
    prisma.ledgerEntry.aggregate({
      where: {
        direction: 'CREDIT',
        createdAt: { gte: start, lt: end },
        account: { ownerId: { in: memberIds }, bucket: 'MAIN' },
        transaction: { type: 'GAME_WIN' },
      },
      _sum: { amount: true },
    }),
    prisma.commission.aggregate({
      where: { agentId: userId, createdAt: { gte: start, lt: end } },
      _sum: { amount: true },
    }),
  ])

  const wagered = betAgg._sum.amount ?? 0n
  const won = winAgg._sum.amount ?? 0n
  // Player P/L for the day (negative = team net loss → agent salary basis)
  const winLoss = won - wagered

  return {
    members,
    deposit: toRupees(dep._sum.amount ?? 0n),
    winLoss: toRupees(winLoss),
    rollover: toRupees(wagered),
    commission: toRupees(dayCommission._sum.amount ?? 0n),
    date: start.toISOString().slice(0, 10),
  }
}

referralRoutes.get(
  '/',
  asyncHandler(async (req, res) => {
    const userId = req.user!.id
    const me0 = await prisma.user.findUniqueOrThrow({
      where: { id: userId },
      select: {
        id: true,
        role: true,
        displayName: true,
        referralCode: true,
        playerNo: true,
        agentActive: true,
        referralAgentActive: true,
        walletsFilled: true,
        channelCode: true,
        salaryTransferOpen: true,
        salaryApprovedPaisa: true,
      },
    })
    if (me0.role === 'AGENT') {
      throw forbidden('C2C merchant panels do not have Game IDs or player referral links')
    }
    // Ensure every player has a numeric public ID for share links.
    const me =
      me0.playerNo != null
        ? me0
        : await prisma.user.update({
            where: { id: userId },
            data: { playerNo: await allocatePlayerNo() },
            select: {
              id: true,
              displayName: true,
              referralCode: true,
              playerNo: true,
              agentActive: true,
              referralAgentActive: true,
              walletsFilled: true,
              channelCode: true,
              salaryTransferOpen: true,
              salaryApprovedPaisa: true,
            },
          })
    const playerNo = me.playerNo!
    const s = await getSettings()

    const ownedChannel = await prisma.channel.findFirst({
      where: { ownerId: userId, enabled: true },
      select: { code: true },
    })
    const channelCode = ownedChannel?.code ?? me.channelCode ?? ''
    const base = (s.shareLink || '').split('?')[0] || 'http://localhost:5174/'
    const params = new URLSearchParams()
    // playerId is required on every share link (numeric public ID)
    params.set('playerId', String(playerNo))
    if (channelCode) params.set('channel', channelCode)
    params.set('shareCode', String(playerNo))
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

    const commission = await prisma.commission.aggregate({
      where: { agentId: userId },
      _sum: { amount: true },
    })
    const todayStart = new Date()
    todayStart.setHours(0, 0, 0, 0)
    const todayComm = await prisma.commission.aggregate({
      where: { agentId: userId, createdAt: { gte: todayStart } },
      _sum: { amount: true },
    })
    const bal = await balances(userId)
    const team = me.referralAgentActive ? await teamStatsFor(userId) : null
    let salaryApproved = me.salaryApprovedPaisa
    if (salaryApproved < 0n) salaryApproved = 0n
    if (salaryApproved > bal.COMMISSION) salaryApproved = bal.COMMISSION
    const salaryHold = bal.COMMISSION - salaryApproved

    ok(res, {
      referralCode: me.referralCode,
      playerNo,
      playerId: playerNo,
      channelCode,
      shareUrl,
      shareLink: shareUrl,
      agentActive: me.agentActive,
      referralAgentActive: me.referralAgentActive,
      walletsFilled: me.walletsFilled,
      walletsRequired: s.walletsRequired,
      counts: { level1: byLevel[1], level2: byLevel[2], level3: byLevel[3] },
      downline: { level3: byLevel[3], level2: byLevel[2], level1: byLevel[1] },
      commissionRates: { l1: s.commissionL1, l2: s.commissionL2, l3: s.commissionL3 },
      totalCommission: toRupees(commission._sum.amount ?? 0n),
      todayCommission: toRupees(todayComm._sum.amount ?? 0n),
      commissionBalance: toRupees(bal.COMMISSION),
      salaryTransferOpen: me.salaryTransferOpen,
      salaryApproved: toRupees(salaryApproved),
      salaryHold: toRupees(salaryHold),
      transferable: me.salaryTransferOpen ? toRupees(salaryApproved) : 0,
      displayName: me.displayName,
      userId: String(playerNo),
      team,
      direct: direct.map((d) => ({
        name: d.descendant.displayName,
        phone: d.descendant.phone,
        joined: d.descendant.createdAt,
      })),
    })
  }),
)

referralRoutes.get(
  '/team',
  asyncHandler(async (req, res) => {
    const date = typeof req.query.date === 'string' ? req.query.date : undefined
    const me = await prisma.user.findUniqueOrThrow({
      where: { id: req.user!.id },
      select: { referralAgentActive: true },
    })
    if (!me.referralAgentActive) {
      ok(res, {
        members: 0,
        deposit: 0,
        winLoss: 0,
        rollover: 0,
        commission: 0,
        date: date || new Date().toISOString().slice(0, 10),
      })
      return
    }
    ok(res, await teamStatsFor(req.user!.id, date))
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

    ok(
      res,
      sorted.map((r, i) => ({
        rank: i + 1,
        name: maskName(nameMap[r.agentId] ?? 'User'),
        amount: Number(r._sum.amount ?? 0n) / 100,
      })),
    )
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

referralRoutes.get(
  '/members',
  asyncHandler(async (req, res) => {
    const agentId = req.user!.id
    const s = await getSettings()
    const dateQ = String(req.query.date || '').trim()
    const { start, end } = dayRange(dateQ || undefined)

    const edges = await prisma.referralEdge.findMany({
      where: { ancestorId: agentId, level: { lte: 3 } },
      orderBy: [{ level: 'asc' }, { descendantId: 'asc' }],
      take: 500,
      include: {
        descendant: {
          select: {
            id: true,
            playerNo: true,
            displayName: true,
            phone: true,
            createdAt: true,
            status: true,
            referralAgentActive: true,
            lastPlayedAt: true,
            updatedAt: true,
          },
        },
      },
    })

    const memberIds = [...new Set(edges.map((e) => e.descendantId))]
    if (memberIds.length === 0) {
      ok(res, { items: [], date: start.toISOString().slice(0, 10) })
      return
    }

    const [deps, betAgg, winAgg, commRows, subCounts, gameDay, lastRounds] = await Promise.all([
      prisma.deposit.groupBy({
        by: ['userId'],
        where: {
          userId: { in: memberIds },
          status: 'APPROVED',
          createdAt: { gte: start, lt: end },
        },
        _sum: { amount: true },
      }),
      prisma.ledgerEntry.groupBy({
        by: ['accountId'],
        where: {
          direction: 'DEBIT',
          createdAt: { gte: start, lt: end },
          account: { ownerId: { in: memberIds }, bucket: 'MAIN' },
          transaction: { type: 'GAME_BET' },
        },
        _sum: { amount: true },
      }),
      prisma.ledgerEntry.groupBy({
        by: ['accountId'],
        where: {
          direction: 'CREDIT',
          createdAt: { gte: start, lt: end },
          account: { ownerId: { in: memberIds }, bucket: 'MAIN' },
          transaction: { type: 'GAME_WIN' },
        },
        _sum: { amount: true },
      }),
      prisma.commission.groupBy({
        by: ['sourceUserId'],
        where: {
          agentId,
          sourceUserId: { in: memberIds },
          createdAt: { gte: start, lt: end },
        },
        _sum: { amount: true },
      }),
      prisma.referralEdge.groupBy({
        by: ['ancestorId'],
        where: { ancestorId: { in: memberIds }, level: 1 },
        _count: { _all: true },
      }),
      prisma.gameRound.groupBy({
        by: ['userId', 'gameSlug'],
        where: { userId: { in: memberIds }, createdAt: { gte: start, lt: end } },
        _sum: { bet: true, payout: true },
        _count: { _all: true },
      }),
      prisma.gameRound.findMany({
        where: { userId: { in: memberIds } },
        orderBy: { createdAt: 'desc' },
        distinct: ['userId'],
        select: { userId: true, gameSlug: true, bet: true, payout: true, createdAt: true, state: true },
      }),
    ])

    // Map accountId → ownerId for ledger groupBy
    const accountIds = [...new Set([...betAgg.map((b) => b.accountId), ...winAgg.map((w) => w.accountId)])]
    const accounts =
      accountIds.length === 0
        ? []
        : await prisma.ledgerAccount.findMany({
            where: { id: { in: accountIds } },
            select: { id: true, ownerId: true },
          })
    const accOwner = Object.fromEntries(accounts.map((a) => [a.id, a.ownerId]))

    const depMap = Object.fromEntries(deps.map((d) => [d.userId, d._sum.amount ?? 0n]))
    const betMap: Record<string, bigint> = {}
    for (const b of betAgg) {
      const oid = accOwner[b.accountId]
      if (!oid) continue
      betMap[oid] = (betMap[oid] ?? 0n) + (b._sum.amount ?? 0n)
    }
    const winMap: Record<string, bigint> = {}
    for (const w of winAgg) {
      const oid = accOwner[w.accountId]
      if (!oid) continue
      winMap[oid] = (winMap[oid] ?? 0n) + (w._sum.amount ?? 0n)
    }
    const commMap = Object.fromEntries(commRows.map((c) => [c.sourceUserId, c._sum.amount ?? 0n]))
    const subMap = Object.fromEntries(subCounts.map((c) => [c.ancestorId, c._count._all]))
    const lastGameMap = Object.fromEntries(
      lastRounds.map((r) => [
        r.userId,
        {
          game: r.gameSlug,
          bet: toRupees(r.bet),
          payout: toRupees(r.payout),
          at: r.createdAt,
          state: r.state,
        },
      ]),
    )

    const gamesByUser: Record<string, Array<{ game: string; rounds: number; bet: number; win: number; winLoss: number }>> =
      {}
    for (const g of gameDay) {
      const list = gamesByUser[g.userId] || (gamesByUser[g.userId] = [])
      const bet = g._sum.bet ?? 0n
      const payout = g._sum.payout ?? 0n
      list.push({
        game: g.gameSlug,
        rounds: g._count._all,
        bet: toRupees(bet),
        win: toRupees(payout),
        winLoss: toRupees(payout - bet),
      })
    }
    for (const list of Object.values(gamesByUser)) {
      list.sort((a, b) => Math.abs(b.winLoss) - Math.abs(a.winLoss))
    }

    const items = edges.map((e) => {
      const u = e.descendant
      const bet = betMap[u.id] ?? 0n
      const win = winMap[u.id] ?? 0n
      const deposit = depMap[u.id] ?? 0n
      const commission = commMap[u.id] ?? 0n
      const isAgent = !!u.referralAgentActive
      const last = u.lastPlayedAt ?? u.updatedAt
      const gameId = u.playerNo != null ? String(u.playerNo) : u.id.slice(-8)
      const lastGame = lastGameMap[u.id] ?? null
      const games = gamesByUser[u.id] || []
      return {
        level: e.level,
        id: u.id,
        gameId,
        playerNo: u.playerNo,
        name: u.displayName,
        phone: u.phone,
        status: u.status,
        joined: u.createdAt,
        isAgent,
        role: isAgent ? 'Agent' : 'Player',
        rebatePct: isAgent ? s.commissionL1 : 0,
        bet: toRupees(bet),
        win: toRupees(win),
        rollover: toRupees(bet),
        deposit: toRupees(deposit),
        winLoss: toRupees(win - bet),
        commission: toRupees(commission),
        members: subMap[u.id] ?? 0,
        lastLogin: last,
        lastGame,
        games,
        date: start.toISOString().slice(0, 10),
      }
    })

    // High winners first — easier to spot abnormal winning
    items.sort((a, b) => b.winLoss - a.winLoss || b.bet - a.bet)

    ok(res, { items, date: start.toISOString().slice(0, 10), total: items.length })
  }),
)
