import { walletPushAls } from '../../core/walletPush.js'
import { settleCommissionsForUser } from './commission.daily.js'
import { logger } from '../../lib/logger.js'

/** Queue commission re-settlement after the current money tx commits. */
export function queueCommissionSettlement(userId: string) {
  const store = walletPushAls.getStore()
  if (store) store.commissionUserIds.add(userId)
}

/** Flush queued settlements (called from runMoneyTx after commit). */
export function flushCommissionSettlements() {
  const store = walletPushAls.getStore()
  if (!store || store.commissionUserIds.size === 0) return
  const users = [...store.commissionUserIds]
  store.commissionUserIds.clear()
  for (const userId of users) {
    void settleCommissionsForUser(userId).catch((err) => {
      logger.error({ err, userId }, 'commission settlement failed')
    })
  }
}
