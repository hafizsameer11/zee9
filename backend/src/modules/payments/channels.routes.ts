import { Router } from 'express'
import { z } from 'zod'
import { authenticate } from '../../middleware/authenticate.js'
import { validate } from '../../middleware/validate.js'
import { asyncHandler } from '../../lib/asyncHandler.js'
import { ok } from '../../lib/respond.js'
import { prisma } from '../../lib/prisma.js'
import type { PaymentMethod } from '@prisma/client'
import { getSettings } from '../../core/settings.js'

export const channelRoutes = Router()

const querySchema = z.object({ method: z.enum(['JAZZCASH', 'EASYPAISA', 'BANK', 'WEGARS']).optional() })

/**
 * Player deposit destinations = agent's currently active (enabled) collection accounts.
 * Only one JazzCash + one Easypaisa can be active per agent; players see those.
 * Falls back to platform PaymentChannel if none are active.
 */
channelRoutes.get(
  '/',
  authenticate,
  validate({ query: querySchema }),
  asyncHandler(async (req, res) => {
    const method = req.query.method as PaymentMethod | undefined
    const s = await getSettings()

    const agentAccounts = await prisma.agentAccount.findMany({
      where: {
        enabled: true,
        awaitingReview: false,
        user: { role: 'AGENT', agentActive: true, status: 'ACTIVE' },
        ...(method ? { method } : {}),
      },
      orderBy: { createdAt: 'asc' },
      include: { user: { select: { id: true, displayName: true } } },
      take: 50,
    })

    if (agentAccounts.length > 0) {
      // Round-robin-ish: shuffle lightly by id hash so one agent isn't always first
      const mapped = agentAccounts.map((a) => ({
        id: a.id,
        method: a.method,
        accountNumber: a.number,
        accountTitle: a.holder,
        bankName: undefined as string | undefined,
        instructions: `Send to this ${a.method === 'JAZZCASH' ? 'JazzCash' : a.method === 'EASYPAISA' ? 'Easypaisa' : 'account'} and upload the receipt. An agent will confirm your deposit.`,
        minAmount: s.minDeposit * 100,
        maxAmount: s.maxDeposit * 100,
        source: 'agent' as const,
        agentId: a.userId,
      }))
      ok(res, mapped)
      return
    }

    const channels = await prisma.paymentChannel.findMany({
      where: { enabled: true, agentFloat: false, ...(method ? { method } : {}) },
      orderBy: [{ priority: 'desc' }, { createdAt: 'asc' }],
      select: {
        id: true,
        method: true,
        accountNumber: true,
        accountTitle: true,
        bankName: true,
        instructions: true,
        minAmount: true,
        maxAmount: true,
      },
    })
    ok(res, channels.map((c) => ({ ...c, source: 'platform' as const })))
  }),
)
