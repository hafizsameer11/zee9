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
import { conflict, notFound, unprocessable } from '../../core/errors.js'

export const commissionRoutes = Router()
commissionRoutes.use(requireScope('commission'))

commissionRoutes.get(
  '/',
  asyncHandler(async (req, res) => {
    const p = pageParams(req)
    const where = {
      ...(req.query.agentId ? { agentId: String(req.query.agentId) } : {}),
      ...(req.query.status ? { status: req.query.status as any } : {}),
    }
    const [items, total] = await Promise.all([
      prisma.commission.findMany({ where, orderBy: { createdAt: 'desc' }, skip: p.skip, take: p.limit, include: { agent: { select: { displayName: true } }, sourceUser: { select: { displayName: true } } } }),
      prisma.commission.count({ where }),
    ])
    ok(res, paged(items, total, p))
  }),
)

// Pay a single accrued commission: move agent COMMISSION -> MAIN.
commissionRoutes.post(
  '/:id/pay',
  asyncHandler(async (req, res) => {
    const result = await runMoneyTx(async (tx) => {
      const c = await tx.commission.findUnique({ where: { id: req.params.id } })
      if (!c) throw notFound('Commission not found')
      if (c.status !== 'ACCRUED') throw conflict('Commission already settled')
      await tx.commission.update({ where: { id: c.id }, data: { status: 'PAID' } })
      await post(tx, {
        type: 'COMMISSION',
        referenceType: 'commission',
        referenceId: c.id,
        idempotencyKey: `commission-pay:${c.id}`,
        assertNonNegative: [{ userId: c.agentId, bucket: 'COMMISSION' }],
        legs: [
          { account: { userId: c.agentId, bucket: 'COMMISSION' }, direction: 'DEBIT', amount: c.amount },
          { account: { userId: c.agentId, bucket: 'MAIN' }, direction: 'CREDIT', amount: c.amount },
        ],
      })
      return c
    })
    await audit(req, 'commission.pay', 'commission', result.id, null, { amount: Number(result.amount) })
    ok(res, { id: result.id, status: 'PAID' })
  }),
)

// Pay out ALL accrued commissions for an agent in one move.
commissionRoutes.post(
  '/payout',
  validate({ body: z.object({ agentId: z.string() }) }),
  asyncHandler(async (req, res) => {
    const agentId = req.body.agentId
    const result = await runMoneyTx(async (tx) => {
      const accrued = await tx.commission.findMany({ where: { agentId, status: 'ACCRUED' } })
      if (accrued.length === 0) throw unprocessable('No accrued commission to pay out')
      const total = accrued.reduce((s, c) => s + c.amount, 0n)
      await tx.commission.updateMany({ where: { agentId, status: 'ACCRUED' }, data: { status: 'PAID' } })
      await post(tx, {
        type: 'COMMISSION',
        referenceType: 'agent',
        referenceId: agentId,
        assertNonNegative: [{ userId: agentId, bucket: 'COMMISSION' }],
        legs: [
          { account: { userId: agentId, bucket: 'COMMISSION' }, direction: 'DEBIT', amount: total },
          { account: { userId: agentId, bucket: 'MAIN' }, direction: 'CREDIT', amount: total },
        ],
      })
      return { count: accrued.length, total }
    })
    await audit(req, 'commission.payout', 'user', agentId, null, { count: result.count, total: Number(result.total) })
    ok(res, result)
  }),
)
