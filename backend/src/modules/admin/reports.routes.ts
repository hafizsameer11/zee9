import { Router } from 'express'
import { z } from 'zod'
import { validate } from '../../middleware/validate.js'
import { requireScope } from '../../middleware/requireScope.js'
import { asyncHandler } from '../../lib/asyncHandler.js'
import { ok } from '../../lib/respond.js'
import * as reports from './reports.service.js'

export const reportsRoutes = Router()
reportsRoutes.use(requireScope('reports'))

const rangeSchema = z.object({ from: z.string().optional(), to: z.string().optional() })

reportsRoutes.get(
  '/financial',
  validate({ query: rangeSchema }),
  asyncHandler(async (req, res) => {
    const from = req.query.from ? new Date(String(req.query.from)) : undefined
    const to = req.query.to ? new Date(String(req.query.to)) : undefined
    ok(res, await reports.financial(from, to))
  }),
)

reportsRoutes.get(
  '/revenue-series',
  asyncHandler(async (req, res) => {
    const days = Math.min(90, Math.max(1, Number(req.query.days) || 7))
    ok(res, await reports.revenueSeries(days))
  }),
)

reportsRoutes.get('/top-games', asyncHandler(async (_req, res) => ok(res, await reports.topGames())))
reportsRoutes.get('/top-agents', asyncHandler(async (_req, res) => ok(res, await reports.topAgents())))
