import crypto from 'node:crypto'
import { prisma } from '../../lib/prisma.js'
import { runMoneyTx } from '../../core/tx.js'
import { post } from '../../core/ledger.js'
import { getBalances } from '../../core/ledger.js'
import { toPaisa } from '../../lib/money.js'
import { badRequest, conflict, notFound, unprocessable } from '../../core/errors.js'
import { recordWagerAndRelease } from '../../core/wager.js'
import { accrueForLoss, clawbackForWin } from '../commission/commission.service.js'

const GRID = 25

/**
 * Fair (no-edge) multiplier after revealing `revealed` safe tiles.
 * Shown to the player and used for real payouts — win% never scales this down.
 */
function fairMultiplier(revealed: number, mines: number): number {
  if (revealed <= 0) return 0
  let m = 1
  for (let i = 0; i < revealed; i++) {
    m *= (GRID - i) / (GRID - mines - i)
  }
  return m
}

function pickMines(count: number): number[] {
  const set = new Set<number>()
  while (set.size < count) set.add(crypto.randomInt(0, GRID))
  return [...set]
}

/**
 * Admin win% steers outcomes invisibly (not payout math).
 * 100% → never force a mine under a safe click
 * 0%   → always force a mine on the first click (house keeps the bet)
 * Mid  → probabilistic forced hits so long-run RTP tracks win%
 */
function shouldForceMine(winPct: number): boolean {
  const pct = Math.max(0, Math.min(100, winPct))
  if (pct >= 100) return false
  if (pct <= 0) return true
  // chance to secretly place a mine under this click
  const forceChance = 1 - pct / 100
  return crypto.randomInt(0, 10_000) / 10_000 < forceChance
}

/**
 * Move one mine from an unrevealed mine tile onto `tile` so the board
 * stays consistent when we reveal all mines on bust.
 */
function relocateMineOnto(mines: number[], tile: number, revealed: number[]): number[] | null {
  const revealedSet = new Set(revealed)
  const candidates = mines.filter((m) => m !== tile && !revealedSet.has(m))
  if (candidates.length === 0) return null
  const donor = candidates[crypto.randomInt(0, candidates.length)]!
  return mines.map((m) => (m === donor ? tile : m))
}

async function getGame() {
  const game = await prisma.game.findUnique({ where: { slug: 'mines' } })
  if (!game) throw notFound('Mines game not configured')
  if (!game.enabled) throw unprocessable('Mines is currently disabled')
  return game
}

export async function start(userId: string, betRupees: number, minesCount: number) {
  if (minesCount < 1 || minesCount > 24) throw badRequest('Mines must be 1–24')
  await getGame()
  const bet = toPaisa(betRupees)
  if (bet <= 0n) throw badRequest('Invalid bet')

  return runMoneyTx(async (tx) => {
    const bal = await getBalances(tx, userId)
    if (bal.MAIN! < bet) throw unprocessable('Insufficient balance')

    await post(tx, {
      type: 'GAME_BET',
      referenceType: 'mines-bet',
      referenceId: userId,
      meta: { game: 'mines', kind: 'bet' },
      assertNonNegative: [{ userId, bucket: 'MAIN' }],
      legs: [
        { account: { userId, bucket: 'MAIN' }, direction: 'DEBIT', amount: bet },
        { account: { system: 'HOUSE' }, direction: 'CREDIT', amount: bet },
      ],
    })

    const round = await tx.gameRound.create({
      data: {
        userId,
        gameSlug: 'mines',
        bet,
        gridSize: GRID,
        minesCount,
        minePositions: pickMines(minesCount),
        revealed: [],
        multiplier: 0,
        state: 'ACTIVE',
      },
    })

    await tx.game.update({ where: { slug: 'mines' }, data: { plays: { increment: 1 } } })
    await recordWagerAndRelease(tx, userId, bet)

    return { roundId: round.id, gridSize: GRID, minesCount, bet: betRupees }
  })
}

async function bustRound(
  tx: any,
  round: { id: string; bet: bigint; minePositions: number[] },
  userId: string,
  tile: number,
  mines: number[],
) {
  await tx.gameRound.update({
    where: { id: round.id },
    data: { state: 'BUST', endedAt: new Date(), revealed: { push: tile }, minePositions: mines },
  })
  await tx.game.update({ where: { slug: 'mines' }, data: { ggr: { increment: round.bet } } })
  await accrueForLoss(tx, { userId, lossAmount: round.bet, referenceType: 'gameRound', referenceId: round.id })
  return { safe: false as const, tile, mines, state: 'BUST' as const, multiplier: 0, payout: 0 }
}

export async function reveal(userId: string, roundId: string, tile: number) {
  if (tile < 0 || tile >= GRID) throw badRequest('Invalid tile')
  const game = await getGame()

  return runMoneyTx(async (tx) => {
    const round = await tx.gameRound.findUnique({ where: { id: roundId } })
    if (!round || round.userId !== userId) throw notFound('Round not found')
    if (round.state !== 'ACTIVE') throw conflict('Round already ended')
    if (round.revealed.includes(tile)) throw badRequest('Tile already revealed')

    let mines = [...round.minePositions]

    // Natural mine hit
    if (mines.includes(tile)) {
      return bustRound(tx, round, userId, tile, mines)
    }

    // House edge: optionally force a mine under this "safe" click (player never sees why)
    if (shouldForceMine(game.winPct)) {
      const relocated = relocateMineOnto(mines, tile, round.revealed)
      if (relocated) {
        return bustRound(tx, round, userId, tile, relocated)
      }
      // No mine left to move (board almost clear) — allow fair continue
    }

    // Safe reveal — fair multiplier (normal game feel)
    const revealedCount = round.revealed.length + 1
    const mult = fairMultiplier(revealedCount, round.minesCount)
    await tx.gameRound.update({
      where: { id: roundId },
      data: { revealed: { push: tile }, multiplier: mult },
    })

    const maxSafe = GRID - round.minesCount
    if (revealedCount >= maxSafe) {
      return cashoutInner(tx, round.id, userId, round.bet, mult, mines)
    }

    return {
      safe: true as const,
      tile,
      state: 'ACTIVE' as const,
      multiplier: mult,
      revealedCount,
      nextMultiplier: fairMultiplier(revealedCount + 1, round.minesCount),
    }
  })
}

async function cashoutInner(tx: any, roundId: string, userId: string, bet: bigint, mult: number, mines: number[]) {
  const payout = (bet * BigInt(Math.round(mult * 10000))) / 10000n
  await tx.gameRound.update({
    where: { id: roundId },
    data: { state: 'CASHED_OUT', payout, endedAt: new Date(), minePositions: mines },
  })

  // Skip ledger when payout is zero (should be rare with fair mults after ≥1 gem)
  if (payout > 0n) {
    await post(tx, {
      type: 'GAME_WIN',
      referenceType: 'mines-win',
      referenceId: roundId,
      idempotencyKey: `mines-win:${roundId}`,
      meta: { game: 'mines', kind: 'win' },
      legs: [
        { account: { system: 'HOUSE' }, direction: 'DEBIT', amount: payout },
        { account: { userId, bucket: 'MAIN' }, direction: 'CREDIT', amount: payout },
      ],
    })
    await clawbackForWin(tx, {
      userId,
      winAmount: payout,
      referenceType: 'mines-win',
      referenceId: roundId,
    })
  }

  await tx.game.update({ where: { slug: 'mines' }, data: { ggr: { increment: bet - payout } } })
  return {
    safe: true as const,
    state: 'CASHED_OUT' as const,
    multiplier: mult,
    payout: Number(payout) / 100,
    mines,
  }
}

export async function cashout(userId: string, roundId: string) {
  return runMoneyTx(async (tx) => {
    const round = await tx.gameRound.findUnique({ where: { id: roundId } })
    if (!round || round.userId !== userId) throw notFound('Round not found')
    if (round.state !== 'ACTIVE') throw conflict('Round already ended')
    if (round.revealed.length === 0) throw badRequest('Reveal at least one tile before cashing out')
    // Always pay fair odds for gems already found — win% already applied via forced mines
    const mult = fairMultiplier(round.revealed.length, round.minesCount)
    return cashoutInner(tx, round.id, userId, round.bet, mult, round.minePositions)
  })
}
