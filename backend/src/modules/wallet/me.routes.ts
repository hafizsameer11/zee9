import { Router } from 'express'
import { z } from 'zod'
import { authenticate } from '../../middleware/authenticate.js'
import { validate } from '../../middleware/validate.js'
import { asyncHandler } from '../../lib/asyncHandler.js'
import { ok } from '../../lib/respond.js'
import { prisma } from '../../lib/prisma.js'
import { badRequest, conflict, notFound, unprocessable } from '../../core/errors.js'
import { hashPassword, verifyPassword } from '../../lib/hash.js'
import { runMoneyTx } from '../../core/tx.js'
import { creditInstantBonus } from '../../core/wager.js'
import { toRupees } from '../../lib/money.js'
import * as wallet from './wallet.service.js'
import { recentPlayerBets } from './playerBets.service.js'
import { syncUserVipLevel } from '../vip/vip.service.js'

export const meRoutes = Router()

meRoutes.use(authenticate)

meRoutes.get(
  '/',
  asyncHandler(async (req, res) => {
    const user = await prisma.user.findUnique({
      where: { id: req.user!.id },
      select: {
        id: true,
        phone: true,
        displayName: true,
        role: true,
        vipLevel: true,
        referralCode: true,
        playerNo: true,
        panelId: true,
        referredById: true,
        agentActive: true,
        referralAgentActive: true,
        walletsFilled: true,
        channelCode: true,
        bindCode: true,
        birthday: true,
        birthdaySet: true,
        withdrawPinHash: true,
        createdAt: true,
      },
    })
    if (!user) throw notFound('User not found')

    const vipLevel = await syncUserVipLevel(req.user!.id)

    const deposits = await prisma.deposit.aggregate({
      where: { userId: req.user!.id, status: 'APPROVED' },
      _sum: { amount: true },
    })
    const totalDeposited = Number(deposits._sum.amount ?? 0n) / 100

    const { withdrawPinHash, ...safe } = user
    ok(res, {
      ...safe,
      vipLevel,
      totalDeposited,
      hasWithdrawPin: !!withdrawPinHash,
      birthday: user.birthday ? user.birthday.toISOString().slice(0, 10) : null,
    })
  }),
)

meRoutes.patch(
  '/profile',
  validate({
    body: z.object({
      displayName: z.string().min(2).max(40).optional(),
      birthday: z
        .string()
        .regex(/^\d{4}-\d{2}-\d{2}$/, 'Use YYYY-MM-DD')
        .optional(),
    }),
  }),
  asyncHandler(async (req, res) => {
    const userId = req.user!.id
    const { displayName, birthday } = req.body as { displayName?: string; birthday?: string }
    if (!displayName && !birthday) throw badRequest('Nothing to update')

    const current = await prisma.user.findUnique({
      where: { id: userId },
      select: { birthdaySet: true },
    })
    if (!current) throw notFound('User not found')

    const data: { displayName?: string; birthday?: Date; birthdaySet?: boolean } = {}
    if (displayName) data.displayName = displayName.trim()
    if (birthday) {
      if (current.birthdaySet) throw conflict('Birthday can only be set once')
      const d = new Date(`${birthday}T12:00:00.000Z`)
      if (Number.isNaN(d.getTime())) throw badRequest('Invalid birthday')
      data.birthday = d
      data.birthdaySet = true
    }

    const updated = await prisma.user.update({
      where: { id: userId },
      data,
      select: {
        id: true,
        displayName: true,
        birthday: true,
        birthdaySet: true,
        playerNo: true,
        phone: true,
        vipLevel: true,
        referralAgentActive: true,
      },
    })
    ok(res, {
      ...updated,
      birthday: updated.birthday ? updated.birthday.toISOString().slice(0, 10) : null,
    })
  }),
)

meRoutes.post(
  '/withdraw-pin',
  validate({
    body: z.object({
      pin: z.string().regex(/^\d{6}$/, 'PIN must be exactly 6 digits'),
      oldPin: z.string().regex(/^\d{6}$/).optional(),
    }),
  }),
  asyncHandler(async (req, res) => {
    const userId = req.user!.id
    const { pin, oldPin } = req.body as { pin: string; oldPin?: string }
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { withdrawPinHash: true },
    })
    if (!user) throw notFound('User not found')
    if (user.withdrawPinHash) {
      if (!oldPin) throw badRequest('Current PIN required')
      const okPin = await verifyPassword(oldPin, user.withdrawPinHash)
      if (!okPin) throw unprocessable('Current PIN is incorrect')
    }
    await prisma.user.update({
      where: { id: userId },
      data: { withdrawPinHash: await hashPassword(pin) },
    })
    ok(res, { hasWithdrawPin: true })
  }),
)

meRoutes.post(
  '/gift-code/redeem',
  validate({
    body: z.object({ code: z.string().min(3).max(40) }),
  }),
  asyncHandler(async (req, res) => {
    const userId = req.user!.id
    const raw = String(req.body.code || '').trim().toUpperCase()
    if (!raw) throw badRequest('Enter a gift code')

    const result = await runMoneyTx(async (tx) => {
      const gift = await tx.giftCode.findUnique({ where: { code: raw } })
      if (!gift || !gift.enabled) throw notFound('Invalid gift code')
      if (gift.expiresAt && gift.expiresAt.getTime() < Date.now()) throw unprocessable('Gift code expired')
      if (gift.usedCount >= gift.maxUses) throw conflict('Gift code fully used')

      const prior = await tx.giftCodeRedemption.findUnique({
        where: { codeId_userId: { codeId: gift.id, userId } },
      })
      if (prior) throw conflict('You already redeemed this code')

      const updated = await tx.giftCode.updateMany({
        where: { id: gift.id, usedCount: { lt: gift.maxUses }, enabled: true },
        data: { usedCount: { increment: 1 } },
      })
      if (updated.count === 0) throw conflict('Gift code fully used')

      await creditInstantBonus(tx, {
        userId,
        amount: gift.amount,
        type: 'GIFT_CODE',
        ledgerType: 'DAILY_BONUS',
        referenceType: 'gift-code',
        referenceId: `${gift.id}:${userId}`,
        idempotencyKey: `gift-code:${gift.id}:${userId}`,
      })

      await tx.giftCodeRedemption.create({
        data: { codeId: gift.id, userId, amount: gift.amount },
      })

      return { amount: toRupees(gift.amount) }
    })

    ok(res, result)
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
    const rounds = await recentPlayerBets(req.user!.id, 30)
    ok(
      res,
      rounds.map((r) => ({
        id: r.id,
        game: r.game,
        bet: r.bet,
        payout: r.payout,
        state: r.state,
        multiplier: r.multiplier,
        time: r.time,
      })),
    )
  }),
)
