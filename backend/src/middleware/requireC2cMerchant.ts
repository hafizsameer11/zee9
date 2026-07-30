import type { NextFunction, Request, Response } from 'express'
import { prisma } from '../lib/prisma.js'
import { forbidden, unauthorized } from '../core/errors.js'

/**
 * C2C merchant panel only: role AGENT + assigned panelId.
 * Blocks players, referral agents, mentors, and admins.
 */
export async function requireC2cMerchant(req: Request, _res: Response, next: NextFunction) {
  if (!req.user) return next(unauthorized())
  if (req.user.role !== 'AGENT') {
    return next(forbidden('C2C panel is for merchants only'))
  }
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.user.id },
      select: { panelId: true, status: true },
    })
    if (!user || user.status === 'BANNED') return next(forbidden('Merchant account unavailable'))
    if (user.panelId == null) {
      return next(forbidden('C2C panel is for merchants only'))
    }
    next()
  } catch (e) {
    next(e)
  }
}
