import crypto from 'node:crypto'
import { prisma } from '../../lib/prisma.js'
import { runMoneyTx } from '../../core/tx.js'
import { post, getBalances } from '../../core/ledger.js'
import { toPaisa, toRupees } from '../../lib/money.js'
import { badRequest, forbidden, notFound, unprocessable } from '../../core/errors.js'
import { recordWagerAndRelease } from '../../core/wager.js'
import { accrueForLoss, clawbackForWin } from '../commission/commission.service.js'
import {
  buyFeatureAuthoritative,
  FEATURE_BUY_MULT,
  spinAuthoritative,
  usesAuthoritativeMath,
} from './slotMath/index.js'

export const SLOT_SLUGS = [
  'money-coming',
  'fortune-gems-2',
  'bounty-trail',
  'wild-bounty',
  'super-ace',
  'double-fortune',
] as const

export type SlotSlug = (typeof SLOT_SLUGS)[number]

function isSlotSlug(s: string): s is SlotSlug {
  return (SLOT_SLUGS as readonly string[]).includes(s)
}

async function getGame(slug: SlotSlug) {
  const game = await prisma.game.findUnique({ where: { slug } })
  if (!game) throw notFound(`${slug} not configured`)
  if (!game.enabled) throw unprocessable(`${slug} is currently disabled`)
  return game
}

/** Target RTP from winPct; returns win in paisa (0 = loss). Legacy path for non-authoritative slots. */
function rollWinPaisa(bet: bigint, winPct: number): bigint {
  const pct = Math.max(0, Math.min(100, winPct))
  const hitChance = (pct / 100) / 2.95
  if (crypto.randomInt(0, 10_000) / 10_000 >= hitChance) return 0n
  const mult = 1.2 + (crypto.randomInt(0, 10_000) / 10_000) * 3.5
  return BigInt(Math.round(Number(bet) * mult))
}

const FG2_PAYOUT: Record<string, number> = {
  wild: 50,
  ruby: 14,
  sapphire: 12,
  emerald: 10,
  A: 6,
  K: 5,
  Q: 4,
  J: 3,
}

function fortuneGemsPayload(betRupees: number, targetWinRupees: number) {
  const symbols = ['J', 'Q', 'K', 'A', 'ruby', 'sapphire', 'emerald', 'wild'] as const
  const paylines = [
    [0, 1, 2],
    [3, 4, 5],
    [6, 7, 8],
    [0, 4, 8],
    [6, 4, 2],
  ] as const
  const lineWins = (grid: readonly string[], cells: readonly number[]) => {
    const line = cells.map((i) => grid[i]!)
    const base = line.find((symbol) => symbol !== 'wild') ?? 'wild'
    return line.every((symbol) => symbol === base || symbol === 'wild')
  }
  let grid = Array.from({ length: 9 }, () => symbols[crypto.randomInt(0, symbols.length)]!)
  const mults = [2, 3, 5, 10, 15] as const
  let special: { kind: 'mult' | 'wheel'; value?: number; color?: 'green' | 'red' } = {
    kind: 'mult',
    value: 2,
  }

  if (targetWinRupees > 0) {
    if (targetWinRupees >= 50 && crypto.randomInt(0, 100) < 22) {
      const s = symbols[crypto.randomInt(0, 4)]!
      grid[3] = s
      grid[4] = s
      grid[5] = s
      special = { kind: 'wheel', color: crypto.randomInt(0, 2) === 0 ? 'green' : 'red' }
      return { grid, special, win: targetWinRupees }
    }

    let best = {
      payout: 0,
      sym: 'J' as (typeof symbols)[number],
      mult: 2 as (typeof mults)[number],
      diff: Number.POSITIVE_INFINITY,
    }
    for (const mult of mults) {
      for (const sym of ['J', 'Q', 'K', 'A'] as const) {
        const base = Math.round(betRupees * FG2_PAYOUT[sym]! * 100) / 100
        const payout = Math.round(base * mult * 100) / 100
        const diff = Math.abs(payout - targetWinRupees)
        if (diff < best.diff) best = { payout, sym, mult, diff }
      }
    }
    grid[3] = best.sym
    grid[4] = best.sym
    grid[5] = best.sym
    special = { kind: 'mult', value: best.mult }
    return { grid, special, win: best.payout }
  } else {
    for (let attempt = 0; attempt < 40 && paylines.some((line) => lineWins(grid, line)); attempt++) {
      grid = Array.from({ length: 9 }, () => symbols[crypto.randomInt(0, symbols.length)]!)
    }
    if (paylines.some((line) => lineWins(grid, line))) {
      grid = ['J', 'Q', 'K', 'A', 'J', 'Q', 'K', 'A', 'Q']
    }
    special = { kind: 'mult', value: mults[crypto.randomInt(0, 3)]! }
  }

  return { grid, special, win: 0 }
}

function superAcePayload(winRupees: number) {
  return {
    totalWin: winRupees,
    triggerFreeSpins: false,
  }
}

function doubleFortunePayload(betRupees: number, winRupees: number) {
  const pay = ['J', 'Q', 'K', 'A', 'cakes', 'envelopes', 'shoes', 'rings', 'happiness'] as const
  const grid: string[][] = Array.from({ length: 5 }, () =>
    Array.from({ length: 3 }, () => pay[crypto.randomInt(0, pay.length)]!),
  )
  if (winRupees <= 0) {
    for (let row = 0; row < 3; row++) {
      grid[0]![row] = 'J'
      grid[1]![row] = 'A'
    }
    return { grid, totalWin: 0, triggerFreeSpins: false, appliedMult: 1 }
  }
  const sym =
    winRupees >= betRupees * 10
      ? 'happiness'
      : winRupees >= betRupees * 4
        ? 'rings'
        : winRupees >= betRupees * 2
          ? 'shoes'
          : 'envelopes'
  const len = winRupees >= betRupees * 5 ? 5 : winRupees >= betRupees * 2 ? 4 : 3
  for (let c = 0; c < len; c++) {
    grid[c]![1] = c === 2 && len >= 4 ? 'wild' : sym
  }
  return { grid, totalWin: winRupees, triggerFreeSpins: false, appliedMult: 1 }
}

function buildLegacyPayload(slug: SlotSlug, betRupees: number, winRupees: number) {
  switch (slug) {
    case 'fortune-gems-2':
      return fortuneGemsPayload(betRupees, winRupees)
    case 'super-ace':
      return superAcePayload(winRupees)
    case 'double-fortune':
      return doubleFortunePayload(betRupees, winRupees)
    default:
      return { win: winRupees }
  }
}

type TxClient = Parameters<Parameters<typeof runMoneyTx>[0]>[0]

async function settleSpin(
  tx: TxClient,
  opts: {
    userId: string
    slug: SlotSlug
    betPaisa: bigint
    winPaisa: bigint
    kind: string
  },
) {
  const { userId, slug, betPaisa, winPaisa, kind } = opts
  if (winPaisa > 0n) {
    await post(tx, {
      type: 'GAME_WIN',
      referenceType: `${slug}-win`,
      referenceId: `${userId}-${Date.now()}`,
      meta: { game: slug, kind },
      legs: [
        { account: { system: 'HOUSE' }, direction: 'DEBIT', amount: winPaisa },
        { account: { userId, bucket: 'MAIN' }, direction: 'CREDIT', amount: winPaisa },
      ],
    })
    await clawbackForWin(tx, {
      userId,
      winAmount: winPaisa,
      referenceType: `${slug}-win`,
      referenceId: userId,
    })
  } else {
    await accrueForLoss(tx, {
      userId,
      lossAmount: betPaisa,
      referenceType: `${slug}-bet`,
      referenceId: userId,
    })
  }

  await tx.game.update({
    where: { slug },
    data: {
      plays: { increment: 1 },
      ggr: { increment: betPaisa - winPaisa },
    },
  })
  await recordWagerAndRelease(tx, userId, betPaisa)
}

/**
 * Atomic server spin: debit bet, roll win via winPct RTP, credit win, bump plays/ggr.
 */
export async function spin(userId: string, slugRaw: string, betRupees: number) {
  if (!isSlotSlug(slugRaw)) throw badRequest('Unknown slot')
  const slug = slugRaw
  const game = await getGame(slug)
  const bet = toPaisa(betRupees)
  if (bet <= 0n) throw badRequest('Invalid bet')

  return runMoneyTx(async (tx) => {
    const bal = await getBalances(tx, userId)
    if (bal.MAIN! < bet) throw unprocessable('Insufficient balance')

    await post(tx, {
      type: 'GAME_BET',
      referenceType: `${slug}-bet`,
      referenceId: userId,
      meta: { game: slug, kind: 'spin' },
      assertNonNegative: [{ userId, bucket: 'MAIN' }],
      legs: [
        { account: { userId, bucket: 'MAIN' }, direction: 'DEBIT', amount: bet },
        { account: { system: 'HOUSE' }, direction: 'CREDIT', amount: bet },
      ],
    })

    let winPaisa: bigint
    let payload: Record<string, unknown>

    if (usesAuthoritativeMath(slug)) {
      const outcome = spinAuthoritative(slug, betRupees, game.winPct)
      winPaisa = toPaisa(outcome.winRupees)
      payload = outcome.payload
    } else {
      winPaisa = rollWinPaisa(bet, game.winPct)
      const rolledWin = toRupees(winPaisa)
      payload = buildLegacyPayload(slug, betRupees, rolledWin) as Record<string, unknown>
      if (slug === 'fortune-gems-2' && typeof payload.win === 'number') {
        winPaisa = toPaisa(payload.win)
      }
    }

    await settleSpin(tx, {
      userId,
      slug,
      betPaisa: bet,
      winPaisa,
      kind: 'spin-win',
    })

    return {
      slug,
      bet: betRupees,
      win: toRupees(winPaisa),
      source: 'server' as const,
      payload,
    }
  })
}

/**
 * Feature Buy: debit FEATURE_BUY_MULT × bet, run free-spin package.
 * Win is credited when the client calls completeFeatureBuy after the bonus animation.
 */
export async function buyFeature(userId: string, slugRaw: string, betRupees: number) {
  if (!isSlotSlug(slugRaw)) throw badRequest('Unknown slot')
  const slug = slugRaw
  if (slug !== 'bounty-trail' && slug !== 'wild-bounty') {
    throw badRequest('Feature buy not available for this game')
  }
  const game = await getGame(slug)
  if (betRupees <= 0) throw badRequest('Invalid bet')
  const costRupees = Math.round(betRupees * FEATURE_BUY_MULT * 100) / 100
  const cost = toPaisa(costRupees)
  if (cost <= 0n) throw badRequest('Invalid feature cost')
  const settlementId = `${userId}-${Date.now()}-${crypto.randomBytes(4).toString('hex')}`

  return runMoneyTx(async (tx) => {
    const bal = await getBalances(tx, userId)
    if (bal.MAIN! < cost) throw unprocessable('Insufficient balance')

    const outcome = buyFeatureAuthoritative(slug, betRupees, game.winPct)
    const winPaisa = toPaisa(outcome.winRupees)

    await post(tx, {
      type: 'GAME_BET',
      referenceType: `${slug}-feature-bet`,
      referenceId: settlementId,
      idempotencyKey: `feature-buy-${settlementId}`,
      meta: {
        game: slug,
        kind: 'feature-buy',
        bet: betRupees,
        userId,
        pendingWinPaisa: winPaisa.toString(),
      },
      assertNonNegative: [{ userId, bucket: 'MAIN' }],
      legs: [
        { account: { userId, bucket: 'MAIN' }, direction: 'DEBIT', amount: cost },
        { account: { system: 'HOUSE' }, direction: 'CREDIT', amount: cost },
      ],
    })

    await accrueForLoss(tx, {
      userId,
      lossAmount: cost,
      referenceType: `${slug}-feature-bet`,
      referenceId: settlementId,
    })
    await tx.game.update({
      where: { slug },
      data: {
        plays: { increment: 1 },
        ggr: { increment: cost },
      },
    })
    await recordWagerAndRelease(tx, userId, cost)

    return {
      slug,
      bet: betRupees,
      cost: costRupees,
      win: toRupees(winPaisa),
      settlementId,
      credited: false,
      source: 'server' as const,
      payload: outcome.payload,
    }
  })
}

/**
 * Credit a deferred feature-buy win after the client finishes the bonus animation.
 */
export async function completeFeatureBuy(userId: string, slugRaw: string, settlementId: string) {
  if (!isSlotSlug(slugRaw)) throw badRequest('Unknown slot')
  const slug = slugRaw
  if (slug !== 'bounty-trail' && slug !== 'wild-bounty') {
    throw badRequest('Feature buy not available for this game')
  }
  if (!settlementId || settlementId.length > 128) throw badRequest('Invalid settlement')

  return runMoneyTx(async (tx) => {
    const pending = await tx.ledgerTransaction.findFirst({
      where: {
        type: 'GAME_BET',
        referenceType: `${slug}-feature-bet`,
        referenceId: settlementId,
      },
    })
    if (!pending) throw notFound('Feature buy not found')

    const meta = (pending.meta ?? {}) as {
      userId?: string
      pendingWinPaisa?: string
    }
    if (meta.userId !== userId) throw forbidden('Feature buy does not belong to this player')

    const winPaisa = BigInt(meta.pendingWinPaisa ?? '0')

    const existingWin = await tx.ledgerTransaction.findFirst({
      where: {
        type: 'GAME_WIN',
        referenceType: `${slug}-feature-win`,
        referenceId: settlementId,
      },
    })
    if (existingWin) {
      return {
        slug,
        settlementId,
        win: toRupees(winPaisa),
        credited: true,
        source: 'server' as const,
      }
    }

    if (winPaisa > 0n) {
      await post(tx, {
        type: 'GAME_WIN',
        referenceType: `${slug}-feature-win`,
        referenceId: settlementId,
        idempotencyKey: `feature-win-${settlementId}`,
        meta: { game: slug, kind: 'feature-win' },
        legs: [
          { account: { system: 'HOUSE' }, direction: 'DEBIT', amount: winPaisa },
          { account: { userId, bucket: 'MAIN' }, direction: 'CREDIT', amount: winPaisa },
        ],
      })
      await clawbackForWin(tx, {
        userId,
        winAmount: winPaisa,
        referenceType: `${slug}-feature-win`,
        referenceId: settlementId,
      })
      await tx.game.update({
        where: { slug },
        data: { ggr: { decrement: winPaisa } },
      })
    }

    return {
      slug,
      settlementId,
      win: toRupees(winPaisa),
      credited: true,
      source: 'server' as const,
    }
  })
}
