import type { NextFunction, Request, Response } from 'express'
import { prisma } from '../lib/prisma.js'
import { forbidden, unauthorized } from '../core/errors.js'

export const ADMIN_SCOPES = [
  'finance', // deposits, withdrawals, wallet adjust
  'users', // users, agents
  'config', // settings, games, wheel, cashback, offers, channels
  'reports', // reports, ledger, audit
  'commission', // commission payouts
] as const

export type AdminScope = (typeof ADMIN_SCOPES)[number]

/**
 * Require a specific admin scope. A full/super admin (empty adminScopes) passes any scope.
 * Must run after authenticate + authorize('ADMIN').
 */
export function requireScope(scope: AdminScope) {
  return async (req: Request, _res: Response, next: NextFunction) => {
    if (!req.user) return next(unauthorized())
    const u = await prisma.user.findUnique({ where: { id: req.user.id }, select: { adminScopes: true } })
    if (!u) return next(unauthorized())
    if (u.adminScopes.length === 0) return next() // super admin
    if (u.adminScopes.includes(scope)) return next()
    next(forbidden(`Missing admin scope: ${scope}`))
  }
}
