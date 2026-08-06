import { prisma } from '../../lib/prisma.js'
import { getSettings } from '../../core/settings.js'
import { runMoneyTx } from '../../core/tx.js'
import { post } from '../../core/ledger.js'
import { toPaisa, toRupees, applyPct } from '../../lib/money.js'
import { conflict, unprocessable } from '../../core/errors.js'
import { releaseIfNoWager, getEffectiveWager } from '../../core/wager.js'
import { notify } from '../../core/notify.js'
import { levelFromDeposit, normalizeVipLevels, type VipLevelConfig } from './vip.config.js'
import type { Prisma } from '@prisma/client'

const WEEK_MS = 7 * 24 * 60 * 60 * 1000
const MONTH_MS = 30 * 24 * 60 * 60 * 1000

async function vipLevels(): Promise<VipLevelConfig[]> {
  const s = await getSettings()
  return normalizeVipLevels(s.vipLevels)
}

export async function depositedRupees(userId: string, tx?: Prisma.TransactionClient): Promise<number> {
  const db = tx ?? prisma
  const agg = await db.deposit.aggregate({
    where: { userId, status: 'APPROVED' },
    _sum: { amount: true },
  })
  return toRupees(agg._sum.amount ?? 0n)
}

/** Keep User.vipLevel in sync with total approved deposits. */
export async function syncUserVipLevel(userId: string, tx?: Prisma.TransactionClient): Promise<number> {
  const db = tx ?? prisma
  const levels = await vipLevels()
  const deposited = await depositedRupees(userId, db)
  const level = levelFromDeposit(levels, deposited)
  await db.user.update({ where: { id: userId }, data: { vipLevel: level } })
  return level
}

function fmtRemain(ms: number): string {
  if (ms <= 0) return 'Ready'
  const d = Math.floor(ms / (24 * 3600_000))
  const h = Math.floor((ms % (24 * 3600_000)) / 3600_000)
  if (d > 0) return `${d}d ${h}h`
  const m = Math.floor((ms % 3600_000) / 60_000)
  return h > 0 ? `${h}h ${m}m` : `${m}m`
}

export async function getVipStatus(userId: string) {
  const levels = await vipLevels()
  const user = await prisma.user.findUniqueOrThrow({
    where: { id: userId },
    select: {
      vipLevel: true,
      vipRewardClaimedLevel: true,
      lastVipWeeklyAt: true,
      lastVipMonthlyAt: true,
    },
  })
  const deposited = await depositedRupees(userId)
  const level = levelFromDeposit(levels, deposited)
  if (level !== user.vipLevel) {
    await prisma.user.update({ where: { id: userId }, data: { vipLevel: level } })
  }

  const cur = levels[level] ?? levels[0]!
  const next = levels[Math.min(level + 1, levels.length - 1)]!
  const prevThreshold = cur.threshold
  const nextThreshold = level >= levels.length - 1 ? cur.threshold : next.threshold
  const progress = Math.max(0, deposited - prevThreshold)
  const target = Math.max(1, nextThreshold - prevThreshold)
  const needMore = level >= levels.length - 1 ? 0 : Math.max(0, nextThreshold - deposited)

  let pendingLevelUps = 0
  let levelUpAmount = 0
  for (let l = user.vipRewardClaimedLevel + 1; l <= level; l++) {
    const reward = levels[l]?.levelUpReward ?? 0
    if (reward <= 0) continue
    pendingLevelUps++
    levelUpAmount += reward
  }
  const levelUpReady = pendingLevelUps > 0
  const claimLevel = levelUpReady ? user.vipRewardClaimedLevel + 1 : null

  const now = Date.now()
  const weeklyAmt = cur.weeklySalary
  const weeklyReadyAt = user.lastVipWeeklyAt ? user.lastVipWeeklyAt.getTime() + WEEK_MS : 0
  const weeklyReady = level >= 1 && weeklyAmt > 0 && now >= weeklyReadyAt
  const weeklyLeft = Math.max(0, weeklyReadyAt - now)

  const monthlyAmt = cur.monthlySalary
  const monthlyReadyAt = user.lastVipMonthlyAt ? user.lastVipMonthlyAt.getTime() + MONTH_MS : 0
  const monthlyReady = level >= 1 && monthlyAmt > 0 && now >= monthlyReadyAt
  const monthlyLeft = Math.max(0, monthlyReadyAt - now)

  const previewLevels = [9, 12]
    .filter((l) => l > level && levels[l])
    .map((l) => ({
      level: l,
      locked: true,
      betRebate: levels[l]!.betRebate,
      perk: levels[l]!.perk,
    }))

  return {
    level,
    deposited,
    progress,
    target,
    needMore,
    maxLevel: levels.length - 1,
    current: {
      betRebate: cur.betRebate,
      inviteMin: cur.inviteMin,
      inviteMax: cur.inviteMax,
      perk: cur.perk,
      weeklySalary: weeklyAmt,
      monthlySalary: monthlyAmt,
    },
    levelUp: {
      claimLevel,
      pendingCount: pendingLevelUps,
      amount: levelUpAmount,
      canClaim: levelUpReady,
      label: levelUpReady
        ? pendingLevelUps > 1
          ? `V${claimLevel}–V${level}`
          : `V${claimLevel}`
        : `V${level}`,
    },
    weekly: {
      amount: weeklyAmt,
      canClaim: weeklyReady,
      remainMs: weeklyLeft,
      remainLabel: weeklyReady ? '' : weeklyLeft > 0 ? fmtRemain(weeklyLeft) : '',
    },
    monthly: {
      amount: monthlyAmt,
      canClaim: monthlyReady,
      remainMs: monthlyLeft,
      remainLabel: monthlyReady
        ? ''
        : monthlyLeft > 0
          ? `Next: ${fmtRemain(monthlyLeft)}`
          : '',
    },
    previews: previewLevels,
    levels: levels.map((l) => ({
      level: l.level,
      threshold: l.threshold,
      betRebate: l.betRebate,
      levelUpReward: l.levelUpReward,
      weeklySalary: l.weeklySalary,
      monthlySalary: l.monthlySalary,
      inviteMin: l.inviteMin,
      inviteMax: l.inviteMax,
      perk: l.perk,
    })),
  }
}

async function creditVipBonus(
  tx: Prisma.TransactionClient,
  userId: string,
  amountRupees: number,
  note: string,
  claimKey: string,
) {
  const amount = toPaisa(amountRupees)
  if (amount <= 0n) throw unprocessable('Nothing to claim')
  const posted = await post(tx, {
    type: 'DAILY_BONUS',
    referenceType: 'vip',
    referenceId: `${claimKey}:${userId}`,
    idempotencyKey: `vip:${claimKey}:${userId}`,
    legs: [
      { account: { system: 'BONUS_POOL' }, direction: 'DEBIT', amount },
      { account: { userId, bucket: 'BONUS' }, direction: 'CREDIT', amount },
    ],
  })
  if (!posted.created) throw conflict('Already claimed')
  const { bonusWager } = await getEffectiveWager(userId, tx)
  const bonus = await tx.bonus.create({
    data: {
      userId,
      type: 'CASHBACK',
      amount,
      wagerRequired: applyPct(amount, bonusWager * 100),
      status: 'ACTIVE',
    },
  })
  await releaseIfNoWager(tx, bonus.id)
  await notify(tx, userId, 'bonus', 'VIP reward', note)
  return { amount: amountRupees, bonusId: bonus.id }
}

export async function claimVipLevelUp(userId: string) {
  return runMoneyTx(async (tx) => {
    const levels = await vipLevels()
    const user = await tx.user.findUniqueOrThrow({
      where: { id: userId },
      select: { vipLevel: true, vipRewardClaimedLevel: true },
    })
    const deposited = await depositedRupees(userId, tx)
    const level = levelFromDeposit(levels, deposited)
    if (level !== user.vipLevel) {
      await tx.user.update({ where: { id: userId }, data: { vipLevel: level } })
    }

    let claimLevel = user.vipRewardClaimedLevel + 1
    let totalAmount = 0
    let lastClaimed = user.vipRewardClaimedLevel
    while (claimLevel <= level) {
      const cfg = levels[claimLevel]
      if (!cfg || cfg.levelUpReward <= 0) {
        claimLevel++
        continue
      }
      const credited = await creditVipBonus(
        tx,
        userId,
        cfg.levelUpReward,
        `VIP V${claimLevel} level-up: Rs ${cfg.levelUpReward}`,
        `level-up:${claimLevel}`,
      )
      totalAmount += credited.amount
      lastClaimed = claimLevel
      claimLevel++
    }
    if (lastClaimed === user.vipRewardClaimedLevel) throw conflict('No level-up reward available')

    await tx.user.update({
      where: { id: userId },
      data: { vipRewardClaimedLevel: lastClaimed, vipLevel: level },
    })
    return {
      kind: 'levelUp' as const,
      level: lastClaimed,
      levelsClaimed: lastClaimed - user.vipRewardClaimedLevel,
      amount: totalAmount,
    }
  })
}

export async function claimVipWeekly(userId: string) {
  return runMoneyTx(async (tx) => {
    const levels = await vipLevels()
    const user = await tx.user.findUniqueOrThrow({
      where: { id: userId },
      select: { vipLevel: true, lastVipWeeklyAt: true },
    })
    const deposited = await depositedRupees(userId, tx)
    const level = levelFromDeposit(levels, deposited)
    const cfg = levels[level] ?? levels[0]!
    if (level < 1 || cfg.weeklySalary <= 0) throw conflict('Weekly salary not available')
    if (user.lastVipWeeklyAt && Date.now() < user.lastVipWeeklyAt.getTime() + WEEK_MS) {
      throw conflict('Weekly salary already claimed — wait for the timer')
    }
    const weekKey = user.lastVipWeeklyAt
      ? `weekly:${user.lastVipWeeklyAt.toISOString().slice(0, 10)}`
      : `weekly:first`
    const credited = await creditVipBonus(
      tx,
      userId,
      cfg.weeklySalary,
      `VIP V${level} weekly salary: Rs ${cfg.weeklySalary}`,
      weekKey,
    )
    await tx.user.update({
      where: { id: userId },
      data: { lastVipWeeklyAt: new Date(), vipLevel: level },
    })
    return { kind: 'weekly' as const, level, ...credited }
  })
}

export async function claimVipMonthly(userId: string) {
  return runMoneyTx(async (tx) => {
    const levels = await vipLevels()
    const user = await tx.user.findUniqueOrThrow({
      where: { id: userId },
      select: { vipLevel: true, lastVipMonthlyAt: true },
    })
    const deposited = await depositedRupees(userId, tx)
    const level = levelFromDeposit(levels, deposited)
    const cfg = levels[level] ?? levels[0]!
    if (level < 1 || cfg.monthlySalary <= 0) throw conflict('Monthly salary not available')
    if (user.lastVipMonthlyAt && Date.now() < user.lastVipMonthlyAt.getTime() + MONTH_MS) {
      throw conflict('Monthly salary already claimed — wait for the timer')
    }
    const monthKey = user.lastVipMonthlyAt
      ? `monthly:${user.lastVipMonthlyAt.toISOString().slice(0, 7)}`
      : `monthly:first`
    const credited = await creditVipBonus(
      tx,
      userId,
      cfg.monthlySalary,
      `VIP V${level} monthly salary: Rs ${cfg.monthlySalary}`,
      monthKey,
    )
    await tx.user.update({
      where: { id: userId },
      data: { lastVipMonthlyAt: new Date(), vipLevel: level },
    })
    return { kind: 'monthly' as const, level, ...credited }
  })
}
