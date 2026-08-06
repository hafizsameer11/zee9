import crypto from 'node:crypto'
import { prisma } from '../../lib/prisma.js'
import { runMoneyTx } from '../../core/tx.js'
import { post, getBalances } from '../../core/ledger.js'
import { toPaisa, toRupees } from '../../lib/money.js'
import { badRequest, notFound, unprocessable } from '../../core/errors.js'
import { recordWagerAndRelease } from '../../core/wager.js'
import { accrueForLoss, clawbackForWin } from '../commission/commission.service.js'
import {
  buyFeatureAuthoritative,
  spinAuthoritative,
  usesAuthoritativeMath,
} from './slotMath/index.js'
import { FEATURE_BUY_MULT } from './slotMath/bountyTrail.js'

type PendingFeatureBuy = {
  userId: string
  slug: SlotSlug
  winPaisa: bigint
  createdAt: number
}

const pendingFeatureBuys = new Map<string, PendingFeatureBuy>()
const PENDING_FEATURE_TTL_MS = 30 * 60 * 1000

function purgeStalePendingFeatureBuys() {
  const now = Date.now()
  for (const [id, pending] of pendingFeatureBuys) {
    if (now - pending.createdAt > PENDING_FEATURE_TTL_MS) pendingFeatureBuys.delete(id)
  }
}

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

function buildPayload(slug: SlotSlug, betRupees: number, winRupees: number) {
  switch (slug) {
    case 'money-coming':
      return moneyComingPayload(betRupees, winRupees)
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

    let winRupeesRolled: number
    let payload: Record<string, unknown>

    if (usesAuthoritativeMath(slug)) {
      const outcome = spinAuthoritative(slug, betRupees, game.winPct)
      winRupeesRolled = outcome.winRupees
      payload = outcome.payload
    } else {
      const winPaisaRolled = rollWinPaisa(bet, game.winPct)
      winRupeesRolled = toRupees(winPaisaRolled)
      payload = buildPayload(slug, betRupees, winRupeesRolled) as Record<string, unknown>
    }

    const payloadWin = winRupeesRolled
    const winPaisa = toPaisa(payloadWin)
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
      payload,
    }
  })
}

/** Feature Buy — debit cost now, credit win after bonus animation (wild-bounty / bounty-trail). */
export async function buyFeature(userId: string, slugRaw: string, betRupees: number) {
  if (!isSlotSlug(slugRaw)) throw badRequest('Unknown slot')
  const slug = slugRaw
  if (slug !== 'bounty-trail' && slug !== 'wild-bounty') {
    throw badRequest('Feature buy not supported for this game')
  }
  const game = await getGame(slug)
  const costRupees = Math.round(betRupees * FEATURE_BUY_MULT * 100) / 100
  const costPaisa = toPaisa(costRupees)
  if (costPaisa <= 0n) throw badRequest('Invalid bet')

  return runMoneyTx(async (tx) => {
    const bal = await getBalances(tx, userId)
    if (bal.MAIN! < costPaisa) throw unprocessable('Insufficient balance')

    await post(tx, {
      type: 'GAME_BET',
      referenceType: `${slug}-feature-buy`,
      referenceId: userId,
      meta: { game: slug, kind: 'feature-buy' },
      assertNonNegative: [{ userId, bucket: 'MAIN' }],
      legs: [
        { account: { userId, bucket: 'MAIN' }, direction: 'DEBIT', amount: costPaisa },
        { account: { system: 'HOUSE' }, direction: 'CREDIT', amount: costPaisa },
      ],
    })

    const outcome = buyFeatureAuthoritative(slug, betRupees, game.winPct)
    const winPaisa = toPaisa(outcome.winRupees)

    purgeStalePendingFeatureBuys()
    const settlementId = `${userId}-${Date.now()}-${crypto.randomInt(1000, 9999)}`
    if (winPaisa > 0n) {
      pendingFeatureBuys.set(settlementId, {
        userId,
        slug,
        winPaisa,
        createdAt: Date.now(),
      })
    } else {
      await accrueForLoss(tx, {
        userId,
        lossAmount: costPaisa,
        referenceType: `${slug}-feature-buy`,
        referenceId: userId,
      })
    }

    await tx.game.update({
      where: { slug },
      data: {
        plays: { increment: 1 },
        ggr: { increment: costPaisa - winPaisa },
      },
    })
    await recordWagerAndRelease(tx, userId, costPaisa)

    return {
      slug,
      bet: betRupees,
      cost: costRupees,
      win: outcome.winRupees,
      source: 'server' as const,
      settlementId,
      credited: false,
      payload: outcome.payload,
    }
  })
}

/** Credit a deferred feature-buy win after the client finishes the bonus presentation. */
export async function completeFeatureBuy(
  userId: string,
  slugRaw: string,
  settlementId: string,
) {
  if (!isSlotSlug(slugRaw)) throw badRequest('Unknown slot')
  const slug = slugRaw
  purgeStalePendingFeatureBuys()
  const pending = pendingFeatureBuys.get(settlementId)
  if (!pending || pending.userId !== userId || pending.slug !== slug) {
    throw badRequest('Invalid or expired settlement')
  }
  pendingFeatureBuys.delete(settlementId)

  if (pending.winPaisa <= 0n) {
    return {
      slug,
      win: 0,
      source: 'server' as const,
      settlementId,
      credited: true,
    }
  }

  return runMoneyTx(async (tx) => {
    await post(tx, {
      type: 'GAME_WIN',
      referenceType: `${slug}-feature-win`,
      referenceId: settlementId,
      meta: { game: slug, kind: 'feature-buy-win' },
      legs: [
        { account: { system: 'HOUSE' }, direction: 'DEBIT', amount: pending.winPaisa },
        { account: { userId, bucket: 'MAIN' }, direction: 'CREDIT', amount: pending.winPaisa },
      ],
    })
    await clawbackForWin(tx, {
      userId,
      winAmount: pending.winPaisa,
      referenceType: `${slug}-feature-win`,
      referenceId: userId,
    })

    return {
      slug,
      win: toRupees(pending.winPaisa),
      source: 'server' as const,
      settlementId,
      credited: true,
    }
  })
}
