import { prisma } from '../../lib/prisma.js'
import { logger } from '../../lib/logger.js'
import { notify } from '../../core/notify.js'
import { pushPlayerWallet } from '../wallet/player.realtime.js'
import { agentConfirmDeposit, PAY_WINDOW_MS, MERCHANT_CONFIRM_MS } from './deposits.service.js'

const SWEEP_MS = 30_000

/**
 * C2C deposit timers:
 * 1) Player does not submit TID within 5 minutes → order auto-cancelled (FAIL).
 * 2) After submit, merchant does not confirm within 1 hour → order auto-done (SUCCESS + credit).
 */
export async function sweepDepositTimeouts() {
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
      logger.warn({ err, orderId: order.id }, 'Failed to auto-confirm deposit order')
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
