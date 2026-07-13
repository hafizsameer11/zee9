import { Router } from 'express'
import { verifyAccess } from '../lib/jwt.js'
import { unauthorized } from '../core/errors.js'
import { prisma } from '../lib/prisma.js'

export async function authenticate(req: import('express').Request, _res: import('express').Response, next: import('express').NextFunction) {
  const header = req.headers.authorization
  if (!header?.startsWith('Bearer ')) return next(unauthorized('Missing bearer token'))
  const token = header.slice(7)
  try {
    const payload = verifyAccess(token)
    const user = await prisma.user.findUnique({ where: { id: payload.sub }, select: { id: true, role: true, status: true } })
    if (!user) return next(unauthorized('User not found'))
    if (user.status === 'BANNED') return next(unauthorized('Account is banned'))
    req.user = { id: user.id, role: user.role }
    next()
  } catch {
    next(unauthorized('Invalid or expired token'))
  }
}
