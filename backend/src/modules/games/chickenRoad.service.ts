import crypto from 'node:crypto'
import { prisma } from '../../lib/prisma.js'
import { runMoneyTx } from '../../core/tx.js'
import { post, getBalances } from '../../core/ledger.js'
import { toPaisa, toRupees } from '../../lib/money.js'
import { badRequest, conflict, notFound, unprocessable } from '../../core/errors.js'
import { recordWagerAndRelease } from '../../core/wager.js'
import { accrueForLoss, clawbackForWin } from '../commission/commission.service.js'

const GAME_SLUG = 'chicken-road'

type Difficulty = 'easy' | 'medium' | 'hard' | 'hardcore'
type DifficultyConfig = {
  laneCount: number
  hazardRate: number
  multipliers: readonly number[]
  code: number
}

const DIFFICULTIES: Record<Difficulty, DifficultyConfig> = {
  easy: {
    laneCount: 14,
    hazardRate: 0.05,
    multipliers: [
      1.01, 1.03, 1.06, 1.1, 1.15, 1.21, 1.28, 1.36, 1.46, 1.58, 1.72, 1.9, 2.12, 2.4,
    ],
    code: 1,
  },
  medium: {
    laneCount: 12,
    hazardRate: 0.1,
    multipliers: [1.03, 1.08, 1.15, 1.25, 1.38, 1.55, 1.78, 2.1, 2.55, 3.2, 4.2, 5.8],
    code: 2,
  },
  hard: {
    laneCount: 11,
    hazardRate: 0.16,
    multipliers: [1.08, 1.18, 1.35, 1.6, 2.0, 2.6, 3.5, 5.0, 7.5, 12.0, 20.0],
    code: 3,
  },
  hardcore: {
    laneCount: 9,
    hazardRate: 0.24,
    multipliers: [1.15, 1.4, 1.85, 2.7, 4.2, 7.0, 13.0, 26.0, 55.0],
    code: 4,
  },
}

const CODE_TO_DIFF = Object.fromEntries(
  Object.entries(DIFFICULTIES).map(([key, value]) => [value.code, key]),
) as Record<number, Difficulty>

function shouldForceHazard(winPct: number) {
  const pct = Math.max(0, Math.min(100, winPct))
  if (pct >= 100) return false
  if (pct <= 0) return true
  return crypto.randomInt(0, 10_000) / 10_000 < 1 - pct / 100
}

function buildHazards(laneCount: number, hazardRate: number) {
  const hazards: number[] = []
  for (let i = 0; i < laneCount; i++) {
    const stepHazard = Math.min(0.92, hazardRate + i * hazardRate * 0.35)
    if (crypto.randomInt(0, 10_000) / 10_000 < stepHazard) hazards.push(i)
  }
  if (
    laneCount > 0 &&
    hazardRate < 0.2 &&
    hazards.includes(0) &&
    crypto.randomInt(0, 100) < 55
  ) {
    return hazards.filter((hazard) => hazard !== 0)
  }
  return hazards
}

async function getGame() {
  const game = await prisma.game.findUnique({ where: { slug: GAME_SLUG } })
  if (!game) throw notFound('Chicken Road not configured')
  if (!game.enabled) throw unprocessable('Chicken Road is currently disabled')
  return game
}

export async function start(userId: string, betRupees: number, difficulty: Difficulty) {
  const cfg = DIFFICULTIES[difficulty]
  if (!cfg) throw badRequest('Invalid difficulty')
  await getGame()

  const bet = toPaisa(betRupees)
  if (bet <= 0n) throw badRequest('Invalid bet')

  const hazards = buildHazards(cfg.laneCount, cfg.hazardRate)

  return runMoneyTx(async (tx) => {
    const bal = await getBalances(tx, userId)
    if (bal.MAIN! < bet) throw unprocessable('Insufficient balance')

    await post(tx, {
      type: 'GAME_BET',
      referenceType: 'chicken-road-bet',
      referenceId: userId,
      meta: { game: GAME_SLUG, difficulty },
      assertNonNegative: [{ userId, bucket: 'MAIN' }],
      legs: [
        { account: { userId, bucket: 'MAIN' }, direction: 'DEBIT', amount: bet },
        { account: { system: 'HOUSE' }, direction: 'CREDIT', amount: bet },
      ],
    })

    const round = await tx.gameRound.create({
      data: {
        userId,
        gameSlug: GAME_SLUG,
        bet,
        gridSize: cfg.laneCount,
        minesCount: cfg.code,
        minePositions: hazards,
        revealed: [],
        multiplier: 0,
        state: 'ACTIVE',
      },
    })

    await tx.game.update({ where: { slug: GAME_SLUG }, data: { plays: { increment: 1 } } })
    await recordWagerAndRelease(tx, userId, bet)

    return {
      roundId: round.id,
      multipliers: [...cfg.multipliers],
      laneCount: cfg.laneCount,
      betAmount: betRupees,
      difficulty,
      source: 'server' as const,
    }
  })
}

export async function step(userId: string, roundId: string, currentStep: number) {
  const game = await getGame()

  return runMoneyTx(async (tx) => {
    const round = await tx.gameRound.findUnique({ where: { id: roundId } })
    if (!round || round.userId !== userId || round.gameSlug !== GAME_SLUG) {
      throw notFound('Round not found')
    }
    if (round.state !== 'ACTIVE') throw conflict('Round already ended')

    const expected = round.revealed.length
    const clientStep = Number(currentStep)
    if (!Number.isFinite(clientStep) || clientStep !== expected) {
      throw badRequest('Step desync')
    }
    if (expected >= round.gridSize) throw badRequest('Past last lane')

    const diff = CODE_TO_DIFF[round.minesCount] ?? 'easy'
    const cfg = DIFFICULTIES[diff]
    let hazards = [...round.minePositions]
    let hit = hazards.includes(expected)

    if (!hit && shouldForceHazard(game.winPct)) {
      hazards = [...hazards, expected]
      hit = true
    }

    if (hit) {
      await tx.gameRound.update({
        where: { id: round.id },
        data: {
          state: 'BUST',
          endedAt: new Date(),
          revealed: { push: expected },
          minePositions: hazards,
          multiplier: 0,
        },
      })
      await tx.game.update({
        where: { slug: GAME_SLUG },
        data: { ggr: { increment: round.bet } },
      })
      await accrueForLoss(tx, {
        userId,
        lossAmount: round.bet,
        referenceType: 'gameRound',
        referenceId: round.id,
      })
      return {
        safe: false,
        multiplier: 0,
        payout: 0,
        collided: true,
        completed: false,
        stepIndex: expected,
        vehicleKind: 'car' as const,
      }
    }

    const multiplier = cfg.multipliers[expected] ?? 1
    const completed = expected + 1 >= round.gridSize
    const provisionalPayout =
      (round.bet * BigInt(Math.round(multiplier * 10_000))) / 10_000n

    await tx.gameRound.update({
      where: { id: round.id },
      data: {
        revealed: { push: expected },
        multiplier,
        ...(completed ? { state: 'CASHED_OUT' as const, endedAt: new Date() } : {}),
      },
    })

    // Auto-cashout on final lane
    if (completed) {
      const payout = provisionalPayout
      if (payout > 0n) {
        await post(tx, {
          type: 'GAME_WIN',
          referenceType: 'chicken-road-win',
          referenceId: round.id,
          meta: { game: GAME_SLUG, multiplier },
          legs: [
            { account: { system: 'HOUSE' }, direction: 'DEBIT', amount: payout },
            { account: { userId, bucket: 'MAIN' }, direction: 'CREDIT', amount: payout },
          ],
        })
        await clawbackForWin(tx, {
          userId,
          winAmount: payout,
          referenceType: 'gameRound',
          referenceId: round.id,
        })
        await tx.gameRound.update({ where: { id: round.id }, data: { payout } })
        await tx.game.update({
          where: { slug: GAME_SLUG },
          data: { ggr: { increment: round.bet - payout } },
        })
      }
      return {
        safe: true,
        multiplier,
        payout: toRupees(payout),
        collided: false,
        completed: true,
        stepIndex: expected,
      }
    }

    return {
      safe: true,
      multiplier,
      payout: toRupees(provisionalPayout),
      collided: false,
      completed: false,
      stepIndex: expected,
    }
  })
}

export async function cashout(userId: string, roundId: string) {
  await getGame()

  return runMoneyTx(async (tx) => {
    const round = await tx.gameRound.findUnique({ where: { id: roundId } })
    if (!round || round.userId !== userId || round.gameSlug !== GAME_SLUG) {
      throw notFound('Round not found')
    }
    if (round.state !== 'ACTIVE') throw conflict('Round already ended')
    if (round.revealed.length <= 0) throw badRequest('No steps taken')

    const diff = CODE_TO_DIFF[round.minesCount] ?? 'easy'
    const cfg = DIFFICULTIES[diff]
    const last = round.revealed.length - 1
    const multiplier = (cfg.multipliers[last] ?? round.multiplier) || 1
    const payout = (round.bet * BigInt(Math.round(multiplier * 10_000))) / 10_000n

    if (payout > 0n) {
      await post(tx, {
        type: 'GAME_WIN',
        referenceType: 'chicken-road-win',
        referenceId: round.id,
        meta: { game: GAME_SLUG, multiplier },
        legs: [
          { account: { system: 'HOUSE' }, direction: 'DEBIT', amount: payout },
          { account: { userId, bucket: 'MAIN' }, direction: 'CREDIT', amount: payout },
        ],
      })
      await clawbackForWin(tx, {
        userId,
        winAmount: payout,
        referenceType: 'gameRound',
        referenceId: round.id,
      })
    }

    await tx.gameRound.update({
      where: { id: round.id },
      data: { state: 'CASHED_OUT', payout, multiplier, endedAt: new Date() },
    })
    await tx.game.update({
      where: { slug: GAME_SLUG },
      data: { ggr: { increment: round.bet - payout } },
    })

    return { payout: toRupees(payout), multiplier, success: true }
  })
}
