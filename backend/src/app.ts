import path from 'node:path'
import express from 'express'
import cors from 'cors'
import helmet from 'helmet'
import cookieParser from 'cookie-parser'
import { pinoHttp } from 'pino-http'
import { env } from './lib/env.js'
import { logger } from './lib/logger.js'
import { apiLimiter } from './middleware/rateLimit.js'
import { errorHandler, notFoundHandler } from './middleware/errorHandler.js'

import { authRoutes } from './modules/auth/auth.routes.js'
import { meRoutes } from './modules/wallet/me.routes.js'
import { configRoutes } from './modules/config/config.routes.js'
import { channelRoutes } from './modules/payments/channels.routes.js'
import { uploadRoutes } from './modules/uploads/uploads.routes.js'
import { depositRoutes } from './modules/deposits/deposits.routes.js'
import { withdrawalRoutes } from './modules/withdrawals/withdrawals.routes.js'
import { referralRoutes } from './modules/referrals/referrals.routes.js'
import { bonusRoutes } from './modules/bonuses/bonuses.routes.js'
import { wheelRoutes } from './modules/wheel/wheel.routes.js'
import { gamesRoutes } from './modules/games/games.routes.js'
import { agentRoutes } from './modules/agents/agents.routes.js'
import { adminRoutes } from './modules/admin/admin.routes.js'

export function createApp() {
  const app = express()

  app.use(helmet({ crossOriginResourcePolicy: false }))
  app.use(cors({ origin: env.corsOrigins, credentials: true }))
  app.use(express.json({ limit: '1mb' }))
  app.use(cookieParser())
  app.use(pinoHttp({ logger, autoLogging: { ignore: (req) => req.url === '/health' } }))

  // Static uploads (receipts/proofs), served read-only
  app.use('/uploads', express.static(path.resolve(env.uploadDir), { index: false, dotfiles: 'deny' }))

  app.get('/health', (_req, res) => res.json({ ok: true, service: 'zee9-backend', time: new Date().toISOString() }))

  const api = express.Router()
  api.use(apiLimiter)
  api.use('/auth', authRoutes)
  api.use('/me', meRoutes)
  api.use('/config', configRoutes)
  api.use('/payment-channels', channelRoutes)
  api.use('/uploads', uploadRoutes)
  api.use('/deposits', depositRoutes)
  api.use('/withdrawals', withdrawalRoutes)
  api.use('/referrals', referralRoutes)
  api.use('/bonuses', bonusRoutes)
  api.use('/wheel', wheelRoutes)
  api.use('/games', gamesRoutes)
  api.use('/agent', agentRoutes)
  api.use('/admin', adminRoutes)

  app.use(env.apiPrefix, api)

  app.use(notFoundHandler)
  app.use(errorHandler)
  return app
}
