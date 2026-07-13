import { prisma } from '../lib/prisma.js'

export type CommissionBasis = 'EVERY_DEPOSIT' | 'FIRST_DEPOSIT' | 'NET_DEPOSIT' | 'GGR'

export interface Settings {
  platformName: string
  currency: string
  whatsapp: string
  whatsappEnabled: boolean
  shareLink: string
  panelLink: string
  csUpperRight: boolean
  wheelsLowerTop: boolean
  tickerText: string

  // bonuses (amounts in rupees for admin friendliness; converted at use)
  registrationBonus: number
  dailyOpenBonus: number
  dailyOpenNeedsDeposit: boolean
  depositBonus1: number
  depositBonus2: number
  depositBonus3: number
  dailyDepositBonus: number
  rebetBonus: boolean
  extraBonus: boolean

  // commission (fully admin-controlled)
  commissionEnabled: boolean
  commissionBasis: CommissionBasis
  commissionBase: 'DEPOSIT_AMOUNT' | 'GGR'
  commissionLevels: number
  commissionL1: number
  commissionL2: number
  commissionL3: number
  minDepositToQualify: number

  // agentship
  walletsRequired: number
  minPerWallet: number

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

  // lucky wheel — 1 spin per this much in approved deposits (rupees)
  wheelDepositPerSpin: number

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
}

export const DEFAULT_SETTINGS: Settings = {
  platformName: 'Zee9',
  currency: 'PKR',
  whatsapp: '+92 300 1234567',
  whatsappEnabled: true,
  shareLink: 'http://localhost:5174/',
  panelLink: 'http://localhost:5300/',
  csUpperRight: true,
  wheelsLowerTop: true,
  tickerText:
    'Player Zee9_King won Rs 24,280 in Mines game, congratulations! Player User_G23363 won Rs 22,344, congratulations on the big win!',
  registrationBonus: 150,
  dailyOpenBonus: 5,
  dailyOpenNeedsDeposit: true,
  depositBonus1: 10,
  depositBonus2: 7,
  depositBonus3: 5,
  dailyDepositBonus: 7,
  rebetBonus: true,
  extraBonus: true,
  commissionEnabled: true,
  commissionBasis: 'GGR',
  commissionBase: 'GGR',
  commissionLevels: 3,
  commissionL1: 30,
  commissionL2: 10,
  commissionL3: 10,
  minDepositToQualify: 1000,
  walletsRequired: 5,
  minPerWallet: 1000,
  minWithdraw: 600,
  maxWithdraw: 50000,
  minDeposit: 300,
  maxDeposit: 100000,
  bonusWager: 5,
  depositWager: 1,
  payoutReward: 2,
  wheelDepositPerSpin: 1000,
  depositPresets: [300, 500, 1000, 2000, 4000, 5000, 10000, 20000, 50000],
  maxAgentJazzcash: 3,
  maxAgentEasypaisa: 3,
  methodJazzcash: true,
  methodEasypaisa: true,
  methodBank: true,
  methodWegars: true,
}

const KEY = 'core'
let cache: Settings | null = null

export async function getSettings(): Promise<Settings> {
  if (cache) return cache
  const row = await prisma.setting.findUnique({ where: { key: KEY } })
  cache = { ...DEFAULT_SETTINGS, ...((row?.value as object) ?? {}) }
  return cache
}

export async function updateSettings(patch: Partial<Settings>): Promise<Settings> {
  const current = await getSettings()
  const next = { ...current, ...patch }
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
