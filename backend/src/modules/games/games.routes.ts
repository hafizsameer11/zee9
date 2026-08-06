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
import * as crash from './crash.service.js'
import * as aeroX from './aeroX.service.js'
import * as doubleCrash from './doubleCrash.service.js'
import * as wingo from './wingo.service.js'
import * as lottery from './wingoLottery.service.js'
import * as roulette from './roulette.service.js'
import * as dragonTiger from './dragonTiger.service.js'
import * as sevenUp from './sevenUp.service.js'
import * as chickenRoad from './chickenRoad.service.js'
import * as slot from './slot.service.js'
import { kickAviatorRealtime } from './aviator.realtime.js'
import { kickCrashRealtime } from './crash.realtime.js'
import { kickAeroXRealtime } from './aeroX.realtime.js'
import { kickDoubleCrashRealtime } from './doubleCrash.realtime.js'
import { kickWingoRealtime } from './wingo.realtime.js'
import { kickLotteryRealtime, broadcastLotteryBet } from './wingoLottery.realtime.js'
import { kickRouletteRealtime, broadcastRouletteBet } from './roulette.realtime.js'
import { kickDragonTigerRealtime } from './dragonTiger.realtime.js'
import { kickSevenUpRealtime } from './sevenUp.realtime.js'

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

/* ---------------- Crash (S9-style rocket) ---------------- */
const crashBetSchema = aviatorBetSchema
const crashCashoutSchema = aviatorCashoutSchema

gamesRoutes.get(
  '/crash/state',
  authenticate,
  asyncHandler(async (req, res) => {
    await crash.processAutoCashouts(req.user!.id)
    ok(res, await crash.getState(req.user!.id))
  }),
)

gamesRoutes.post(
  '/crash/bet',
  authenticate,
  validate({ body: crashBetSchema }),
  asyncHandler(async (req, res) => {
    const data = await crash.placeBet(
      req.user!.id,
      req.body.amount,
      req.body.slot ?? 0,
      req.body.autoAt,
    )
    kickCrashRealtime()
    ok(res, data, 201)
  }),
)

gamesRoutes.post(
  '/crash/cashout',
  authenticate,
  validate({ body: crashCashoutSchema }),
  asyncHandler(async (req, res) => {
    const data = await crash.cashOut(req.user!.id, req.body.betId)
    kickCrashRealtime()
    ok(res, data)
  }),
)

/* ---------------- AeroX ---------------- */
const aeroXBetSchema = aviatorBetSchema
const aeroXCashoutSchema = aviatorCashoutSchema

gamesRoutes.get(
  '/aero-x/state',
  authenticate,
  asyncHandler(async (req, res) => {
    await aeroX.processAutoCashouts(req.user!.id)
    ok(res, await aeroX.getState(req.user!.id))
  }),
)

gamesRoutes.post(
  '/aero-x/bet',
  authenticate,
  validate({ body: aeroXBetSchema }),
  asyncHandler(async (req, res) => {
    const data = await aeroX.placeBet(
      req.user!.id,
      req.body.amount,
      req.body.slot ?? 0,
      req.body.autoAt,
    )
    kickAeroXRealtime()
    ok(res, data, 201)
  }),
)

gamesRoutes.post(
  '/aero-x/cashout',
  authenticate,
  validate({ body: aeroXCashoutSchema }),
  asyncHandler(async (req, res) => {
    const data = await aeroX.cashOut(req.user!.id, req.body.betId)
    kickAeroXRealtime()
    ok(res, data)
  }),
)

/* ---------------- Double Crash ---------------- */
const doubleCrashBetSchema = aviatorBetSchema
const doubleCrashCashoutSchema = aviatorCashoutSchema

gamesRoutes.get(
  '/double-crash/state',
  authenticate,
  asyncHandler(async (req, res) => {
    await doubleCrash.processAutoCashouts(req.user!.id)
    ok(res, await doubleCrash.getState(req.user!.id))
  }),
)

gamesRoutes.post(
  '/double-crash/bet',
  authenticate,
  validate({ body: doubleCrashBetSchema }),
  asyncHandler(async (req, res) => {
    const data = await doubleCrash.placeBet(
      req.user!.id,
      req.body.amount,
      req.body.slot ?? 0,
      req.body.autoAt,
    )
    kickDoubleCrashRealtime()
    ok(res, data, 201)
  }),
)

gamesRoutes.post(
  '/double-crash/cashout',
  authenticate,
  validate({ body: doubleCrashCashoutSchema }),
  asyncHandler(async (req, res) => {
    const data = await doubleCrash.cashOut(req.user!.id, req.body.betId)
    kickDoubleCrashRealtime()
    ok(res, data)
  }),
)

/* ---------------- WinGo (color / number lottery) ---------------- */
const wingoModeSchema = z.enum(['30s', '1min', '3min', '5min'])
const wingoBetSchema = z.object({
  mode: wingoModeSchema,
  type: z.enum(['number', 'green', 'red', 'violet', 'big', 'small']),
  value: z.number().int().min(0).max(9).nullable().optional(),
  amount: z.number().positive(),
})
const wingoRevokeSchema = z.object({ mode: wingoModeSchema })

gamesRoutes.get(
  '/wingo/state',
  authenticate,
  asyncHandler(async (req, res) => {
    const mode = typeof req.query.mode === 'string' ? req.query.mode : '30s'
    ok(res, await wingo.getState(req.user!.id, mode))
  }),
)

gamesRoutes.post(
  '/wingo/bet',
  authenticate,
  validate({ body: wingoBetSchema }),
  asyncHandler(async (req, res) => {
    const data = await wingo.placeBet(
      req.user!.id,
      req.body.mode,
      req.body.type,
      req.body.amount,
      req.body.value,
    )
    kickWingoRealtime(req.body.mode)
    ok(res, data, 201)
  }),
)

gamesRoutes.post(
  '/wingo/revoke',
  authenticate,
  validate({ body: wingoRevokeSchema }),
  asyncHandler(async (req, res) => {
    const data = await wingo.revokeBets(req.user!.id, req.body.mode)
    kickWingoRealtime(req.body.mode)
    ok(res, data)
  }),
)

/* ---------------- WinGo Lottery (landscape dedicated table) ---------------- */
const lotteryBetSchema = z.object({
  type: z.enum(['number', 'green', 'red', 'violet']),
  value: z.number().int().min(0).max(9).nullable().optional(),
  amount: z.number().positive(),
})

gamesRoutes.get(
  '/wingo-lottery/state',
  authenticate,
  asyncHandler(async (req, res) => {
    ok(res, await lottery.getState(req.user!.id))
  }),
)

gamesRoutes.post(
  '/wingo-lottery/bet',
  authenticate,
  validate({ body: lotteryBetSchema }),
  asyncHandler(async (req, res) => {
    const data = await lottery.placeBet(req.user!.id, req.body.type, req.body.amount, req.body.value)
    broadcastLotteryBet({
      id: data.betId,
      betKey: data.betKey,
      amount: data.amount,
      userId: req.user!.id,
      at: data.at,
    })
    ok(res, data, 201)
  }),
)

gamesRoutes.post(
  '/wingo-lottery/revoke',
  authenticate,
  asyncHandler(async (req, res) => {
    const data = await lottery.revokeBets(req.user!.id)
    kickLotteryRealtime()
    ok(res, data)
  }),
)

/* ---------------- European Roulette (shared multiplayer table) ---------------- */
const rouletteBetSchema = z.object({
  type: z.enum(['straight', 'red', 'black', 'odd', 'even', 'low', 'high', 'dozen', 'column']),
  value: z.number().int().min(0).max(36).nullable().optional(),
  cellKey: z.string().min(1).max(32).optional(),
  amount: z.number().positive(),
})
const rouletteRevokeSchema = z.object({
  mode: z.enum(['all', 'last']).default('all'),
})

gamesRoutes.get(
  '/roulette/state',
  authenticate,
  asyncHandler(async (req, res) => {
    ok(res, await roulette.getState(req.user!.id))
  }),
)

gamesRoutes.post(
  '/roulette/bet',
  authenticate,
  validate({ body: rouletteBetSchema }),
  asyncHandler(async (req, res) => {
    const data = await roulette.placeBet(
      req.user!.id,
      req.body.type,
      req.body.amount,
      req.body.value,
      req.body.cellKey,
    )
    broadcastRouletteBet({
      id: data.betId,
      betKey: data.betKey,
      amount: data.amount,
      userId: req.user!.id,
      at: data.at,
    })
    ok(res, data, 201)
  }),
)

gamesRoutes.post(
  '/roulette/revoke',
  authenticate,
  validate({ body: rouletteRevokeSchema }),
  asyncHandler(async (req, res) => {
    const data = await roulette.revokeBets(req.user!.id, req.body.mode ?? 'all')
    kickRouletteRealtime()
    ok(res, data)
  }),
)

/* ---------------- Dragon Tiger ---------------- */
const dtBetSchema = z.object({
  side: z.enum(['dragon', 'tiger', 'tie']),
  amount: z.number().positive(),
})

gamesRoutes.get(
  '/dragon-tiger/state',
  authenticate,
  asyncHandler(async (req, res) => {
    ok(res, await dragonTiger.getState(req.user!.id))
  }),
)

gamesRoutes.post(
  '/dragon-tiger/bet',
  authenticate,
  validate({ body: dtBetSchema }),
  asyncHandler(async (req, res) => {
    const data = await dragonTiger.placeBet(req.user!.id, req.body.side, req.body.amount)
    kickDragonTigerRealtime()
    ok(res, data, 201)
  }),
)

/* ---------------- 7 Up Down ---------------- */
const sevenUpBetSchema = z.object({
  side: z.enum(['down', 'seven', 'up']),
  amount: z.number().positive(),
})

gamesRoutes.get(
  '/7up-down/state',
  authenticate,
  asyncHandler(async (req, res) => {
    ok(res, await sevenUp.getState(req.user!.id))
  }),
)

gamesRoutes.post(
  '/7up-down/bet',
  authenticate,
  validate({ body: sevenUpBetSchema }),
  asyncHandler(async (req, res) => {
    const data = await sevenUp.placeBet(req.user!.id, req.body.side, req.body.amount)
    kickSevenUpRealtime()
    ok(res, data, 201)
  }),
)

/* ---------------- Chicken Road ---------------- */
const chickenStartSchema = z.object({
  bet: z.number().positive(),
  difficulty: z.enum(['easy', 'medium', 'hard', 'hardcore']),
})
const chickenStepSchema = z.object({ currentStep: z.number().int().min(0) })

gamesRoutes.post(
  '/chicken-road/start',
  authenticate,
  validate({ body: chickenStartSchema }),
  asyncHandler(async (req, res) => {
    ok(res, await chickenRoad.start(req.user!.id, req.body.bet, req.body.difficulty), 201)
  }),
)

gamesRoutes.post(
  '/chicken-road/:roundId/step',
  authenticate,
  validate({ body: chickenStepSchema }),
  asyncHandler(async (req, res) => {
    ok(res, await chickenRoad.step(req.user!.id, req.params.roundId, req.body.currentStep))
  }),
)

gamesRoutes.post(
  '/chicken-road/:roundId/cashout',
  authenticate,
  asyncHandler(async (req, res) => {
    ok(res, await chickenRoad.cashout(req.user!.id, req.params.roundId))
  }),
)

/* ---------------- Slots (money-coming, fortune-gems-2, bounty-trail, wild-bounty, super-ace) ---------------- */
const slotSpinSchema = z.object({ bet: z.number().positive() })

for (const slug of slot.SLOT_SLUGS) {
  gamesRoutes.post(
    `/${slug}/spin`,
    authenticate,
    validate({ body: slotSpinSchema }),
    asyncHandler(async (req, res) => {
      ok(res, await slot.spin(req.user!.id, slug, req.body.bet))
    }),
  )
}

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
