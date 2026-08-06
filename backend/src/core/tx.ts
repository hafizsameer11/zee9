import { Prisma } from '@prisma/client'
import { prisma, type Tx } from '../lib/prisma.js'
import { createWalletPushStore, walletPushAls } from './walletPush.js'
import {
  notifyPlayer,
  pushPlayerWallet,
} from '../modules/wallet/player.realtime.js'
import { flushCommissionSettlements } from '../modules/commission/commission.queue.js'

/**
 * Run a money-critical transaction at SERIALIZABLE isolation, retrying on
 * serialization/write conflicts. All balance-changing work must run inside this.
 * After commit, pushes wallet / notification / status updates to connected players.
 */
export async function runMoneyTx<T>(fn: (tx: Tx) => Promise<T>, retries = 3): Promise<T> {
  const store = createWalletPushStore('ledger')
  return walletPushAls.run(store, async () => {
    let lastErr: unknown
    let result!: T
    let committed = false
    for (let attempt = 0; attempt < retries; attempt++) {
      // Clear queued side-effects between retries so we don't push stale data.
      store.userIds.clear()
      store.commissionUserIds.clear()
      store.notifications.length = 0
      store.withdrawUpdates.length = 0
      store.depositUpdates.length = 0
      try {
        result = await prisma.$transaction(fn, {
          isolationLevel: Prisma.TransactionIsolationLevel.Serializable,
        })
        committed = true
        break
      } catch (err) {
        lastErr = err
        const code = (err as { code?: string })?.code
        // P2034: transaction conflict / deadlock — safe to retry
        if (code === 'P2034' || code === '40001' || code === '40P01') continue
        throw err
      }
    }
    if (!committed) throw lastErr

    // Fire-and-forget realtime after successful commit
    for (const userId of store.userIds) {
      void pushPlayerWallet(userId, store.reason)
    }
    for (const n of store.notifications) {
      notifyPlayer(n.userId, {
        type: 'notification.created',
        data: {
          id: n.id,
          kind: n.kind,
          title: n.title,
          body: n.body,
          read: false,
          createdAt: n.createdAt,
        },
      })
    }
    for (const w of store.withdrawUpdates) {
      notifyPlayer(w.userId, { type: 'withdraw.updated', data: w.data })
    }
    for (const d of store.depositUpdates) {
      notifyPlayer(d.userId, { type: 'deposit.updated', data: d.data })
    }

    flushCommissionSettlements()

    return result
  })
}
