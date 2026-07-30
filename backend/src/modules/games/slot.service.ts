import crypto from 'node:crypto'
import { prisma } from '../../lib/prisma.js'
import { runMoneyTx } from '../../core/tx.js'
import { post, getBalances } from '../../core/ledger.js'
import { toPaisa, toRupees } from '../../lib/money.js'
import { badRequest, notFound, unprocessable } from '../../core/errors.js'
import { recordWagerAndRelease } from '../../core/wager.js'
import { accrueForLoss, clawbackForWin } from '../commission/commission.service.js'

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

/** Target RTP from winPct; returns win in paisa (0 = loss). */
function rollWinPaisa(bet: bigint, winPct: number): bigint {
  const pct = Math.max(0, Math.min(100, winPct))
  // Uniform 1.2–4.7× wins average 2.95×. Divide target RTP by that
  // average so configured winPct remains the actual long-run return.
  const hitChance = (pct / 100) / 2.95
  if (crypto.randomInt(0, 10_000) / 10_000 >= hitChance) return 0n
  const mult = 1.2 + (crypto.randomInt(0, 10_000) / 10_000) * 3.5 // 1.2–4.7x
  return BigInt(Math.round(Number(bet) * mult))
}

function moneyComingPayload(betRupees: number, winRupees: number) {
  const nums = [0, 1, 2, 3, 5, 10] as const
  const mults = ['—', '2x', '5x', '10x'] as const
  if (winRupees <= 0) {
    let a = nums[crypto.randomInt(0, nums.length)]!
    let b = nums[crypto.randomInt(0, nums.length)]!
    let c = nums[crypto.randomInt(0, nums.length)]!
    // The client also pays any two matching reels, so a server loss must show
    // three distinct values.
    while (new Set([a, b, c]).size < 3) {
      a = nums[crypto.randomInt(0, nums.length)]!
      b = nums[crypto.randomInt(0, nums.length)]!
      c = nums[crypto.randomInt(0, nums.length)]!
    }
    return { reels: [a, b, c], mult: mults[crypto.randomInt(0, mults.length)], win: 0 }
  }
  const n = nums[crypto.randomInt(1, nums.length)]! // avoid 0 for clear win look
  const mult = winRupees >= betRupees * 5 ? '5x' : winRupees >= betRupees * 2 ? '2x' : '—'
  return { reels: [n, n, n], mult, win: winRupees }
}

function fortuneGemsPayload(winRupees: number) {
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

  if (winRupees > 0) {
    // Force a clear middle-row match so the client can highlight real winning cells
    const s = symbols[crypto.randomInt(0, 4)]! // J/Q/K/A
    grid[3] = s
    grid[4] = s
    grid[5] = s
    if (winRupees >= 50 && crypto.randomInt(0, 100) < 22) {
      special = { kind: 'wheel', color: crypto.randomInt(0, 2) === 0 ? 'green' : 'red' }
    } else {
      special = {
        kind: 'mult',
        value: mults[Math.min(mults.length - 1, Math.floor(winRupees / 40))]!,
      }
    }
  } else {
    // A server loss must never display a locally valid payline.
    for (let attempt = 0; attempt < 40 && paylines.some((line) => lineWins(grid, line)); attempt++) {
      grid = Array.from({ length: 9 }, () => symbols[crypto.randomInt(0, symbols.length)]!)
    }
    if (paylines.some((line) => lineWins(grid, line))) {
      grid = ['J', 'Q', 'K', 'A', 'J', 'Q', 'K', 'A', 'Q']
    }
    special = { kind: 'mult', value: mults[crypto.randomInt(0, 3)]! }
  }

  return { grid, special, win: winRupees }
}

function bountyPayload(winRupees: number) {
  const ids = ['A', 'K', 'Q', 'J', '10', 'wild', 'scatter']
  const grid = Array.from({ length: 5 }, () =>
    Array.from({ length: 3 }, () => ({
      id: ids[crypto.randomInt(0, ids.length)]!,
      gold: false,
      goldMult: 1,
    })),
  )
  return { grid, totalWin: winRupees, appliedMult: winRupees > 0 ? 2 : 1, triggerFreeSpins: false }
}

function superAcePayload(winRupees: number) {
  return {
    totalWin: winRupees,
    /** Free spins stay client-demo only; live money settles on this spin. */
    triggerFreeSpins: false,
  }
}

/** 5×3 symbol grid matching client Double Fortune ids (visual only; money from winRupees). */
function doubleFortunePayload(betRupees: number, winRupees: number) {
  const pay = ['J', 'Q', 'K', 'A', 'cakes', 'envelopes', 'shoes', 'rings', 'happiness'] as const
  const grid: string[][] = Array.from({ length: 5 }, () =>
    Array.from({ length: 3 }, () => pay[crypto.randomInt(0, pay.length)]!),
  )
  if (winRupees <= 0) {
    // Every payline starts on reels 0 and 1. Different non-wild symbols there
    // guarantee that a server loss cannot look like a client-side line win.
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

function buildPayload(slug: SlotSlug, betRupees: number, winRupees: number) {
  switch (slug) {
    case 'money-coming':
      return moneyComingPayload(betRupees, winRupees)
    case 'fortune-gems-2':
      return fortuneGemsPayload(winRupees)
    case 'bounty-trail':
    case 'wild-bounty':
      return bountyPayload(winRupees)
    case 'super-ace':
      return superAcePayload(winRupees)
    case 'double-fortune':
      return doubleFortunePayload(betRupees, winRupees)
    default:
      return { win: winRupees }
  }
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

    const winPaisa = rollWinPaisa(bet, game.winPct)
    if (winPaisa > 0n) {
      await post(tx, {
        type: 'GAME_WIN',
        referenceType: `${slug}-win`,
        referenceId: `${userId}-${Date.now()}`,
        meta: { game: slug, kind: 'spin-win' },
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
        lossAmount: bet,
        referenceType: `${slug}-bet`,
        referenceId: userId,
      })
    }

    await tx.game.update({
      where: { slug },
      data: {
        plays: { increment: 1 },
        ggr: { increment: bet - winPaisa },
      },
    })
    await recordWagerAndRelease(tx, userId, bet)

    const winRupees = toRupees(winPaisa)
    return {
      slug,
      bet: betRupees,
      win: winRupees,
      source: 'server' as const,
      payload: buildPayload(slug, betRupees, winRupees),
    }
  })
}
