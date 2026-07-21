import { Router } from 'express'
import { z } from 'zod'
import { authenticate } from '../../middleware/authenticate.js'
import { validate } from '../../middleware/validate.js'
import { asyncHandler } from '../../lib/asyncHandler.js'
import { ok } from '../../lib/respond.js'
import * as service from './withdrawals.service.js'

export const withdrawalRoutes = Router()

const createSchema = z.object({
  amount: z.number().positive(),
  method: z.enum(['JAZZCASH', 'EASYPAISA', 'BANK', 'WEGARS']),
  accountDetails: z.object({ number: z.string().min(3), title: z.string().min(2), bank: z.string().optional() }),
})

withdrawalRoutes.use(authenticate)

withdrawalRoutes.get(
  '/eligibility',
  asyncHandler(async (req, res) => {
    ok(res, await service.eligibility(req.user!.id))
  }),
)

withdrawalRoutes.post(
  '/',
  validate({ body: createSchema }),
  asyncHandler(async (req, res) => {
    ok(res, await service.create(req.user!.id, req.body), 201)
  }),
)

withdrawalRoutes.get(
  '/',
  asyncHandler(async (req, res) => {
    ok(res, await service.listMine(req.user!.id))
  }),
)
