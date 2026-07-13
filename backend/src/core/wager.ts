import type { Tx } from '../lib/prisma.js'
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

/** True when total bets meet depositWager × approved deposits. */
export async function depositWagerMet(tx: Tx, userId: string): Promise<boolean> {
  const s = await getSettings()
  if (s.depositWager <= 0) return true

  const [depSum, betSum] = await Promise.all([
    tx.deposit.aggregate({ where: { userId, status: 'APPROVED' }, _sum: { amount: true } }),
    tx.gameRound.aggregate({ where: { userId }, _sum: { bet: true } }),
  ])
  const deposited = depSum._sum.amount ?? 0n
  if (deposited <= 0n) return true

  const wagered = betSum._sum.bet ?? 0n
  const required = (deposited * BigInt(Math.round(s.depositWager * 100))) / 100n
  return wagered >= required
}
