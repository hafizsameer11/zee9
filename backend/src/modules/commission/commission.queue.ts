import { settleCommissionsForUser } from './commission.daily.js'

const pending = new Set<string>()

/** Queue commission re-settlement after the current money tx commits. */
export function queueCommissionSettlement(userId: string) {
  pending.add(userId)
}

/** Flush queued settlements (called from runMoneyTx after commit). */
export function flushCommissionSettlements() {
  if (pending.size === 0) return
  const users = [...pending]
  pending.clear()
  for (const userId of users) {
    void settleCommissionsForUser(userId).catch(() => {})
  }
}
