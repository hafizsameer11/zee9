import { z } from 'zod'

const pct = z.number().min(0).max(100)
const money = z.number().min(0)

// All fields optional — PATCH accepts any subset. Unknown keys are stripped.
export const settingsPatchSchema = z
  .object({
    platformName: z.string().min(1).max(40),
    currency: z.enum(['PKR', 'INR', 'USD']),
    whatsapp: z.string().max(30),
    whatsappEnabled: z.boolean(),
    shareLink: z.string().url().max(300),
    panelLink: z.string().url().max(300),
    c2cPayBaseUrl: z.string().url().max(300),
    csUpperRight: z.boolean(),
    wheelsLowerTop: z.boolean(),
    tickerText: z.string().max(500),

    registrationBonus: money,
    dailyOpenBonus: money,
    dailyRewards: z.array(money).length(7),
    dailyOpenNeedsDeposit: z.boolean(),
    depositBonus1: pct,
    depositBonus2: pct,
    depositBonus3: pct,
    dailyDepositBonus: pct,
    rebetBonus: z.boolean(),
    rebetMinLoss: money,
    rebetAmount: money,
    rebetDelayHours: z.number().min(0).max(168),
    extraBonus: z.boolean(),

    commissionEnabled: z.boolean(),
    commissionBasis: z.enum(['EVERY_DEPOSIT', 'FIRST_DEPOSIT', 'NET_DEPOSIT', 'GGR']),
    commissionBase: z.enum(['DEPOSIT_AMOUNT', 'GGR']),
    commissionLevels: z.number().int().min(1).max(3),
    commissionL1: pct,
    commissionL2: pct,
    commissionL3: pct,
    mentorCommissionL1: pct,
    mentorCommissionL2: pct,
    mentorCommissionL3: pct,
    minDepositToQualify: money,
    withdrawAutoC2cRelease: z.boolean(),

    walletsRequired: z.number().int().min(1).max(50),
    minPerWallet: money,

    minWithdraw: money,
    maxWithdraw: money,
    minDeposit: money,
    maxDeposit: money,

    bonusWager: z.number().min(0).max(100),
    depositWager: z.number().min(0).max(100),

    payoutReward: pct,
    agentEarnHoldDays: z.number().int().min(0).max(90).optional(),
    wheelDepositPerSpin: money,
    wheelDepositTiers: z
      .array(z.object({ amount: money, spins: z.number().int().min(0).max(1000) }))
      .max(30)
      .optional(),
    wheelBetTiers: z
      .array(z.object({ amount: money, spins: z.number().int().min(0).max(1000) }))
      .max(30)
      .optional(),
    depositPresets: z.array(money).max(20).optional(),
    maxAgentJazzcash: z.number().int().min(1).max(30).optional(),
    maxAgentEasypaisa: z.number().int().min(1).max(30).optional(),

    methodJazzcash: z.boolean(),
    methodEasypaisa: z.boolean(),
    methodBank: z.boolean(),
    methodWegars: z.boolean(),

    vipLevels: z
      .array(
        z.object({
          level: z.number().int().min(0).max(12),
          threshold: money,
          betRebate: z.number().min(0).max(100),
          levelUpReward: money,
          weeklySalary: money,
          monthlySalary: money,
          inviteMin: z.number().min(0).max(100),
          inviteMax: z.number().min(0).max(100),
          perk: z.string().max(200),
        }),
      )
      .min(2)
      .max(13),

    returnBonusEnabled: z.boolean(),
    returnBonusInactiveDays: z.number().int().min(1).max(90),
    returnBonusMin: money,
    returnBonusMax: money,

    freeCash: z.object({
      enabled: z.boolean(),
      maxDailyReward: money,
      resetHour: z.number().int().min(0).max(23),
      quests: z
        .array(
          z.object({
            id: z.string().min(1).max(64),
            kind: z.enum(['PLAY_ROUNDS', 'BET_TOTAL', 'WIN_TOTAL', 'DEPOSIT_COUNT', 'RETURN']),
            title: z.string().min(1).max(80),
            desc: z.string().max(200),
            target: z.number().min(1),
            reward: money,
            tier: z.number().int().min(1).max(20),
            maxTier: z.number().int().min(1).max(20),
            enabled: z.boolean(),
            period: z.enum(['daily', 'weekly']),
          }),
        )
        .max(30),
    }),
  })
  .partial()
  .strict()
  .refine(
    (p) =>
      p.returnBonusMin === undefined ||
      p.returnBonusMax === undefined ||
      p.returnBonusMin <= p.returnBonusMax,
    { message: 'returnBonusMin must be <= returnBonusMax' },
  )
