import { prisma } from '../../lib/prisma.js'
import { runMoneyTx } from '../../core/tx.js'
import { post } from '../../core/ledger.js'
import { getSettings } from '../../core/settings.js'
import { toRupees } from '../../lib/money.js'
import { conflict, unprocessable } from '../../core/errors.js'
import { notify } from '../../core/notify.js'

function todayStart() {
  const d = new Date()
  d.setHours(0, 0, 0, 0)
  return d
}

/** Net loss from completed game rounds today (bet minus payout). */
export async function computeTodayLoss(userId: string): Promise<bigint> {
  const since = todayStart()
  const rounds = await prisma.gameRound.findMany({
    where: { userId, createdAt: { gte: since }, state: { in: ['BUST', 'CASHED_OUT'] } },
    select: { bet: true, payout: true },
  })
  let loss = 0n
  for (const r of rounds) {
    if (r.payout < r.bet) loss += r.bet - r.payout
  }
  return loss
}

export async function getCashbackStatus(userId: string) {
  const tiers = await prisma.cashbackTier.findMany({ where: { enabled: true }, orderBy: { minLoss: 'asc' } })
  const loss = await computeTodayLoss(userId)
  const since = todayStart()

  const claimedToday = await prisma.bonus.findFirst({
    where: { userId, type: 'CASHBACK', createdAt: { gte: since } },
    select: { amount: true },
  })

  const totalClaimed = await prisma.bonus.aggregate({
    where: { userId, type: 'CASHBACK', status: { in: ['ACTIVE', 'RELEASED'] } },
    _sum: { amount: true },
  })

  let tier = tiers[0] ?? null
  for (const t of tiers) {
    if (loss >= t.minLoss) tier = t
  }

  const eligible = tier && loss >= tier.minLoss
    ? (() => {
        const raw = (loss * BigInt(tier.pct)) / 100n
        return raw > tier.maxClaim ? tier.maxClaim : raw
      })()
    : 0n

  return {
    tiers: tiers.map((t) => ({
      id: t.id,
      name: t.name,
      minLoss: Number(t.minLoss) / 100,
      pct: t.pct,
      maxClaim: Number(t.maxClaim) / 100,
    })),
    todayLoss: Number(loss) / 100,
    currentRate: tier?.pct ?? 0,
    currentTier: tier?.name ?? null,
    eligibleAmount: Number(eligible) / 100,
    claimedToday: !!claimedToday,
    totalClaimed: Number(totalClaimed._sum.amount ?? 0n) / 100,
  }
}

export async function claimCashback(userId: string) {
  const status = await getCashbackStatus(userId)
  if (status.claimedToday) throw conflict('Cashback already claimed today')
  if (status.eligibleAmount <= 0) throw unprocessable('No cashback available to claim')

  const amount = BigInt(Math.round(status.eligibleAmount * 100))
  const s = await getSettings()

  return runMoneyTx(async (tx) => {
    const since = todayStart()
    const already = await tx.bonus.count({ where: { userId, type: 'CASHBACK', createdAt: { gte: since } } })
    if (already > 0) throw conflict('Cashback already claimed today')

    await post(tx, {
      type: 'DAILY_BONUS',
      referenceType: 'bonus',
      referenceId: userId,
      legs: [
        { account: { system: 'BONUS_POOL' }, direction: 'DEBIT', amount },
        { account: { userId, bucket: 'BONUS' }, direction: 'CREDIT', amount },
      ],
    })

    const bonus = await tx.bonus.create({
      data: {
        userId,
        type: 'CASHBACK',
        amount,
        wagerRequired: (amount * BigInt(Math.round(s.bonusWager * 100))) / 100n,
        status: 'ACTIVE',
      },
    })

    await notify(tx, userId, 'bonus', 'Cashback claimed', `You claimed Rs ${toRupees(amount).toLocaleString('en-PK')} cashback on today's losses.`)
    return bonus
  })
}
