import type { Request } from 'express'
import { prisma } from '../lib/prisma.js'

export async function audit(
  req: Request,
  action: string,
  entityType?: string,
  entityId?: string,
  before?: unknown,
  after?: unknown,
) {
  await prisma.auditLog.create({
    data: {
      actorId: req.user?.id,
      action,
      entityType,
      entityId,
      before: before === undefined ? undefined : (before as any),
      after: after === undefined ? undefined : (after as any),
      ip: req.ip,
    },
  })
}
