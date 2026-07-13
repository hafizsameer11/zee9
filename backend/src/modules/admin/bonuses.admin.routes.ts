import { Router } from 'express'
import { z } from 'zod'
import { validate } from '../../middleware/validate.js'
import { requireScope } from '../../middleware/requireScope.js'
import { asyncHandler } from '../../lib/asyncHandler.js'
import { ok } from '../../lib/respond.js'
import { prisma } from '../../lib/prisma.js'
import { pageParams, paged } from '../../lib/pagination.js'
import { runMoneyTx } from '../../core/tx.js'
import { post } from '../../core/ledger.js'
import { audit } from '../../core/audit.js'
import { toPaisa, applyPct } from '../../lib/money.js'
import { conflict, notFound } from '../../core/errors.js'
import { getSettings } from '../../core/settings.js'

export const bonusAdminRoutes = Router()
bonusAdminRoutes.use(requireScope('finance'))

bonusAdminRoutes.get(
  '/',
  asyncHandler(async (req, res) => {
    const p = pageParams(req)
    const where = {
      ...(req.query.userId ? { userId: String(req.query.userId) } : {}),
      ...(req.query.status ? { status: req.query.status as any } : {}),
    }
    const [items, total] = await Promise.all([
      prisma.bonus.findMany({ where, orderBy: { createdAt: 'desc' }, skip: p.skip, take: p.limit, include: { user: { select: { displayName: true } } } }),
      prisma.bonus.count({ where }),
    ])
    ok(res, paged(items, total, p))
  }),
)

// Manually grant a bonus to a user (credited to BONUS bucket with wager).
bonusAdminRoutes.post(
  '/grant',
  validate({ body: z.object({ userId: z.string(), amount: z.number().positive(), type: z.string().optional(), wagerMultiplier: z.number().optional() }) }),
  asyncHandler(async (req, res) => {
    const { userId, amount } = req.body
    const s = await getSettings()
    const user = await prisma.user.findUnique({ where: { id: userId }, select: { id: true } })
    if (!user) throw notFound('User not found')
    const paisa = toPaisa(amount)
    const mult = req.body.wagerMultiplier ?? s.bonusWager

    const bonus = await runMoneyTx(async (tx) => {
      await post(tx, {
        type: 'ADMIN_ADJUST',
        referenceType: 'user',
        referenceId: userId,
        createdById: req.user!.id,
        meta: { manualBonus: true },
        legs: [
          { account: { system: 'BONUS_POOL' }, direction: 'DEBIT', amount: paisa },
          { account: { userId, bucket: 'BONUS' }, direction: 'CREDIT', amount: paisa },
        ],
      })
      return tx.bonus.create({
        data: { userId, type: 'REBET', amount: paisa, wagerRequired: applyPct(paisa, mult * 100), status: 'ACTIVE' },
      })
    })
    await audit(req, 'bonus.grant', 'user', userId, null, { amount, mult })
    ok(res, bonus, 201)
  }),
)

// Revoke an active bonus (claw back from BONUS bucket).
bonusAdminRoutes.post(
  '/:id/revoke',
  asyncHandler(async (req, res) => {
    const result = await runMoneyTx(async (tx) => {
      const b = await tx.bonus.findUnique({ where: { id: req.params.id } })
      if (!b) throw notFound('Bonus not found')
      if (b.status !== 'ACTIVE' && b.status !== 'LOCKED') throw conflict('Bonus not revocable')
      await tx.bonus.update({ where: { id: b.id }, data: { status: 'EXPIRED' } })
      await post(tx, {
        type: 'ADMIN_ADJUST',
        referenceType: 'bonus',
        referenceId: b.id,
        createdById: req.user!.id,
        assertNonNegative: [{ userId: b.userId, bucket: 'BONUS' }],
        legs: [
          { account: { userId: b.userId, bucket: 'BONUS' }, direction: 'DEBIT', amount: b.amount },
          { account: { system: 'BONUS_POOL' }, direction: 'CREDIT', amount: b.amount },
        ],
      })
      return b
    })
    await audit(req, 'bonus.revoke', 'bonus', result.id)
    ok(res, { id: result.id, status: 'EXPIRED' })
  }),
)
