import { Router } from 'express'
import { z } from 'zod'
import { authenticate } from '../../middleware/authenticate.js'
import { validate } from '../../middleware/validate.js'
import { asyncHandler } from '../../lib/asyncHandler.js'
import { ok } from '../../lib/respond.js'
import * as service from './deposits.service.js'

export const depositRoutes = Router()

const createSchema = z.object({
  amount: z.number().positive(),
  method: z.enum(['JAZZCASH', 'EASYPAISA', 'BANK', 'WEGARS']),
  channelId: z.string().optional(),
  agentAccountId: z.string().optional(),
  senderAccount: z.string().max(40).optional(),
  trxId: z.string().max(60).optional(),
  receiptUrl: z.string().max(300).optional(),
  autoAssign: z.boolean().optional(),
})

const proofSchema = z.object({
  trxId: z.string().min(3).max(60),
  receiptUrl: z.string().max(300).optional(),
  senderAccount: z.string().max(40).optional(),
})

depositRoutes.use(authenticate)

depositRoutes.post(
  '/',
  validate({ body: createSchema }),
  asyncHandler(async (req, res) => {
    ok(res, await service.create(req.user!.id, req.body), 201)
  }),
)

depositRoutes.get(
  '/',
  asyncHandler(async (req, res) => {
    ok(res, await service.listMine(req.user!.id))
  }),
)

depositRoutes.get(
  '/bonus-estimate',
  asyncHandler(async (req, res) => {
    const amount = Number(req.query.amount ?? 0)
    ok(res, await service.bonusEstimate(req.user!.id, amount))
  }),
)

depositRoutes.get(
  '/order/:orderNo',
  asyncHandler(async (req, res) => {
    ok(res, await service.getByOrderNo(req.user!.id, String(req.params.orderNo)))
  }),
)

depositRoutes.patch(
  '/order/:orderNo',
  validate({ body: proofSchema }),
  asyncHandler(async (req, res) => {
    ok(res, await service.submitProof(req.user!.id, String(req.params.orderNo), req.body))
  }),
)
