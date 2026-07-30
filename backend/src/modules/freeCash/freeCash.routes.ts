import { Router } from 'express'
import { authenticate } from '../../middleware/authenticate.js'
import { asyncHandler } from '../../lib/asyncHandler.js'
import { ok } from '../../lib/respond.js'
import { z } from 'zod'
import { claimFreeCashQuest, getFreeCashStatus } from './freeCash.service.js'

export const freeCashRoutes = Router()

freeCashRoutes.use(authenticate)

freeCashRoutes.get(
  '/status',
  asyncHandler(async (req, res) => {
    ok(res, await getFreeCashStatus(req.user!.id))
  }),
)

freeCashRoutes.post(
  '/claim',
  asyncHandler(async (req, res) => {
    const body = z.object({ questId: z.string().min(1).max(64) }).parse(req.body)
    ok(res, await claimFreeCashQuest(req.user!.id, body.questId), 201)
  }),
)
