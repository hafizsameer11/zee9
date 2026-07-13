import type { NextFunction, Request, Response } from 'express'
import type { Role } from '@prisma/client'
import { forbidden, unauthorized } from '../core/errors.js'

/** Restrict a route to one or more roles. Must run after authenticate. */
export function authorize(...roles: Role[]) {
  return (req: Request, _res: Response, next: NextFunction) => {
    if (!req.user) return next(unauthorized())
    if (roles.length && !roles.includes(req.user.role)) return next(forbidden('Insufficient role'))
    next()
  }
}
