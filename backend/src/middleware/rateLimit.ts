import rateLimit from 'express-rate-limit'
import type { RequestHandler } from 'express'

/** No-op — rate limits disabled (were causing login blocks + C2C forced logouts). */
export const authLimiter: RequestHandler = (_req, _res, next) => next()

function jsonLimitHandler(_req: any, res: any) {
  res.status(429).json({
    ok: false,
    error: { code: 'RATE_LIMITED', message: 'Too many requests, try later' },
  })
}

/** Soft general API limiter (high ceiling; JSON body only). */
export const apiLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 5000,
  standardHeaders: true,
  legacyHeaders: false,
  message: { ok: false, error: { code: 'RATE_LIMITED', message: 'Too many requests, try later' } },
  handler: jsonLimitHandler,
})
