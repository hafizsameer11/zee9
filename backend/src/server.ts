import { createApp } from './app.js'
import { env } from './lib/env.js'
import { logger } from './lib/logger.js'
import { prisma } from './lib/prisma.js'
import { attachAviatorRealtime, stopAviatorRealtime } from './modules/games/aviator.realtime.js'

async function main() {
  await prisma.$connect()
  const app = createApp()
  const server = app.listen(env.port, () => {
    logger.info(`🚀 Zee9 backend on http://localhost:${env.port}${env.apiPrefix}`)
  })

  attachAviatorRealtime(server)

  const shutdown = async (sig: string) => {
    logger.info(`${sig} received, shutting down`)
    stopAviatorRealtime()
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
