import crypto from 'node:crypto'
import { prisma } from '../../lib/prisma.js'
import { runMoneyTx } from '../../core/tx.js'
import { post } from '../../core/ledger.js'
import { getBalances } from '../../core/ledger.js'
import { toPaisa } from '../../lib/money.js'
import { badRequest, conflict, notFound, unprocessable } from '../../core/errors.js'
import { recordWagerAndRelease } from '../../core/wager.js'
import { accrueForLoss } from '../commission/commission.service.js'

const GRID = 25

/** Fair (no-edge) multiplier after revealing `revealed` safe tiles with `mines` mines. */
function fairMultiplier(revealed: number, mines: number): number {
  let m = 1
  for (let i = 0; i < revealed; i++) {
    m *= (GRID - i) / (GRID - mines - i)
  }
  return m
}

/** Applied multiplier = RTP (admin winPct) × fair multiplier. */
function multiplierFor(revealed: number, mines: number, winPct: number): number {
  if (revealed === 0) return 0
  return (winPct / 100) * fairMultiplier(revealed, mines)
}

function pickMines(count: number): number[] {
  const set = new Set<number>()
  while (set.size < count) set.add(crypto.randomInt(0, GRID))
  return [...set]
}

async function getGame() {
  const game = await prisma.game.findUnique({ where: { slug: 'mines' } })
  if (!game) throw notFound('Mines game not configured')
  if (!game.enabled) throw unprocessable('Mines is currently disabled')
  return game
}

export async function start(userId: string, betRupees: number, minesCount: number) {
  if (minesCount < 1 || minesCount > 24) throw badRequest('Mines must be 1–24')
  const game = await getGame()
  const bet = toPaisa(betRupees)
  if (bet <= 0n) throw badRequest('Invalid bet')

  return runMoneyTx(async (tx) => {
    const bal = await getBalances(tx, userId)
    if (bal.MAIN! < bet) throw unprocessable('Insufficient balance')

    // Take the bet: player MAIN -> HOUSE
    await post(tx, {
      type: 'ADMIN_ADJUST',
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

export async function reveal(userId: string, roundId: string, tile: number) {
  if (tile < 0 || tile >= GRID) throw badRequest('Invalid tile')
  const game = await getGame()

  return runMoneyTx(async (tx) => {
    const round = await tx.gameRound.findUnique({ where: { id: roundId } })
    if (!round || round.userId !== userId) throw notFound('Round not found')
    if (round.state !== 'ACTIVE') throw conflict('Round already ended')
    if (round.revealed.includes(tile)) throw badRequest('Tile already revealed')

    // Hit a mine → bust (bet already taken by house)
    if (round.minePositions.includes(tile)) {
      await tx.gameRound.update({
        where: { id: roundId },
        data: { state: 'BUST', endedAt: new Date(), revealed: { push: tile } },
      })
      await tx.game.update({ where: { slug: 'mines' }, data: { ggr: { increment: round.bet } } })
      await accrueForLoss(tx, { userId, lossAmount: round.bet, referenceType: 'gameRound', referenceId: roundId })
      return { safe: false, tile, mines: round.minePositions, state: 'BUST' as const, multiplier: 0, payout: 0 }
    }

    // Safe reveal
    const revealedCount = round.revealed.length + 1
    const mult = multiplierFor(revealedCount, round.minesCount, game.winPct)
    await tx.gameRound.update({
      where: { id: roundId },
      data: { revealed: { push: tile }, multiplier: mult },
    })

    const maxSafe = GRID - round.minesCount
    // Auto cash-out if the whole board is cleared
    if (revealedCount >= maxSafe) {
      return cashoutInner(tx, round.id, userId, round.bet, mult, round.minePositions)
    }

    return { safe: true, tile, state: 'ACTIVE' as const, multiplier: mult, revealedCount, nextMultiplier: multiplierFor(revealedCount + 1, round.minesCount, game.winPct) }
  })
}

async function cashoutInner(tx: any, roundId: string, userId: string, bet: bigint, mult: number, mines: number[]) {
  const payout = (bet * BigInt(Math.round(mult * 10000))) / 10000n
  await tx.gameRound.update({ where: { id: roundId }, data: { state: 'CASHED_OUT', payout, endedAt: new Date() } })
  // House pays out: HOUSE -> player MAIN
  await post(tx, {
    type: 'ADMIN_ADJUST',
    referenceType: 'mines-win',
    referenceId: roundId,
    idempotencyKey: `mines-win:${roundId}`,
    meta: { game: 'mines', kind: 'win' },
    legs: [
      { account: { system: 'HOUSE' }, direction: 'DEBIT', amount: payout },
      { account: { userId, bucket: 'MAIN' }, direction: 'CREDIT', amount: payout },
    ],
  })
  // GGR = bet - payout (can be negative when player wins)
  await tx.game.update({ where: { slug: 'mines' }, data: { ggr: { increment: bet - payout } } })
  return { safe: true, state: 'CASHED_OUT' as const, multiplier: mult, payout: Number(payout) / 100, mines }
}

export async function cashout(userId: string, roundId: string) {
  const game = await getGame()
  return runMoneyTx(async (tx) => {
    const round = await tx.gameRound.findUnique({ where: { id: roundId } })
    if (!round || round.userId !== userId) throw notFound('Round not found')
    if (round.state !== 'ACTIVE') throw conflict('Round already ended')
    if (round.revealed.length === 0) throw badRequest('Reveal at least one tile before cashing out')
    return cashoutInner(tx, round.id, userId, round.bet, round.multiplier, round.minePositions)
  })
}
