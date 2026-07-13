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
import { releaseIfNoWager } from '../../core/wager.js'
import { notify } from '../../core/notify.js'

export const bonusRoutes = Router()

bonusRoutes.use(authenticate)

bonusRoutes.get(
  '/',
  asyncHandler(async (req, res) => {
    const bonuses = await prisma.bonus.findMany({ where: { userId: req.user!.id }, orderBy: { createdAt: 'desc' }, take: 100 })
    ok(res, bonuses)
  }),
)

// Claim the once-per-day game-open bonus.
bonusRoutes.post(
  '/daily-open/claim',
  asyncHandler(async (req, res) => {
    const userId = req.user!.id
    const s = await getSettings()
    const amount = toPaisa(s.dailyOpenBonus)
    const since = new Date(); since.setHours(0, 0, 0, 0)

    const result = await runMoneyTx(async (tx) => {
      const already = await tx.bonus.count({ where: { userId, type: 'DAILY_OPEN', createdAt: { gte: since } } })
      if (already > 0) throw conflict('Daily bonus already claimed today')
      if (s.dailyOpenNeedsDeposit) {
        const depToday = await tx.deposit.count({
          where: { userId, status: 'APPROVED', processedAt: { gte: since } },
        })
        if (depToday === 0) throw unprocessable('Make a deposit today to claim the daily bonus')
      }
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
      const bonus = await tx.bonus.create({
        data: {
          userId,
          type: 'DAILY_OPEN',
          amount,
          wagerRequired: applyPct(amount, s.bonusWager * 100),
          status: 'ACTIVE',
        },
      })
      await releaseIfNoWager(tx, bonus.id)
      await notify(tx, userId, 'bonus', 'Daily bonus claimed', `You claimed Rs ${toRupees(amount).toLocaleString('en-PK')} daily bonus.`)
      return bonus
    })
    ok(res, result, 201)
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
