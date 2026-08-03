import type { Tx } from '../../lib/prisma.js'
import { prisma } from '../../lib/prisma.js'
import { toPaisa } from '../../lib/money.js'
import { getSettings, commissionRateBps } from '../../core/settings.js'

/** Promoter rank tiers — must match ReferEarnScreen LEVELS table. */
export const PROMOTER_LEVELS = [
  { lv: 1, minValidReferrals: 0, cashbackPct: 0.5 },
  { lv: 2, minValidReferrals: 5, cashbackPct: 0.6 },
  { lv: 3, minValidReferrals: 10, cashbackPct: 0.8 },
  { lv: 4, minValidReferrals: 30, cashbackPct: 1 },
  { lv: 5, minValidReferrals: 50, cashbackPct: 1.2 },
  { lv: 6, minValidReferrals: 100, cashbackPct: 1.5 },
  { lv: 7, minValidReferrals: 200, cashbackPct: 2 },
] as const

export type PromoterLevelInfo = {
  level: number
  validReferrals: number
  cashbackPct: number
  nextLevel: number | null
  nextLevelRequires: number | null
  upgradeCashbackPct: number | null
}

export function promoterLevelFromCount(validReferrals: number): PromoterLevelInfo {
  let current: (typeof PROMOTER_LEVELS)[number] = PROMOTER_LEVELS[0]
  for (const tier of PROMOTER_LEVELS) {
    if (validReferrals >= tier.minValidReferrals) current = tier
  }
  const idx = PROMOTER_LEVELS.findIndex((t) => t.lv === current.lv)
  const next = idx >= 0 && idx < PROMOTER_LEVELS.length - 1 ? PROMOTER_LEVELS[idx + 1]! : null
  return {
    level: current.lv,
    validReferrals,
    cashbackPct: current.cashbackPct,
    nextLevel: next?.lv ?? null,
    nextLevelRequires: next?.minValidReferrals ?? null,
    upgradeCashbackPct: next?.cashbackPct ?? null,
  }
}

/** Direct referrals (L1) with approved deposits ≥ minPerWallet. */
export async function countValidDirectReferrals(
  client: typeof prisma | Tx,
  userId: string,
  minPerWalletPaisa?: bigint,
): Promise<number> {
  const minPer = minPerWalletPaisa ?? toPaisa((await getSettings()).minPerWallet)
  const directRefs = await client.referralEdge.findMany({
    where: { ancestorId: userId, level: 1 },
    select: { descendantId: true },
  })
  if (!directRefs.length) return 0

  let filled = 0
  for (const r of directRefs) {
    const agg = await client.deposit.aggregate({
      where: { userId: r.descendantId, status: 'APPROVED' },
      _sum: { amount: true },
    })
    if ((agg._sum.amount ?? 0n) >= minPer) filled++
  }
  return filled
}

/** Cashback % (→ bps) for a referrer at `edgeLevel` (1–3) given their promoter tier. */
export async function promoterCommissionRateBps(
  edgeLevel: number,
  validReferrals: number,
  referralAgentActive: boolean,
): Promise<number> {
  const s = await getSettings()
  if (referralAgentActive) return commissionRateBps(s, edgeLevel)
  if (validReferrals <= 0) return 0

  const { cashbackPct } = promoterLevelFromCount(validReferrals)
  const l1Pct = cashbackPct
  const pct =
    edgeLevel === 1
      ? l1Pct
      : edgeLevel === 2
        ? (l1Pct * s.commissionL2) / s.commissionL1
        : (l1Pct * s.commissionL3) / s.commissionL1
  return Math.round(pct * 100)
}
