export type VipLevelConfig = {
  level: number
  /** Cumulative approved deposits (rupees) required for this VIP level */
  threshold: number
  /** Display bet rebate % */
  betRebate: number
  /** One-time reward when this level is first reached (rupees) */
  levelUpReward: number
  weeklySalary: number
  monthlySalary: number
  inviteMin: number
  inviteMax: number
  perk: string
}

/** V0–V12 defaults — admin can edit in VIP settings. */
export const DEFAULT_VIP_LEVELS: VipLevelConfig[] = [
  { level: 0, threshold: 0, betRebate: 0, levelUpReward: 0, weeklySalary: 0, monthlySalary: 0, inviteMin: 0, inviteMax: 0, perk: 'Welcome' },
  { level: 1, threshold: 1_000, betRebate: 0.1, levelUpReward: 5, weeklySalary: 5, monthlySalary: 10, inviteMin: 1, inviteMax: 3, perk: '0.1% Bet Rebate' },
  { level: 2, threshold: 5_000, betRebate: 0.2, levelUpReward: 8, weeklySalary: 8, monthlySalary: 15, inviteMin: 1, inviteMax: 4, perk: '0.2% Bet Rebate' },
  { level: 3, threshold: 15_000, betRebate: 0.3, levelUpReward: 10, weeklySalary: 10, monthlySalary: 20, inviteMin: 2, inviteMax: 5, perk: '0.3% Bet Rebate' },
  { level: 4, threshold: 40_000, betRebate: 0.5, levelUpReward: 15, weeklySalary: 15, monthlySalary: 30, inviteMin: 2, inviteMax: 6, perk: '0.5% Bet Rebate' },
  { level: 5, threshold: 100_000, betRebate: 1.0, levelUpReward: 20, weeklySalary: 20, monthlySalary: 50, inviteMin: 3, inviteMax: 10, perk: '1.0% Bet Rebate · 3%-10% Invite Commission' },
  { level: 6, threshold: 200_000, betRebate: 1.2, levelUpReward: 30, weeklySalary: 25, monthlySalary: 60, inviteMin: 3, inviteMax: 10, perk: '1.2% Bet Rebate' },
  { level: 7, threshold: 350_000, betRebate: 1.4, levelUpReward: 40, weeklySalary: 30, monthlySalary: 80, inviteMin: 4, inviteMax: 12, perk: '1.4% Bet Rebate' },
  { level: 8, threshold: 550_000, betRebate: 1.6, levelUpReward: 50, weeklySalary: 40, monthlySalary: 100, inviteMin: 4, inviteMax: 12, perk: '1.6% Bet Rebate' },
  { level: 9, threshold: 800_000, betRebate: 2.0, levelUpReward: 60, weeklySalary: 50, monthlySalary: 120, inviteMin: 5, inviteMax: 15, perk: '2.0% bet Rebate, 1V1 service line, free withdraw and first' },
  { level: 10, threshold: 1_200_000, betRebate: 2.2, levelUpReward: 80, weeklySalary: 60, monthlySalary: 150, inviteMin: 5, inviteMax: 15, perk: '2.2% Bet Rebate, 1V1 service' },
  { level: 11, threshold: 1_800_000, betRebate: 2.5, levelUpReward: 100, weeklySalary: 80, monthlySalary: 200, inviteMin: 6, inviteMax: 18, perk: '2.5% Bet Rebate, priority withdraw' },
  { level: 12, threshold: 2_500_000, betRebate: 3.0, levelUpReward: 150, weeklySalary: 100, monthlySalary: 300, inviteMin: 8, inviteMax: 20, perk: '3.0% bet Rebate, 1V1 service line, free withdraw and first' },
]

export function normalizeVipLevels(raw: unknown): VipLevelConfig[] {
  if (!Array.isArray(raw) || raw.length < 2) return DEFAULT_VIP_LEVELS.map((l) => ({ ...l }))
  const out: VipLevelConfig[] = []
  for (let i = 0; i < Math.min(13, raw.length); i++) {
    const d = DEFAULT_VIP_LEVELS[i] ?? DEFAULT_VIP_LEVELS[DEFAULT_VIP_LEVELS.length - 1]!
    const r = raw[i] as Partial<VipLevelConfig>
    out.push({
      level: i,
      threshold: Math.max(0, Number(r?.threshold ?? d.threshold) || 0),
      betRebate: Math.max(0, Number(r?.betRebate ?? d.betRebate) || 0),
      levelUpReward: Math.max(0, Number(r?.levelUpReward ?? d.levelUpReward) || 0),
      weeklySalary: Math.max(0, Number(r?.weeklySalary ?? d.weeklySalary) || 0),
      monthlySalary: Math.max(0, Number(r?.monthlySalary ?? d.monthlySalary) || 0),
      inviteMin: Math.max(0, Number(r?.inviteMin ?? d.inviteMin) || 0),
      inviteMax: Math.max(0, Number(r?.inviteMax ?? d.inviteMax) || 0),
      perk: String(r?.perk ?? d.perk ?? ''),
    })
  }
  while (out.length < 13) {
    const i = out.length
    out.push({ ...DEFAULT_VIP_LEVELS[i]! })
  }
  return out
}

export function levelFromDeposit(levels: VipLevelConfig[], depositedRupees: number): number {
  let lvl = 0
  for (const row of levels) {
    if (depositedRupees >= row.threshold) lvl = row.level
  }
  return lvl
}
