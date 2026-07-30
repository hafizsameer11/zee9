import { prisma } from '../../lib/prisma.js'
import { getSettings } from '../../core/settings.js'
import { runMoneyTx } from '../../core/tx.js'
import { post } from '../../core/ledger.js'
import { toPaisa, toRupees, applyPct } from '../../lib/money.js'
import { conflict, notFound } from '../../core/errors.js'
import { releaseIfNoWager, getEffectiveWager } from '../../core/wager.js'
import { notify } from '../../core/notify.js'
import { normalizeFreeCash, type FreeCashQuest } from './freeCash.config.js'
import { getReturnBonusStatus } from '../bonuses/return-bonus.js'

function periodStart(resetHour: number, period: 'daily' | 'weekly', now = new Date()): Date {
  const d = new Date(now)
  d.setMinutes(0, 0, 0)
  if (d.getHours() < resetHour) d.setDate(d.getDate() - 1)
  d.setHours(resetHour, 0, 0, 0)
  if (period === 'weekly') {
    const day = d.getDay() // 0 Sun
    const diff = (day + 6) % 7 // Monday start
    d.setDate(d.getDate() - diff)
  }
  return d
}

function dayKey(resetHour: number, now = new Date()): string {
  const s = periodStart(resetHour, 'daily', now)
  return s.toISOString().slice(0, 10)
}

async function progressFor(
  userId: string,
  quest: FreeCashQuest,
  since: Date,
): Promise<number> {
  if (quest.kind === 'RETURN') {
    const st = await getReturnBonusStatus(userId)
    return st.eligible ? quest.target : 0
  }
  if (quest.kind === 'PLAY_ROUNDS') {
    const n = await prisma.ledgerTransaction.count({
      where: {
        type: 'GAME_BET',
        createdAt: { gte: since },
        entries: { some: { account: { ownerId: userId } } },
      },
    })
    return n
  }
  if (quest.kind === 'DEPOSIT_COUNT') {
    return prisma.deposit.count({
      where: { userId, status: 'APPROVED', processedAt: { gte: since } },
    })
  }

  if (quest.kind === 'BET_TOTAL') {
    const rows = await prisma.ledgerEntry.findMany({
      where: {
        direction: 'DEBIT',
        createdAt: { gte: since },
        account: { ownerId: userId, bucket: { in: ['MAIN', 'BONUS'] } },
        transaction: { type: 'GAME_BET' },
      },
      select: { amount: true },
    })
    return rows.reduce((s, r) => s + toRupees(r.amount), 0)
  }

  const wins = await prisma.ledgerEntry.findMany({
    where: {
      direction: 'CREDIT',
      createdAt: { gte: since },
      account: { ownerId: userId, bucket: { in: ['MAIN', 'BONUS'] } },
      transaction: { type: 'GAME_WIN' },
    },
    select: { amount: true },
  })
  return wins.reduce((s, r) => s + toRupees(r.amount), 0)
}

export async function getFreeCashStatus(userId: string) {
  const s = await getSettings()
  const cfg = normalizeFreeCash(s.freeCash)
  if (!cfg.enabled) {
    return { enabled: false, maxDailyReward: cfg.maxDailyReward, resetHour: cfg.resetHour, quests: [], activity: 0, claimedToday: 0 }
  }

  const key = dayKey(cfg.resetHour)
  const claims = await prisma.freeCashClaim.findMany({
    where: { userId, dayKey: key },
    select: { questId: true, amount: true },
  })
  const claimedIds = new Set(claims.map((c) => c.questId))
  const claimedToday = claims.reduce((n, c) => n + toRupees(c.amount), 0)

  const quests = []
  for (const q of cfg.quests.filter((x) => x.enabled)) {
    const since = periodStart(cfg.resetHour, q.period)
    const progress = await progressFor(userId, q, since)
    const done = progress >= q.target
    const claimed = claimedIds.has(q.id)
    quests.push({
      ...q,
      progress: Math.min(progress, q.target),
      progressRaw: progress,
      done,
      claimed,
      canClaim: done && !claimed && q.reward > 0 && claimedToday + q.reward <= cfg.maxDailyReward,
    })
  }

  const activity = quests.filter((q) => q.claimed || q.done).length

  return {
    enabled: true,
    maxDailyReward: cfg.maxDailyReward,
    resetHour: cfg.resetHour,
    claimedToday,
    activity,
    quests,
  }
}

export async function claimFreeCashQuest(userId: string, questId: string) {
  const s = await getSettings()
  const cfg = normalizeFreeCash(s.freeCash)
  if (!cfg.enabled) throw conflict('Free Cash is disabled')
  const quest = cfg.quests.find((q) => q.id === questId && q.enabled)
  if (!quest) throw notFound('Quest not found')

  const key = dayKey(cfg.resetHour)
  const since = periodStart(cfg.resetHour, quest.period)
  const progress = await progressFor(userId, quest, since)
  if (progress < quest.target) throw conflict('Quest not completed yet')

  return runMoneyTx(async (tx) => {
    const existing = await tx.freeCashClaim.findUnique({
      where: { userId_questId_dayKey: { userId, questId, dayKey: key } },
    })
    if (existing) throw conflict('Already claimed')

    const todaySum = await tx.freeCashClaim.aggregate({
      where: { userId, dayKey: key },
      _sum: { amount: true },
    })
    const claimedToday = toRupees(todaySum._sum.amount ?? 0n)
    if (claimedToday + quest.reward > cfg.maxDailyReward) {
      throw conflict(`Daily Free Cash cap is Rs ${cfg.maxDailyReward}`)
    }

    // RETURN quest: claim via return-bonus path amount = quest.reward (fixed) or keep random?
    // Use fixed quest.reward for Free Cash claim consistency.
    const amountRupees = quest.reward
    const amount = toPaisa(amountRupees)

    if (amount > 0n) {
      await post(tx, {
        type: 'DAILY_BONUS',
        referenceType: 'free-cash',
        referenceId: `${userId}:${questId}:${key}`,
        idempotencyKey: `free-cash:${userId}:${questId}:${key}`,
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
        type: 'FREE_CASH',
        amount,
        wagerRequired: applyPct(amount, bonusWager * 100),
        status: 'ACTIVE',
      },
    })
    await releaseIfNoWager(tx, bonus.id)

    await tx.freeCashClaim.create({
      data: { userId, questId, dayKey: key, amount },
    })

    if (quest.kind === 'RETURN') {
      await tx.user.update({
        where: { id: userId },
        data: { lastReturnBonusAt: new Date(), lastPlayedAt: new Date() },
      })
    }

    await notify(tx, userId, 'bonus', 'Free Cash', `${quest.title}: Rs ${amountRupees} claimed.`)
    return { questId, amount: amountRupees, bonusId: bonus.id }
  })
}
