import { createApp } from './app.js'
import { env } from './lib/env.js'
import { logger } from './lib/logger.js'
import { prisma } from './lib/prisma.js'
import { attachAviatorRealtime, stopAviatorRealtime } from './modules/games/aviator.realtime.js'
import { attachCrashRealtime, stopCrashRealtime } from './modules/games/crash.realtime.js'
import { attachAeroXRealtime, stopAeroXRealtime } from './modules/games/aeroX.realtime.js'
import { attachDoubleCrashRealtime, stopDoubleCrashRealtime } from './modules/games/doubleCrash.realtime.js'
import { attachWingoRealtime, stopWingoRealtime } from './modules/games/wingo.realtime.js'
import { attachLotteryRealtime, stopLotteryRealtime } from './modules/games/wingoLottery.realtime.js'
import { attachRouletteRealtime, stopRouletteRealtime } from './modules/games/roulette.realtime.js'
import {
  attachCarRouletteRealtime,
  stopCarRouletteRealtime,
} from './modules/games/carRoulette.realtime.js'
import {
  attachZooRouletteRealtime,
  stopZooRouletteRealtime,
} from './modules/games/zooRoulette.realtime.js'
import { attachDragonTigerRealtime, stopDragonTigerRealtime } from './modules/games/dragonTiger.realtime.js'
import { attachSevenUpRealtime, stopSevenUpRealtime } from './modules/games/sevenUp.realtime.js'
import { attachMinesRealtime, stopMinesRealtime } from './modules/games/mines.realtime.js'
import { attachChickenRoadRealtime, stopChickenRoadRealtime } from './modules/games/chickenRoad.realtime.js'
import { attachSlotRealtime, stopSlotRealtime } from './modules/games/slot.realtime.js'
import { attachGameWsUpgrade } from './modules/games/gameWsRouter.js'
import { attachAgentRealtime, stopAgentRealtime } from './modules/agents/agent.realtime.js'
import { attachPlayerRealtime, stopPlayerRealtime } from './modules/wallet/player.realtime.js'
import { startDepositExpirySweeper, stopDepositExpirySweeper } from './modules/deposits/deposits.expiry.js'
import { startPayoutHoldSweeper, stopPayoutHoldSweeper } from './modules/withdrawals/payouts.expiry.js'
import {
  startDailyCommissionSweeper,
  stopDailyCommissionSweeper,
} from './modules/commission/commission.daily.js'
import { releaseStuckDepositBonuses } from './core/wager.js'

async function main() {
  await prisma.$connect()
  const app = createApp()
  const server = app.listen(env.port, () => {
    logger.info(`🚀 Zee9 backend on http://localhost:${env.port}${env.apiPrefix}`)
  })

  attachAviatorRealtime(server)
  attachCrashRealtime(server)
  attachAeroXRealtime(server)
  attachDoubleCrashRealtime(server)
  attachWingoRealtime(server)
  attachLotteryRealtime(server)
  attachRouletteRealtime(server)
  attachCarRouletteRealtime(server)
  attachZooRouletteRealtime(server)
  attachDragonTigerRealtime(server)
  attachSevenUpRealtime(server)
  attachMinesRealtime(server)
  attachChickenRoadRealtime(server)
  attachSlotRealtime(server)
  attachAgentRealtime(server)
  attachPlayerRealtime(server)
  attachGameWsUpgrade(server)
  startDepositExpirySweeper()
  startPayoutHoldSweeper()
  startDailyCommissionSweeper()
  void releaseStuckDepositBonuses()

  const shutdown = async (sig: string) => {
    logger.info(`${sig} received, shutting down`)
    stopDepositExpirySweeper()
    stopPayoutHoldSweeper()
    stopDailyCommissionSweeper()
    stopAviatorRealtime()
    stopCrashRealtime()
    stopAeroXRealtime()
    stopDoubleCrashRealtime()
    stopWingoRealtime()
    stopLotteryRealtime()
    stopRouletteRealtime()
    stopCarRouletteRealtime()
    stopZooRouletteRealtime()
    stopDragonTigerRealtime()
    stopSevenUpRealtime()
    stopMinesRealtime()
    stopChickenRoadRealtime()
    stopSlotRealtime()
    stopAgentRealtime()
    stopPlayerRealtime()
    server.close()
    await prisma.$disconnect()
    process.exit(0)
  }
  process.on('SIGINT', () => shutdown('SIGINT'))
  process.on('SIGTERM', () => shutdown('SIGTERM'))
}

main().catch((err) => {
  logger.error({ err }, 'Fatal startup error')
  process.exit(1)
})
