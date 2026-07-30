import { prisma } from '../../lib/prisma.js'
import { getSettings } from '../../core/settings.js'
import { runMoneyTx } from '../../core/tx.js'
import { post } from '../../core/ledger.js'
import { toPaisa, applyPct } from '../../lib/money.js'
import { conflict } from '../../core/errors.js'
import { releaseIfNoWager, getEffectiveWager } from '../../core/wager.js'
import { notify } from '../../core/notify.js'

const DAY_MS = 24 * 60 * 60 * 1000

function randAmount(min: number, max: number): number {
  const lo = Math.min(min, max)
  const hi = Math.max(min, max)
  return Math.floor(lo + Math.random() * (hi - lo + 1))
}

export async function getReturnBonusStatus(userId: string) {
  const s = await getSettings()
  const enabled = s.returnBonusEnabled !== false
  const inactiveDays = Math.max(1, s.returnBonusInactiveDays || 7)
  const min = Math.max(0, s.returnBonusMin ?? 40)
  const max = Math.max(min, s.returnBonusMax ?? 200)

  if (!enabled) {
    return { eligible: false, enabled: false, inactiveDays, min, max, inactiveMs: 0, amountHint: null as number | null }
  }

  const user = await prisma.user.findUniqueOrThrow({
    where: { id: userId },
    select: { lastPlayedAt: true, lastReturnBonusAt: true, createdAt: true },
  })

  // Must have played at least once before.
  if (!user.lastPlayedAt) {
    return { eligible: false, enabled: true, inactiveDays, min, max, inactiveMs: 0, amountHint: null }
  }

  const inactiveMs = Date.now() - user.lastPlayedAt.getTime()
  const needMs = inactiveDays * DAY_MS
  if (inactiveMs < needMs) {
    return {
      eligible: false,
      enabled: true,
      inactiveDays,
      min,
      max,
      inactiveMs,
      amountHint: null,
      remainMs: needMs - inactiveMs,
    }
  }

  // Already claimed for this inactivity window (claim sets lastPlayedAt + lastReturnBonusAt).
  if (user.lastReturnBonusAt && user.lastReturnBonusAt >= user.lastPlayedAt) {
    return { eligible: false, enabled: true, inactiveDays, min, max, inactiveMs, amountHint: null }
  }

  return {
    eligible: true,
    enabled: true,
    inactiveDays,
    min,
    max,
    inactiveMs,
    // Marketing-style mid hint; real amount rolled on claim.
    amountHint: Math.round((min + max) / 2),
  }
}

export async function claimReturnBonus(userId: string) {
  const s = await getSettings()
  if (s.returnBonusEnabled === false) throw conflict('Return bonus is disabled')
  const inactiveDays = Math.max(1, s.returnBonusInactiveDays || 7)
  const min = Math.max(0, s.returnBonusMin ?? 40)
  const max = Math.max(min, s.returnBonusMax ?? 200)
  const needMs = inactiveDays * DAY_MS

  return runMoneyTx(async (tx) => {
    const user = await tx.user.findUniqueOrThrow({
      where: { id: userId },
      select: { lastPlayedAt: true, lastReturnBonusAt: true },
    })
    if (!user.lastPlayedAt) throw conflict('Play a game first — return bonus unlocks after a break')
    const inactiveMs = Date.now() - user.lastPlayedAt.getTime()
    if (inactiveMs < needMs) throw conflict(`Come back after ${inactiveDays} days without playing`)
    if (user.lastReturnBonusAt && user.lastReturnBonusAt >= user.lastPlayedAt) {
      throw conflict('Welcome-back bonus already claimed')
    }

    const amountRupees = randAmount(min, max)
    const amount = toPaisa(amountRupees)
    if (amount > 0n) {
      await post(tx, {
        type: 'DAILY_BONUS',
        referenceType: 'return-bonus',
        referenceId: userId,
        idempotencyKey: `return:${userId}:${user.lastPlayedAt.toISOString()}`,
        legs: [
          { account: { system: 'BONUS_POOL' }, direction: 'DEBIT', amount },
          { account: { userId, bucket: 'BONUS' }, direction: 'CREDIT', amount },
        ],
      })
    }
    const { bonusWager } = await getEffectiveWager(userId, tx)
    const bonus = await tx.bonus.create({
      data: {
        userId,
        type: 'RETURN',
        amount,
        wagerRequired: applyPct(amount, bonusWager * 100),
        status: 'ACTIVE',
      },
    })
    await releaseIfNoWager(tx, bonus.id)
    const now = new Date()
    await tx.user.update({
      where: { id: userId },
      data: { lastReturnBonusAt: now, lastPlayedAt: now },
    })
    await notify(
      tx,
      userId,
      'bonus',
      'Welcome back bonus',
      `You claimed Rs ${amountRupees} for returning after ${inactiveDays}+ days.`,
    )
    return { amount: amountRupees, bonusId: bonus.id, min, max }
  })
}
