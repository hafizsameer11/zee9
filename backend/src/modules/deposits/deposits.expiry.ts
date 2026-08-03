import { prisma } from '../../lib/prisma.js'
import { logger } from '../../lib/logger.js'
import { notify } from '../../core/notify.js'
import { pushPlayerWallet } from '../wallet/player.realtime.js'
import { getSettings } from '../../core/settings.js'
import { toPaisa, toRupees } from '../../lib/money.js'
import { balances } from '../wallet/wallet.service.js'
import {
  agentConfirmDeposit,
  agentRejectDeposit,
  PAY_WINDOW_MS,
  MERCHANT_CONFIRM_MS,
} from './deposits.service.js'

const SWEEP_MS = 30_000

/** Fail open deposit orders a merchant can no longer settle (float ran out / over-allocated). */
async function sweepInsufficientFloatOrders() {
  const open = await prisma.collectionOrder.findMany({
    where: {
      type: 'DEPOSIT',
      status: { in: ['PENDING', 'CHECKING', 'PROCESSING'] },
      agentId: { not: null },
    },
    orderBy: { createdAt: 'asc' },
    take: 100,
    select: {
      id: true,
      orderNo: true,
      amount: true,
      agentId: true,
      depositId: true,
      playerId: true,
    },
  })
  if (!open.length) return

  const agentIds = [...new Set(open.map((o) => o.agentId!).filter(Boolean))]
  const mainBal = new Map<string, bigint>()
  for (const id of agentIds) {
    const bal = await balances(id)
    mainBal.set(id, bal.MAIN ?? 0n)
  }

  // Oldest orders first — keep what float can cover, fail the rest.
  const committed = new Map<string, bigint>()
  for (const order of open) {
    const agentId = order.agentId!
    const used = committed.get(agentId) ?? 0n
    const balance = mainBal.get(agentId) ?? 0n
    const canCover = balance >= used + order.amount

    if (!canCover) {
      try {
        await agentRejectDeposit(
          order.id,
          agentId,
          'Merchant float insufficient — order cancelled automatically',
        )
        if (order.playerId) void pushPlayerWallet(order.playerId, 'deposit_rejected')
        logger.info({ orderNo: order.orderNo, agentId }, 'C2C deposit auto-failed (insufficient merchant float)')
      } catch (err) {
        logger.warn({ err, orderId: order.id }, 'Failed to auto-fail deposit for insufficient float')
      }
      continue
    }

    committed.set(agentId, used + order.amount)
  }
}

/** Turn off collections for merchants who cannot cover the minimum deposit amount. */
async function sweepDepletedMerchants() {
  const s = await getSettings()
  const minAmount = toPaisa(s.minDeposit)
  const agents = await prisma.user.findMany({
    where: { role: 'AGENT', agentActive: true },
    select: { id: true },
  })
  for (const agent of agents) {
    const bal = await balances(agent.id)
    if ((bal.MAIN ?? 0n) < minAmount) {
      await prisma.user.update({ where: { id: agent.id }, data: { agentActive: false } })
      logger.info({ agentId: agent.id, float: toRupees(bal.MAIN ?? 0n) }, 'C2C merchant collections auto-disabled (low float)')
    }
  }
}

/**
 * C2C deposit timers:
 * 1) Player does not submit TID within 5 minutes → order auto-cancelled (FAIL).
 * 2) After submit, merchant does not confirm within 1 hour → order auto-done (SUCCESS + credit).
 */
export async function sweepDepositTimeouts() {
  await sweepInsufficientFloatOrders()
  await sweepDepletedMerchants()

  const now = Date.now()
  const submitDeadline = new Date(now - PAY_WINDOW_MS)
  const confirmDeadline = new Date(now - MERCHANT_CONFIRM_MS)

  // --- 1) Expire unsubmitted deposits (no TRX within 5 minutes of create) ---
  // Include CHECKING/PROCESSING: merchant may open the order before the player submits TID.
  const stalePending = await prisma.collectionOrder.findMany({
    where: {
      type: 'DEPOSIT',
      status: { in: ['PENDING', 'CHECKING', 'PROCESSING'] },
      createdAt: { lt: submitDeadline },
      submittedAt: null,
      OR: [{ trxId: null }, { trxId: '' }],
    },
    take: 50,
    select: { id: true, depositId: true, orderNo: true, playerId: true },
  })

  for (const order of stalePending) {
    try {
      await prisma.$transaction(async (tx) => {
        const fresh = await tx.collectionOrder.findUnique({ where: { id: order.id } })
        if (!fresh) return
        if (!['PENDING', 'CHECKING', 'PROCESSING'].includes(fresh.status)) return
        if (fresh.submittedAt || (fresh.trxId && fresh.trxId.trim())) return

        await tx.collectionOrder.update({
          where: { id: order.id },
          data: { status: 'FAIL', resolvedAt: new Date() },
        })

        if (order.depositId) {
          const dep = await tx.deposit.findUnique({ where: { id: order.depositId } })
          if (dep && dep.status === 'PENDING') {
            await tx.deposit.update({
              where: { id: dep.id },
              data: {
                status: 'REJECTED',
                rejectReason: 'Payment window expired — not submitted within 5 minutes',
                processedAt: new Date(),
              },
            })
            await notify(
              tx,
              dep.userId,
              'deposit',
              'Deposit expired',
              'You did not submit payment within 5 minutes. Please create a new deposit.',
            )
          }
        }
      })
      if (order.playerId) void pushPlayerWallet(order.playerId, 'deposit_expired')
      logger.info({ orderNo: order.orderNo }, 'C2C deposit auto-expired (no submit)')
    } catch (err) {
      logger.warn({ err, orderId: order.id }, 'Failed to auto-expire deposit order')
    }
  }

  // --- 2) Auto-confirm submitted orders after 1 hour (must have TRX / submittedAt) ---
  const staleSubmitted = await prisma.collectionOrder.findMany({
    where: {
      type: 'DEPOSIT',
      status: { in: ['CHECKING', 'PROCESSING'] },
      agentId: { not: null },
      depositId: { not: null },
      submittedAt: { lt: confirmDeadline },
      NOT: [{ OR: [{ trxId: null }, { trxId: '' }] }],
    },
    take: 20,
    select: { id: true, agentId: true, orderNo: true, trxId: true },
  })

  for (const order of staleSubmitted) {
    if (!order.agentId) continue
    try {
      await agentConfirmDeposit(order.id, order.agentId, order.trxId ?? undefined)
      logger.info({ orderNo: order.orderNo }, 'C2C deposit auto-confirmed (merchant timeout 1h)')
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err)
      if (msg.includes('Insufficient merchant float')) {
        try {
          await agentRejectDeposit(
            order.id,
            order.agentId,
            'Merchant float insufficient — order cancelled automatically',
          )
          logger.info({ orderNo: order.orderNo }, 'C2C deposit auto-failed on confirm (insufficient float)')
        } catch (rejectErr) {
          logger.warn({ err: rejectErr, orderId: order.id }, 'Failed to auto-fail deposit after float error')
        }
      } else {
        logger.warn({ err, orderId: order.id }, 'Failed to auto-confirm deposit order')
      }
    }
  }
}

let timer: ReturnType<typeof setInterval> | null = null

export function startDepositExpirySweeper() {
  if (timer) return
  void sweepDepositTimeouts()
  timer = setInterval(() => {
    void sweepDepositTimeouts()
  }, SWEEP_MS)
  logger.info('C2C deposit expiry sweeper started (5m submit / 1h auto-confirm)')
}

export function stopDepositExpirySweeper() {
  if (timer) {
    clearInterval(timer)
    timer = null
  }
}
