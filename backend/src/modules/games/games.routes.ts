import { Router } from 'express'
import { z } from 'zod'
import { asyncHandler } from '../../lib/asyncHandler.js'
import { ok } from '../../lib/respond.js'
import { prisma } from '../../lib/prisma.js'
import { authenticate } from '../../middleware/authenticate.js'
import { validate } from '../../middleware/validate.js'
import { notFound } from '../../core/errors.js'
import * as mines from './mines.service.js'
import * as aviator from './aviator.service.js'
import { kickAviatorRealtime } from './aviator.realtime.js'

export const gamesRoutes = Router()

// Public: enabled games for the lobby.
gamesRoutes.get(
  '/',
  asyncHandler(async (_req, res) => {
    const games = await prisma.game.findMany({
      where: { enabled: true },
      orderBy: { order: 'asc' },
      select: { id: true, slug: true, title: true, emoji: true, color: true, category: true, tag: true },
    })
    ok(res, games)
  }),
)

/* ---------------- Aviator (before /:slug so paths don't collide) ---------------- */
const aviatorBetSchema = z.object({
  amount: z.number().positive(),
  slot: z.number().int().min(0).max(1).default(0),
  autoAt: z.number().min(1.1).max(100).nullable().optional(),
})
const aviatorCashoutSchema = z.object({ betId: z.string().min(1) })

gamesRoutes.get(
  '/aviator/state',
  authenticate,
  asyncHandler(async (req, res) => {
    await aviator.processAutoCashouts(req.user!.id)
    ok(res, await aviator.getState(req.user!.id))
  }),
)

gamesRoutes.post(
  '/aviator/bet',
  authenticate,
  validate({ body: aviatorBetSchema }),
  asyncHandler(async (req, res) => {
    const data = await aviator.placeBet(
      req.user!.id,
      req.body.amount,
      req.body.slot ?? 0,
      req.body.autoAt,
    )
    kickAviatorRealtime()
    ok(res, data, 201)
  }),
)

gamesRoutes.post(
  '/aviator/cashout',
  authenticate,
  validate({ body: aviatorCashoutSchema }),
  asyncHandler(async (req, res) => {
    const data = await aviator.cashOut(req.user!.id, req.body.betId)
    kickAviatorRealtime()
    ok(res, data)
  }),
)

// Public: single game config for the player UI (winPct is admin-only — never exposed).
gamesRoutes.get(
  '/:slug',
  asyncHandler(async (req, res) => {
    const game = await prisma.game.findUnique({
      where: { slug: req.params.slug },
      select: { slug: true, title: true, emoji: true, enabled: true },
    })
    if (!game) throw notFound('Game not found')
    ok(res, game)
  }),
)

/* ---------------- Mines ---------------- */
const startSchema = z.object({ bet: z.number().positive(), mines: z.number().int().min(1).max(24) })
const revealSchema = z.object({ tile: z.number().int().min(0).max(24) })

gamesRoutes.post(
  '/mines/start',
  authenticate,
  validate({ body: startSchema }),
  asyncHandler(async (req, res) => {
    ok(res, await mines.start(req.user!.id, req.body.bet, req.body.mines), 201)
  }),
)

gamesRoutes.post(
  '/mines/:roundId/reveal',
  authenticate,
  validate({ body: revealSchema }),
  asyncHandler(async (req, res) => {
    ok(res, await mines.reveal(req.user!.id, req.params.roundId, req.body.tile))
  }),
)

gamesRoutes.post(
  '/mines/:roundId/cashout',
  authenticate,
  asyncHandler(async (req, res) => {
    ok(res, await mines.cashout(req.user!.id, req.params.roundId))
  }),
)
