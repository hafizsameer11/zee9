import { Router } from 'express'
import { authenticate } from '../../middleware/authenticate.js'
import { asyncHandler } from '../../lib/asyncHandler.js'
import { ok } from '../../lib/respond.js'
import {
  claimVipLevelUp,
  claimVipMonthly,
  claimVipWeekly,
  getVipStatus,
} from './vip.service.js'

export const vipRoutes = Router()

vipRoutes.use(authenticate)

vipRoutes.get(
  '/status',
  asyncHandler(async (req, res) => {
    ok(res, await getVipStatus(req.user!.id))
  }),
)

vipRoutes.post(
  '/claim/level-up',
  asyncHandler(async (req, res) => {
    ok(res, await claimVipLevelUp(req.user!.id), 201)
  }),
)

vipRoutes.post(
  '/claim/weekly',
  asyncHandler(async (req, res) => {
    ok(res, await claimVipWeekly(req.user!.id), 201)
  }),
)

vipRoutes.post(
  '/claim/monthly',
  asyncHandler(async (req, res) => {
    ok(res, await claimVipMonthly(req.user!.id), 201)
  }),
)
