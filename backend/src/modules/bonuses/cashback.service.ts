import { prisma } from '../../lib/prisma.js'
import { runMoneyTx } from '../../core/tx.js'
import { post } from '../../core/ledger.js'
import { getSettings } from '../../core/settings.js'
import { toPaisa, toRupees } from '../../lib/money.js'
import { conflict, unprocessable } from '../../core/errors.js'
import { notify } from '../../core/notify.js'
import { getEffectiveWager, releaseIfNoWager } from '../../core/wager.js'

const HOUR_MS = 60 * 60 * 1000

/** Net loss (bets − wins) in rupees since `since` (or all time if null). */
export async function computeNetLossRupees(userId: string, since: Date | null): Promise<number> {
  const createdAt = since ? { gte: since } : undefined
  const [bets, wins] = await Promise.all([
    prisma.ledgerEntry.aggregate({
      where: {
        direction: 'DEBIT',
        ...(createdAt ? { createdAt } : {}),
        account: { ownerId: userId, bucket: { in: ['MAIN', 'BONUS'] } },
        transaction: { type: 'GAME_BET' },
      },
      _sum: { amount: true },
    }),
    prisma.ledgerEntry.aggregate({
      where: {
        direction: 'CREDIT',
        ...(createdAt ? { createdAt } : {}),
        account: { ownerId: userId, bucket: { in: ['MAIN', 'BONUS'] } },
        transaction: { type: 'GAME_WIN' },
      },
      _sum: { amount: true },
    }),
  ])
  const betRs = toRupees(bets._sum.amount ?? 0n)
  const winRs = toRupees(wins._sum.amount ?? 0n)
  return Math.max(0, betRs - winRs)
}

function fmtRemain(ms: number): string {
  if (ms <= 0) return 'Ready'
  const h = Math.floor(ms / HOUR_MS)
  const m = Math.floor((ms % HOUR_MS) / 60_000)
  if (h >= 24) {
    const d = Math.floor(h / 24)
    return `${d}d ${h % 24}h`
  }
  return h > 0 ? `${h}h ${m}m` : `${m}m`
}

/**
 * Bet Rebate status:
 * - Lose ≥ rebetMinLoss (default 50,000) since last claim
 * - Then wait rebetDelayHours (default 24)
 * - Claim fixed rebetAmount (default 600)
 */
export async function getCashbackStatus(userId: string) {
  const s = await getSettings()
  const enabled = s.rebetBonus !== false
  const minLoss = Math.max(0, s.rebetMinLoss ?? 50_000)
  const amount = Math.max(0, s.rebetAmount ?? 600)
  const delayHours = Math.max(0, s.rebetDelayHours ?? 24)

  const user = await prisma.user.findUniqueOrThrow({
    where: { id: userId },
    select: { rebetUnlockAt: true, lastRebetClaimAt: true },
  })

  const lossSince = await computeNetLossRupees(userId, user.lastRebetClaimAt)
  const qualified = enabled && lossSince >= minLoss

  let unlockAt = user.rebetUnlockAt
  if (qualified && !unlockAt) {
    unlockAt = new Date(Date.now() + delayHours * HOUR_MS)
    await prisma.user.update({
      where: { id: userId },
      data: { rebetUnlockAt: unlockAt },
    })
  }
  // If they fell below somehow after unlock set, keep timer (once qualified stays).
  // If they claimed and loss resets — unlock cleared on claim.

  const now = Date.now()
  const unlockMs = unlockAt ? unlockAt.getTime() : 0
  const ready = !!unlockAt && now >= unlockMs
  const remainMs = unlockAt && !ready ? Math.max(0, unlockMs - now) : 0
  const canClaim = ready && amount > 0
  const todayBonus = canClaim ? amount : 0

  const totalClaimed = await prisma.bonus.aggregate({
    where: { userId, type: 'REBET', status: { in: ['ACTIVE', 'RELEASED'] } },
    _sum: { amount: true },
  })

  // Keep legacy shape for hooks + extra fields for Bet Rebate UI
  return {
    enabled,
    minLoss,
    rebetAmount: amount,
    delayHours,
    todayLoss: lossSince,
    lossProgress: Math.min(lossSince, minLoss),
    lossTarget: minLoss,
    currentRate: 0,
    currentTier: qualified ? 'ReBet' : null,
    eligibleAmount: todayBonus,
    todayBonus,
    claimedToday: false,
    canClaim,
    unlockAt: unlockAt?.toISOString() ?? null,
    remainMs,
    remainLabel: remainMs > 0 ? fmtRemain(remainMs) : ready ? '' : qualified ? 'Ready' : '',
    qualified,
    totalClaimed: Number(totalClaimed._sum.amount ?? 0n) / 100,
    tiers: [
      {
        id: 'rebet',
        name: 'Bet Rebate',
        minLoss,
        pct: 0,
        maxClaim: amount,
      },
    ],
  }
}

export async function claimCashback(userId: string) {
  const s = await getSettings()
  if (s.rebetBonus === false) throw conflict('Bet Rebate is disabled')
  const amountRs = Math.max(0, s.rebetAmount ?? 600)
  if (amountRs <= 0) throw unprocessable('No rebate configured')

  return runMoneyTx(async (tx) => {
    const user = await tx.user.findUniqueOrThrow({
      where: { id: userId },
      select: { rebetUnlockAt: true, lastRebetClaimAt: true },
    })
    if (!user.rebetUnlockAt || user.rebetUnlockAt.getTime() > Date.now()) {
      throw conflict('Bet Rebate not ready yet — wait for the timer')
    }

    const minLoss = Math.max(0, s.rebetMinLoss ?? 50_000)
    const lossSince = await computeNetLossRupees(userId, user.lastRebetClaimAt)
    if (lossSince < minLoss) throw unprocessable(`Need Rs ${minLoss.toLocaleString('en-PK')} loss to claim`)

    const amount = toPaisa(amountRs)
    await post(tx, {
      type: 'DAILY_BONUS',
      referenceType: 'rebet',
      referenceId: userId,
      idempotencyKey: `rebet:${userId}:${user.rebetUnlockAt.toISOString()}`,
      legs: [
        { account: { system: 'BONUS_POOL' }, direction: 'DEBIT', amount },
        { account: { userId, bucket: 'BONUS' }, direction: 'CREDIT', amount },
      ],
    })

    const { bonusWager } = await getEffectiveWager(userId, tx)
    const bonus = await tx.bonus.create({
      data: {
        userId,
        type: 'REBET',
        amount,
        wagerRequired: (amount * BigInt(Math.round(bonusWager * 100))) / 100n,
        status: 'ACTIVE',
      },
    })
    await releaseIfNoWager(tx, bonus.id)

    await tx.user.update({
      where: { id: userId },
      data: {
        lastRebetClaimAt: new Date(),
        rebetUnlockAt: null,
      },
    })

    await notify(
      tx,
      userId,
      'bonus',
      'Bet Rebate claimed',
      `You claimed Rs ${toRupees(amount).toLocaleString('en-PK')} Bet Rebate.`,
    )
    return { bonus, amount: amountRs }
  })
}

/** @deprecated alias kept for older imports */
export { computeNetLossRupees as computeTodayLoss }
