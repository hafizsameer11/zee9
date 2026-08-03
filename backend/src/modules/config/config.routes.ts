import { Router } from 'express'
import { asyncHandler } from '../../lib/asyncHandler.js'
import { ok } from '../../lib/respond.js'
import { getSettings } from '../../core/settings.js'

export const configRoutes = Router()

// Public subset of settings that the player app needs.
configRoutes.get(
  '/',
  asyncHandler(async (_req, res) => {
    const s = await getSettings()
    ok(res, {
      platformName: s.platformName,
      currency: s.currency,
      whatsapp: s.whatsappEnabled ? s.whatsapp : null,
      shareLink: s.shareLink,
      tickerText: s.tickerText,
      limits: { minDeposit: s.minDeposit, maxDeposit: s.maxDeposit, minWithdraw: s.minWithdraw, maxWithdraw: s.maxWithdraw },
      methods: { JAZZCASH: s.methodJazzcash, EASYPAISA: s.methodEasypaisa, BANK: s.methodBank, WEGARS: s.methodWegars },
      depositPresets: s.depositPresets,
      bonuses: {
        registration: s.registrationBonus,
        dailyOpen: s.dailyOpenBonus,
        dailyRewards: s.dailyRewards?.length === 7 ? s.dailyRewards : [4, 9, 3, 5, 8, 6, 10],
        deposit: [s.depositBonus1, s.depositBonus2, s.depositBonus3],
        dailyDeposit: s.dailyDepositBonus,
        perDeposit: s.dailyDepositBonus,
      },
      wager: { bonus: s.bonusWager, deposit: s.depositWager },
      wheel: {
        depositPerSpin: s.wheelDepositPerSpin,
        depositTiers: s.wheelDepositTiers,
        betTiers: s.wheelBetTiers,
      },
      layout: { csUpperRight: s.csUpperRight, wheelsLowerTop: s.wheelsLowerTop },
    })
  }),
)
