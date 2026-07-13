import jwt from 'jsonwebtoken'
import type { Role } from '@prisma/client'
import { env } from './env.js'

export interface AccessPayload {
  sub: string
  role: Role
}

export function signAccess(payload: AccessPayload): string {
  return jwt.sign(payload, env.jwt.accessSecret, { expiresIn: env.jwt.accessTtl as any })
}

export function signRefresh(payload: { sub: string; sid: string }): string {
  return jwt.sign(payload, env.jwt.refreshSecret, { expiresIn: env.jwt.refreshTtl as any })
}

export function verifyAccess(token: string): AccessPayload {
  return jwt.verify(token, env.jwt.accessSecret) as AccessPayload
}

export function verifyRefresh(token: string): { sub: string; sid: string } {
  return jwt.verify(token, env.jwt.refreshSecret) as { sub: string; sid: string }
}
