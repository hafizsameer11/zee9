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
    csUpperRight: z.boolean(),
    wheelsLowerTop: z.boolean(),
    tickerText: z.string().max(500),

    registrationBonus: money,
    dailyOpenBonus: money,
    dailyOpenNeedsDeposit: z.boolean(),
    depositBonus1: pct,
    depositBonus2: pct,
    depositBonus3: pct,
    dailyDepositBonus: pct,
    rebetBonus: z.boolean(),
    extraBonus: z.boolean(),

    commissionEnabled: z.boolean(),
    commissionBasis: z.enum(['EVERY_DEPOSIT', 'FIRST_DEPOSIT', 'NET_DEPOSIT', 'GGR']),
    commissionBase: z.enum(['DEPOSIT_AMOUNT', 'GGR']),
    commissionLevels: z.number().int().min(1).max(3),
    commissionL1: pct,
    commissionL2: pct,
    commissionL3: pct,
    minDepositToQualify: money,

    walletsRequired: z.number().int().min(1).max(50),
    minPerWallet: money,

    minWithdraw: money,
    maxWithdraw: money,
    minDeposit: money,
    maxDeposit: money,

    bonusWager: z.number().min(0).max(100),
    depositWager: z.number().min(0).max(100),

    payoutReward: pct,
    wheelDepositPerSpin: money,
    depositPresets: z.array(money).max(20).optional(),
    maxAgentJazzcash: z.number().int().min(1).max(10).optional(),
    maxAgentEasypaisa: z.number().int().min(1).max(10).optional(),

    methodJazzcash: z.boolean(),
    methodEasypaisa: z.boolean(),
    methodBank: z.boolean(),
    methodWegars: z.boolean(),
  })
  .partial()
  .strict()
