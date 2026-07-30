import type { Tx } from '../lib/prisma.js'
import { prisma } from '../lib/prisma.js'
import { post } from './ledger.js'
import { getSettings } from './settings.js'

/** Move a completed bonus from BONUS → MAIN. */
async function releaseBonus(tx: Tx, bonusId: string) {
  const bonus = await tx.bonus.findUnique({ where: { id: bonusId } })
  if (!bonus || bonus.status !== 'ACTIVE') return

  if (bonus.amount > 0n) {
    await post(tx, {
      type: 'BONUS_RELEASE',
      referenceType: 'bonus',
      referenceId: bonusId,
      idempotencyKey: `bonus-release:${bonusId}`,
      assertNonNegative: [{ userId: bonus.userId, bucket: 'BONUS' }],
      legs: [
        { account: { userId: bonus.userId, bucket: 'BONUS' }, direction: 'DEBIT', amount: bonus.amount },
        { account: { userId: bonus.userId, bucket: 'MAIN' }, direction: 'CREDIT', amount: bonus.amount },
      ],
    })
  }
  await tx.bonus.update({ where: { id: bonusId }, data: { status: 'RELEASED' } })
}

/** Release immediately when no wager is required. */
export async function releaseIfNoWager(tx: Tx, bonusId: string) {
  const bonus = await tx.bonus.findUnique({ where: { id: bonusId } })
  if (!bonus || bonus.status !== 'ACTIVE') return
  if (bonus.wagerRequired <= 0n) await releaseBonus(tx, bonusId)
}

/** Apply bet volume to active bonuses (FIFO) and release any that complete. */
export async function recordWagerAndRelease(tx: Tx, userId: string, betAmount: bigint) {
  if (betAmount <= 0n) return

  let remaining = betAmount
  const bonuses = await tx.bonus.findMany({
    where: { userId, status: 'ACTIVE' },
    orderBy: { createdAt: 'asc' },
  })

  for (const bonus of bonuses) {
    if (remaining <= 0n) break

    const needed = bonus.wagerRequired - bonus.wagerProgress
    if (needed <= 0n) {
      await releaseBonus(tx, bonus.id)
      continue
    }

    const add = remaining < needed ? remaining : needed
    remaining -= add
    const newProgress = bonus.wagerProgress + add
    await tx.bonus.update({ where: { id: bonus.id }, data: { wagerProgress: newProgress } })
    if (newProgress >= bonus.wagerRequired) await releaseBonus(tx, bonus.id)
  }
}

/** Effective deposit / bonus wager multipliers for a user (override or global). */
export async function getEffectiveWager(userId: string, db: Tx | typeof prisma = prisma) {
  const s = await getSettings()
  const user = await db.user.findUnique({
    where: { id: userId },
    select: { depositWagerOverride: true, bonusWagerOverride: true },
  })
  const depositWager =
    user?.depositWagerOverride != null && Number.isFinite(user.depositWagerOverride)
      ? Number(user.depositWagerOverride)
      : s.depositWager
  const bonusWager =
    user?.bonusWagerOverride != null && Number.isFinite(user.bonusWagerOverride)
      ? Number(user.bonusWagerOverride)
      : s.bonusWager
  return {
    depositWager,
    bonusWager,
    depositOverride: user?.depositWagerOverride ?? null,
    bonusOverride: user?.bonusWagerOverride ?? null,
    globalDepositWager: s.depositWager,
    globalBonusWager: s.bonusWager,
  }
}

/** Total GAME_BET volume (paisa) for a player — all games via ledger. */
async function totalBetVolume(tx: Tx | typeof prisma, userId: string): Promise<bigint> {
  const agg = await tx.ledgerEntry.aggregate({
    where: {
      direction: 'DEBIT',
      account: { ownerId: userId, bucket: { in: ['MAIN', 'BONUS'] } },
      transaction: { type: 'GAME_BET' },
    },
    _sum: { amount: true },
  })
  return agg._sum.amount ?? 0n
}

/** True when total bets meet (user deposit wager ×) approved deposits. */
export async function depositWagerMet(tx: Tx, userId: string): Promise<boolean> {
  const { depositWager } = await getEffectiveWager(userId, tx)
  if (depositWager <= 0) return true

  const [depSum, wagered] = await Promise.all([
    tx.deposit.aggregate({ where: { userId, status: 'APPROVED' }, _sum: { amount: true } }),
    totalBetVolume(tx, userId),
  ])
  const deposited = depSum._sum.amount ?? 0n
  if (deposited <= 0n) return true

  const required = (deposited * BigInt(Math.round(depositWager * 100))) / 100n
  return wagered >= required
}
