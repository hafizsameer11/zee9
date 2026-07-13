import { Router } from 'express'
import { z } from 'zod'
import { authenticate } from '../../middleware/authenticate.js'
import { validate } from '../../middleware/validate.js'
import { asyncHandler } from '../../lib/asyncHandler.js'
import { ok } from '../../lib/respond.js'
import { prisma } from '../../lib/prisma.js'
import type { PaymentMethod } from '@prisma/client'

export const channelRoutes = Router()

const querySchema = z.object({ method: z.enum(['JAZZCASH', 'EASYPAISA', 'BANK', 'WEGARS']).optional() })

// Player: list enabled channels to pay into (optionally filtered by method).
channelRoutes.get(
  '/',
  authenticate,
  validate({ query: querySchema }),
  asyncHandler(async (req, res) => {
    const method = req.query.method as PaymentMethod | undefined
    const channels = await prisma.paymentChannel.findMany({
      where: { enabled: true, ...(method ? { method } : {}) },
      orderBy: [{ priority: 'desc' }, { createdAt: 'asc' }],
      select: { id: true, method: true, accountNumber: true, accountTitle: true, bankName: true, instructions: true, minAmount: true, maxAmount: true },
    })
    ok(res, channels)
  }),
)
