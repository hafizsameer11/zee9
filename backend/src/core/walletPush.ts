import { AsyncLocalStorage } from 'node:async_hooks'

export type PendingNotification = {
  userId: string
  id: string
  kind: string
  title: string
  body: string
  createdAt: string
}

type WalletPushStore = {
  userIds: Set<string>
  reason: string
  notifications: PendingNotification[]
  withdrawUpdates: Array<{ userId: string; data: Record<string, unknown> }>
  depositUpdates: Array<{ userId: string; data: Record<string, unknown> }>
}

export const walletPushAls = new AsyncLocalStorage<WalletPushStore>()

export function createWalletPushStore(reason = 'ledger'): WalletPushStore {
  return {
    userIds: new Set(),
    reason,
    notifications: [],
    withdrawUpdates: [],
    depositUpdates: [],
  }
}

/** Track a MAIN/BONUS balance change for push after the money tx commits. */
export function trackWalletUser(userId: string, reason?: string) {
  const store = walletPushAls.getStore()
  if (!store) return
  store.userIds.add(userId)
  if (reason) store.reason = reason
}

export function queueNotificationPush(n: PendingNotification) {
  const store = walletPushAls.getStore()
  if (store) {
    store.notifications.push(n)
    return true
  }
  return false
}

export function queueWithdrawUpdate(userId: string, data: Record<string, unknown>) {
  const store = walletPushAls.getStore()
  if (store) {
    store.withdrawUpdates.push({ userId, data })
    return true
  }
  return false
}

export function queueDepositUpdate(userId: string, data: Record<string, unknown>) {
  const store = walletPushAls.getStore()
  if (store) {
    store.depositUpdates.push({ userId, data })
    return true
  }
  return false
}
