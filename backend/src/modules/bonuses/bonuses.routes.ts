import { Router } from 'express'
import { authenticate } from '../../middleware/authenticate.js'
import { asyncHandler } from '../../lib/asyncHandler.js'
import { ok } from '../../lib/respond.js'
import { prisma } from '../../lib/prisma.js'
import { runMoneyTx } from '../../core/tx.js'
import { post } from '../../core/ledger.js'
import { getSettings } from '../../core/settings.js'
import { toPaisa, toRupees, applyPct } from '../../lib/money.js'
import { conflict, unprocessable } from '../../core/errors.js'
import { releaseIfNoWager, getEffectiveWager } from '../../core/wager.js'
import { notify } from '../../core/notify.js'
import {
  buildDailyStatus,
  nextRewardDay,
  normalizeDailyRewards,
  startOfLocalDay,
} from './daily-rewards.js'

export const bonusRoutes = Router()

bonusRoutes.use(authenticate)

bonusRoutes.get(
  '/',
  asyncHandler(async (req, res) => {
    const bonuses = await prisma.bonus.findMany({ where: { userId: req.user!.id }, orderBy: { createdAt: 'desc' }, take: 100 })
    ok(res, bonuses)
  }),
)

bonusRoutes.get(
  '/daily-open/status',
  asyncHandler(async (req, res) => {
    const userId = req.user!.id
    const user = await prisma.user.findUniqueOrThrow({
      where: { id: userId },
      select: { dailyClaimStreak: true, lastDailyClaimAt: true },
    })
    const s = await getSettings()
    let canClaim = !nextRewardDay(user.dailyClaimStreak, user.lastDailyClaimAt).claimedToday
    if (canClaim && s.dailyOpenNeedsDeposit) {
      const since = startOfLocalDay()
      const depToday = await prisma.deposit.count({
        where: { userId, status: 'APPROVED', processedAt: { gte: since } },
      })
      if (depToday === 0) canClaim = false
    }
    ok(res, await buildDailyStatus(user, { canClaim }))
  }),
)

// Claim today's day in the 7-day consecutive login reward.
bonusRoutes.post(
  '/daily-open/claim',
  asyncHandler(async (req, res) => {
    const userId = req.user!.id
    const s = await getSettings()
    const rewards = normalizeDailyRewards(s.dailyRewards)
    const since = startOfLocalDay()

    const result = await runMoneyTx(async (tx) => {
      const user = await tx.user.findUniqueOrThrow({
        where: { id: userId },
        select: { dailyClaimStreak: true, lastDailyClaimAt: true },
      })
      const { day, claimedToday } = nextRewardDay(user.dailyClaimStreak, user.lastDailyClaimAt)
      if (claimedToday) throw conflict('Daily bonus already claimed today')

      if (s.dailyOpenNeedsDeposit) {
        const depToday = await tx.deposit.count({
          where: { userId, status: 'APPROVED', processedAt: { gte: since } },
        })
        if (depToday === 0) throw unprocessable('Make a deposit today to claim the daily bonus')
      }

      const amountRupees = rewards[day - 1] ?? 0
      const amount = toPaisa(amountRupees)

      if (amount > 0n) {
        await post(tx, {
          type: 'DAILY_BONUS',
          referenceType: 'user',
          referenceId: userId,
          legs: [
            { account: { system: 'BONUS_POOL' }, direction: 'DEBIT', amount },
            { account: { userId, bucket: 'BONUS' }, direction: 'CREDIT', amount },
          ],
        })
      }
      const { bonusWager } = await getEffectiveWager(userId, tx)
      const bonus = await tx.bonus.create({
        data: {
          userId,
          type: 'DAILY_OPEN',
          amount,
          wagerRequired: applyPct(amount, bonusWager * 100),
          status: 'ACTIVE',
        },
      })
      await tx.user.update({
        where: { id: userId },
        data: { dailyClaimStreak: day, lastDailyClaimAt: new Date() },
      })
      await releaseIfNoWager(tx, bonus.id)
      await notify(
        tx,
        userId,
        'bonus',
        'Daily reward claimed',
        `Day ${day}: you claimed Rs ${toRupees(amount).toLocaleString('en-PK')} daily reward.`,
      )
      return { bonus, day, amount: amountRupees, rewards }
    })
    ok(res, result, 201)
  }),
)

bonusRoutes.get(
  '/return/status',
  asyncHandler(async (req, res) => {
    const { getReturnBonusStatus } = await import('./return-bonus.js')
    ok(res, await getReturnBonusStatus(req.user!.id))
  }),
)

bonusRoutes.post(
  '/return/claim',
  asyncHandler(async (req, res) => {
    const { claimReturnBonus } = await import('./return-bonus.js')
    ok(res, await claimReturnBonus(req.user!.id), 201)
  }),
)

bonusRoutes.get(
  '/cashback',
  asyncHandler(async (req, res) => {
    const { getCashbackStatus } = await import('./cashback.service.js')
    ok(res, await getCashbackStatus(req.user!.id))
  }),
)

bonusRoutes.post(
  '/cashback/claim',
  asyncHandler(async (req, res) => {
    const { claimCashback } = await import('./cashback.service.js')
    const bonus = await claimCashback(req.user!.id)
    ok(res, bonus, 201)
  }),
)
