import { prisma } from '../lib/prisma.js'
import { DEFAULT_VIP_LEVELS, normalizeVipLevels, type VipLevelConfig } from '../modules/vip/vip.config.js'
import { DEFAULT_FREE_CASH, normalizeFreeCash, type FreeCashConfig } from '../modules/freeCash/freeCash.config.js'

export type CommissionBasis = 'EVERY_DEPOSIT' | 'FIRST_DEPOSIT' | 'NET_DEPOSIT' | 'GGR'

export type WheelTier = Array<{ amount: number; spins: number }>

export interface Settings {
  platformName: string
  currency: string
  whatsapp: string
  whatsappEnabled: boolean
  shareLink: string
  panelLink: string
  /** Public C2C payment site base, e.g. https://pay.roadmaster.pro */
  c2cPayBaseUrl: string
  csUpperRight: boolean
  wheelsLowerTop: boolean
  tickerText: string

  // bonuses (amounts in rupees for admin friendliness; converted at use)
  registrationBonus: number
  /** @deprecated Prefer dailyRewards[day-1]; kept for admin summary / legacy. */
  dailyOpenBonus: number
  /** 7-day consecutive login rewards (rupees). Miss a day → restart at day 1. */
  dailyRewards: number[]
  dailyOpenNeedsDeposit: boolean
  depositBonus1: number
  depositBonus2: number
  depositBonus3: number
  /** % bonus on every approved deposit (each deposit, no daily cap). */
  dailyDepositBonus: number
  rebetBonus: boolean
  /** Bet Rebate: min net loss (Rs) to qualify */
  rebetMinLoss: number
  /** Fixed rebate amount (Rs) after delay */
  rebetAmount: number
  /** Hours to wait after qualifying before claim */
  rebetDelayHours: number
  extraBonus: boolean

  // commission (fully admin-controlled)
  commissionEnabled: boolean
  commissionBasis: CommissionBasis
  commissionBase: 'DEPOSIT_AMOUNT' | 'GGR'
  commissionLevels: number
  commissionL1: number
  commissionL2: number
  commissionL3: number
  /** Mentor referral commission % (loss accrue / win clawback). */
  mentorCommissionL1: number
  mentorCommissionL2: number
  mentorCommissionL3: number
  minDepositToQualify: number

  // agentship (referral Agent eligibility)
  walletsRequired: number
  minPerWallet: number

  /** When true, new player withdraws skip admin hold and go straight to C2C merchants. */
  withdrawAutoC2cRelease: boolean

  // limits
  minWithdraw: number
  maxWithdraw: number
  minDeposit: number
  maxDeposit: number

  // wager
  bonusWager: number
  depositWager: number

  // pay-on-behalf reward (% of payout amount, credited to the agent)
  payoutReward: number

  // how many days agent earnings stay locked before withdraw
  agentEarnHoldDays: number

  /** @deprecated Use wheelDepositTiers. Kept for older admin UIs. */
  wheelDepositPerSpin: number
  /** Deposit wheel: each deposit awards spins for the highest matching tier. */
  wheelDepositTiers: WheelTier
  /** Betting (SPIN) wheel: lifetime wager maps to highest matching tier. */
  wheelBetTiers: WheelTier

  // deposit amount chips shown in Add Cash (rupees)
  depositPresets: number[]

  // agent payout account limits
  maxAgentJazzcash: number
  maxAgentEasypaisa: number

  // methods
  methodJazzcash: boolean
  methodEasypaisa: boolean
  methodBank: boolean
  methodWegars: boolean

  /** VIP V0–V12 salary / threshold table (admin editable). */
  vipLevels: VipLevelConfig[]

  /** Welcome-back bonus after inactivity */
  returnBonusEnabled: boolean
  returnBonusInactiveDays: number
  returnBonusMin: number
  returnBonusMax: number

  /** Free Cash / Quests */
  freeCash: FreeCashConfig
}

export const DEFAULT_SETTINGS: Settings = {
  platformName: 'Zee9',
  currency: 'PKR',
  whatsapp: '+92 300 1234567',
  whatsappEnabled: true,
  shareLink: 'https://zee9.roadmaster.pro/',
  panelLink: 'https://c2c.roadmaster.pro/',
  c2cPayBaseUrl: 'https://pay.roadmaster.pro',
  csUpperRight: true,
  wheelsLowerTop: true,
  tickerText:
    'Player Zee9_King won Rs 24,280 in Mines game, congratulations! Player User_G23363 won Rs 22,344, congratulations on the big win!',
  registrationBonus: 150,
  dailyOpenBonus: 4,
  dailyRewards: [4, 9, 3, 5, 8, 6, 10],
  dailyOpenNeedsDeposit: true,
  depositBonus1: 5,
  depositBonus2: 5,
  depositBonus3: 5,
  dailyDepositBonus: 5,
  rebetBonus: true,
  rebetMinLoss: 50000,
  rebetAmount: 600,
  rebetDelayHours: 24,
  extraBonus: true,
  commissionEnabled: true,
  commissionBasis: 'GGR',
  commissionBase: 'GGR',
  commissionLevels: 3,
  commissionL1: 30,
  commissionL2: 10,
  commissionL3: 10,
  mentorCommissionL1: 30,
  mentorCommissionL2: 10,
  mentorCommissionL3: 10,
  minDepositToQualify: 1000,
  withdrawAutoC2cRelease: false,
  walletsRequired: 5,
  minPerWallet: 1000,
  minWithdraw: 600,
  maxWithdraw: 50000,
  minDeposit: 300,
  maxDeposit: 100000,
  bonusWager: 5,
  depositWager: 1,
  payoutReward: 2,
  agentEarnHoldDays: 0,
  wheelDepositPerSpin: 1000,
  wheelDepositTiers: [
    { amount: 1000, spins: 1 },
    { amount: 5000, spins: 2 },
    { amount: 10000, spins: 3 },
    { amount: 20000, spins: 4 },
    { amount: 50000, spins: 5 },
    { amount: 100000, spins: 7 },
    { amount: 200000, spins: 10 },
    { amount: 500000, spins: 15 },
  ],
  wheelBetTiers: [
    { amount: 5000, spins: 1 },
    { amount: 10000, spins: 2 },
    { amount: 50000, spins: 3 },
    { amount: 100000, spins: 4 },
    { amount: 500000, spins: 5 },
  ],
  depositPresets: [300, 500, 1000, 2000, 4000, 5000, 10000, 20000, 50000, 100000],
  maxAgentJazzcash: 30,
  maxAgentEasypaisa: 30,
  methodJazzcash: true,
  methodEasypaisa: true,
  methodBank: true,
  methodWegars: true,
  vipLevels: DEFAULT_VIP_LEVELS.map((l) => ({ ...l })),
  returnBonusEnabled: true,
  returnBonusInactiveDays: 7,
  returnBonusMin: 40,
  returnBonusMax: 200,
  freeCash: { ...DEFAULT_FREE_CASH, quests: DEFAULT_FREE_CASH.quests.map((q) => ({ ...q })) },
}

const KEY = 'core'
let cache: Settings | null = null

export async function getSettings(): Promise<Settings> {
  if (cache) return cache
  const row = await prisma.setting.findUnique({ where: { key: KEY } })
  const merged = { ...DEFAULT_SETTINGS, ...((row?.value as object) ?? {}) } as Settings
  merged.dailyRewards = Array.isArray(merged.dailyRewards) && merged.dailyRewards.length === 7
    ? merged.dailyRewards.map((n) => Number(n) || 0)
    : [...DEFAULT_SETTINGS.dailyRewards]
  merged.vipLevels = normalizeVipLevels(merged.vipLevels)
  merged.freeCash = normalizeFreeCash(merged.freeCash)
  merged.wheelDepositTiers = normalizeWheelTiers(
    merged.wheelDepositTiers,
    DEFAULT_SETTINGS.wheelDepositTiers,
  )
  merged.wheelBetTiers = normalizeWheelTiers(merged.wheelBetTiers, DEFAULT_SETTINGS.wheelBetTiers)
  cache = merged
  return cache
}

function normalizeWheelTiers(
  raw: unknown,
  fallback: WheelTier,
): WheelTier {
  if (!Array.isArray(raw) || raw.length === 0) return fallback.map((t) => ({ ...t }))
  const out: WheelTier = []
  for (const row of raw) {
    const amount = Number((row as any)?.amount)
    const spins = Number((row as any)?.spins)
    if (!Number.isFinite(amount) || amount <= 0) continue
    if (!Number.isFinite(spins) || spins < 0) continue
    out.push({ amount: Math.round(amount), spins: Math.round(spins) })
  }
  out.sort((a, b) => a.amount - b.amount)
  return out.length ? out : fallback.map((t) => ({ ...t }))
}

export async function updateSettings(patch: Partial<Settings>): Promise<Settings> {
  const current = await getSettings()
  const next = { ...current, ...patch }
  if (patch.vipLevels !== undefined) next.vipLevels = normalizeVipLevels(patch.vipLevels)
  if (patch.freeCash !== undefined) next.freeCash = normalizeFreeCash(patch.freeCash)
  if (patch.wheelDepositTiers !== undefined) {
    next.wheelDepositTiers = normalizeWheelTiers(
      patch.wheelDepositTiers,
      DEFAULT_SETTINGS.wheelDepositTiers,
    )
  }
  if (patch.wheelBetTiers !== undefined) {
    next.wheelBetTiers = normalizeWheelTiers(patch.wheelBetTiers, DEFAULT_SETTINGS.wheelBetTiers)
  }
  if (patch.dailyRewards !== undefined) {
    next.dailyRewards =
      Array.isArray(patch.dailyRewards) && patch.dailyRewards.length === 7
        ? patch.dailyRewards.map((n) => Number(n) || 0)
        : [...DEFAULT_SETTINGS.dailyRewards]
  }
  await prisma.setting.upsert({
    where: { key: KEY },
    create: { key: KEY, value: next as object },
    update: { value: next as object },
  })
  cache = next
  return next
}

/** Call after any settings write from another process; clears the in-memory cache. */
export function invalidateSettings() {
  cache = null
}

export function commissionRateBps(s: Settings, level: number): number {
  const pct = level === 1 ? s.commissionL1 : level === 2 ? s.commissionL2 : s.commissionL3
  return Math.round(pct * 100) // percent -> basis points
}

export function mentorCommissionRateBps(s: Settings, level: number): number {
  const pct =
    level === 1 ? s.mentorCommissionL1 : level === 2 ? s.mentorCommissionL2 : s.mentorCommissionL3
  return Math.round(pct * 100)
}
