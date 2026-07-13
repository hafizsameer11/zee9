import type { NextFunction, Request, Response } from 'express'
import { Prisma } from '@prisma/client'
import { AppError } from '../core/errors.js'
import { logger } from '../lib/logger.js'

export function notFoundHandler(_req: Request, res: Response) {
  res.status(404).json({ ok: false, error: { code: 'NOT_FOUND', message: 'Route not found' } })
}

export function errorHandler(err: unknown, _req: Request, res: Response, _next: NextFunction) {
  if (err instanceof AppError) {
    return res.status(err.status).json({ ok: false, error: { code: err.code, message: err.message, details: err.details } })
  }
  if (err instanceof Prisma.PrismaClientKnownRequestError) {
    if (err.code === 'P2002') {
      return res.status(409).json({ ok: false, error: { code: 'CONFLICT', message: 'Duplicate value', details: err.meta } })
    }
    if (err.code === 'P2025') {
      return res.status(404).json({ ok: false, error: { code: 'NOT_FOUND', message: 'Record not found' } })
    }
  }
  logger.error({ err }, 'Unhandled error')
  res.status(500).json({ ok: false, error: { code: 'INTERNAL', message: 'Internal server error' } })
}
