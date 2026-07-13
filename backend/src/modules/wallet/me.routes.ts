import { Router } from 'express'
import { authenticate } from '../../middleware/authenticate.js'
import { asyncHandler } from '../../lib/asyncHandler.js'
import { ok } from '../../lib/respond.js'
import { prisma } from '../../lib/prisma.js'
import { notFound } from '../../core/errors.js'
import * as wallet from './wallet.service.js'

export const meRoutes = Router()

meRoutes.use(authenticate)

meRoutes.get(
  '/',
  asyncHandler(async (req, res) => {
    const user = await prisma.user.findUnique({
      where: { id: req.user!.id },
      select: { id: true, phone: true, displayName: true, role: true, vipLevel: true, referralCode: true, referredById: true, agentActive: true, channelCode: true, bindCode: true, createdAt: true },
    })
    if (!user) throw notFound('User not found')

    const deposits = await prisma.deposit.aggregate({
      where: { userId: req.user!.id, status: 'APPROVED' },
      _sum: { amount: true },
    })
    const totalDeposited = Number(deposits._sum.amount ?? 0n) / 100

    ok(res, { ...user, totalDeposited })
  }),
)

meRoutes.get(
  '/wallet',
  asyncHandler(async (req, res) => {
    ok(res, await wallet.balances(req.user!.id))
  }),
)

meRoutes.get(
  '/wallet/transactions',
  asyncHandler(async (req, res) => {
    ok(res, await wallet.transactions(req.user!.id))
  }),
)

meRoutes.get(
  '/notifications',
  asyncHandler(async (req, res) => {
    const items = await prisma.notification.findMany({
      where: { userId: req.user!.id },
      orderBy: { createdAt: 'desc' },
      take: 50,
    })
    const unread = items.filter((n) => !n.read).length
    ok(res, { items, unread })
  }),
)

meRoutes.post(
  '/notifications/read',
  asyncHandler(async (req, res) => {
    await prisma.notification.updateMany({ where: { userId: req.user!.id, read: false }, data: { read: true } })
    ok(res, { ok: true })
  }),
)

meRoutes.get(
  '/bets',
  asyncHandler(async (req, res) => {
    const rounds = await prisma.gameRound.findMany({
      where: { userId: req.user!.id },
      orderBy: { createdAt: 'desc' },
      take: 30,
      select: { id: true, gameSlug: true, bet: true, payout: true, state: true, multiplier: true, createdAt: true },
    })
    ok(res, rounds.map((r) => ({
      id: r.id,
      game: r.gameSlug,
      bet: Number(r.bet) / 100,
      payout: Number(r.payout) / 100,
      state: r.state,
      multiplier: r.multiplier,
      time: r.createdAt,
    })))
  }),
)
