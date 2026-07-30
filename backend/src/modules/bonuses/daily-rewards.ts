import type { Prisma } from '@prisma/client'
import { getSettings, DEFAULT_SETTINGS } from '../../core/settings.js'

export const DEFAULT_DAILY_REWARDS = DEFAULT_SETTINGS.dailyRewards

export function normalizeDailyRewards(raw: unknown): number[] {
  const fallback = [...DEFAULT_DAILY_REWARDS]
  if (!Array.isArray(raw) || raw.length !== 7) return fallback
  return raw.map((v, i) => {
    const n = Number(v)
    return Number.isFinite(n) && n >= 0 ? n : fallback[i]!
  })
}

export function startOfLocalDay(d = new Date()): Date {
  const x = new Date(d)
  x.setHours(0, 0, 0, 0)
  return x
}

export function isSameLocalDay(a: Date, b: Date): boolean {
  return startOfLocalDay(a).getTime() === startOfLocalDay(b).getTime()
}

export function yesterdayLocal(from = new Date()): Date {
  const y = startOfLocalDay(from)
  y.setDate(y.getDate() - 1)
  return y
}

/** Next day to claim (1–7) given last streak state. */
export function nextRewardDay(streak: number, lastClaimAt: Date | null | undefined, now = new Date()): {
  day: number
  claimedToday: boolean
} {
  const today = startOfLocalDay(now)
  if (lastClaimAt && isSameLocalDay(lastClaimAt, today)) {
    const day = Math.min(7, Math.max(1, streak || 1))
    return { day, claimedToday: true }
  }
  if (lastClaimAt && isSameLocalDay(lastClaimAt, yesterdayLocal(now))) {
    return { day: (Math.max(0, streak) % 7) + 1, claimedToday: false }
  }
  return { day: 1, claimedToday: false }
}

export async function getDailyRewardSchedule() {
  const s = await getSettings()
  return normalizeDailyRewards(s.dailyRewards)
}

export type DailyStatus = {
  rewards: number[]
  day: number
  claimedToday: boolean
  canClaim: boolean
  amountToday: number
  needsDeposit: boolean
}

export async function buildDailyStatus(
  user: { dailyClaimStreak: number; lastDailyClaimAt: Date | null },
  opts?: { canClaim?: boolean },
): Promise<DailyStatus> {
  const s = await getSettings()
  const rewards = normalizeDailyRewards(s.dailyRewards)
  const { day, claimedToday } = nextRewardDay(user.dailyClaimStreak, user.lastDailyClaimAt)
  const amountToday = rewards[day - 1] ?? 0
  return {
    rewards,
    day,
    claimedToday,
    canClaim: opts?.canClaim ?? !claimedToday,
    amountToday,
    needsDeposit: s.dailyOpenNeedsDeposit,
  }
}

export type Tx = Prisma.TransactionClient
