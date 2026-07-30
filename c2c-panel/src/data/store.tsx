import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react'
import { api } from '../api/client'
import { startAlertSound, stopAlertSound } from '../api/alertSound'
import { useMerchantRealtime, type MerchantDepositEvent } from '../api/realtime'
import type { BankAccount, CollectionOrder } from './mock'

export interface StatGroup {
  colAmount: number
  colReward: number
  payAmount: number
  payReward: number
}
export interface AgentStats {
  today: StatGroup
  week: StatGroup
  month: StatGroup
}
export interface AgentTxn {
  id: string
  type: string
  amount: number
  signed: number
  time: string
}
export interface PayoutOrder {
  id: string
  orderNo: string
  amount: number
  reward: number
  payeeName: string
  payeeAccount: string
  payeeBank: string
  method: string
  time: string
}
export interface AvailableWithdrawal {
  id: string
  amount: number
  method: string
  payeeName: string
  payeeAccount: string
  playerName: string
  time: string
}

const EMPTY_STAT: StatGroup = { colAmount: 0, colReward: 0, payAmount: 0, payReward: 0 }

interface Store {
  balance: number
  freeze: number
  walletAccount: string
  loading: boolean
  collectionsOn: boolean
  setCollectionsOn: (v: boolean) => void
  addAccount: (a: Omit<BankAccount, 'id'>) => Promise<void>
  orders: CollectionOrder[]
  resolveOrder: (id: string, status: CollectionOrder['status'], trxId?: string) => Promise<void>
  acceptOrder: (id: string) => Promise<void>
  toggleAccount: (id: string) => void
  deleteAccount: (id: string) => void
  accounts: BankAccount[]
  payouts: PayoutOrder[]
  availablePayouts: AvailableWithdrawal[]
  claimPayout: (withdrawalId: string) => Promise<void>
  submitPayout: (id: string, trxId: string) => Promise<void>
  cancelPayout: (id: string) => Promise<void>
  abnormalPayout: (id: string, reason?: string) => Promise<void>
  earnings: { total: number; locked: number; available: number; holdDays: number }
  stats: AgentStats
  transactions: AgentTxn[]
  reload: () => void
  toast: string | null
  showToast: (m: string) => void
  depositAlert: MerchantDepositEvent | null
  /** Snooze current alert ~10s then show again (TRX checking reminders). */
  snoozeDepositAlert: () => void
  /** Open order — keep reminder until resolve, but hide briefly. */
  openDepositAlert: () => void
}

const StoreCtx = createContext<Store | null>(null)

// ---------- mappers (backend → frontend) ----------
const r = (paisa: number | bigint | undefined) => Number(paisa ?? 0) / 100
const METHOD: Record<string, BankAccount['method']> = { JAZZCASH: 'Jazzcash', EASYPAISA: 'Easypaisa', BANK: 'Bank' }
const METHOD_BE: Record<string, string> = { Jazzcash: 'JAZZCASH', Easypaisa: 'EASYPAISA', Bank: 'BANK' }
const ORDER_STATUS: Record<string, CollectionOrder['status']> = {
  PENDING: 'pending', CHECKING: 'checking', PROCESSING: 'processing', SUCCESS: 'success', FAIL: 'fail',
}

function mapAccount(a: any): BankAccount {
  return { id: a.id, number: a.number, holder: a.holder, method: METHOD[a.method] ?? 'Bank', on: a.enabled, awaiting: a.awaitingReview }
}
function mapOrder(o: any): CollectionOrder {
  return {
    id: o.id,
    orderNo: o.orderNo,
    type: o.type,
    amount: r(o.amount),
    reward: r(o.reward),
    account: o.walletAccount ?? '',
    time: String(o.createdAt).replace('T', ' ').slice(0, 19),
    status: ORDER_STATUS[o.status] ?? 'pending',
    method: (METHOD[o.method] ?? 'Jazzcash') as CollectionOrder['method'],
    collectionAccount: o.collectionAccount ?? '',
    collectionHolder: o.collectionHolder ?? undefined,
    playerName: o.playerName ?? o.player?.displayName ?? undefined,
    trxId: o.trxId ?? undefined,
    submittedAt: o.submittedAt ? String(o.submittedAt) : undefined,
    createdAt: o.createdAt ? String(o.createdAt) : undefined,
    manualDone: !!o.manualDone,
  }
}

function mapStat(s: any): StatGroup {
  return { colAmount: r(s?.colAmount), colReward: r(s?.colReward), payAmount: r(s?.payAmount), payReward: r(s?.payReward) }
}
function mapTxn(t: any): AgentTxn {
  return {
    id: t.id,
    type: typeof t.type === 'string' ? t.type : 'Transaction',
    amount: r(t.amount),
    signed: r(t.signed),
    time: String(t.time).replace('T', ' ').slice(0, 19),
  }
}
function mapPayout(o: any): PayoutOrder {
  return {
    id: o.id,
    orderNo: o.orderNo,
    amount: r(o.amount),
    reward: r(o.reward),
    payeeName: o.payeeName ?? '',
    payeeAccount: o.collectionAccount ?? '',
    payeeBank: o.payeeBank ?? '',
    method: METHOD[o.method] ?? 'Bank',
    time: String(o.createdAt).replace('T', ' ').slice(0, 19),
  }
}
function mapAvailable(w: any): AvailableWithdrawal {
  const details = w.accountDetails || {}
  return {
    id: w.id,
    amount: r(w.amount),
    method: METHOD[w.method] ?? 'Bank',
    payeeName: details.title || w.user?.displayName || '',
    payeeAccount: details.number || '',
    playerName: w.user?.displayName || '',
    time: String(w.createdAt).replace('T', ' ').slice(0, 19),
  }
}

const CO_KEY = 'c2c-collections-on'
const CHECKING_SNOOZE_MS = 10_000

function alertFromOrder(o: CollectionOrder): MerchantDepositEvent {
  return {
    type: 'deposit_submitted',
    title: 'Checking required',
    body: `Player paid Rs ${o.amount.toLocaleString('en-PK')} — confirm this order.`,
    orderId: o.id,
    orderNo: o.orderNo,
    amount: o.amount,
    method: o.method,
    collectionAccount: o.collectionAccount || null,
    trxId: o.trxId ?? null,
    playerName: o.playerName ?? null,
  }
}

export function StoreProvider({ children }: { children: ReactNode }) {
  const [balance, setBalance] = useState(0)
  const [freeze, setFreeze] = useState(0)
  const [walletAccount, setWalletAccount] = useState('')
  const [accounts, setAccounts] = useState<BankAccount[]>([])
  const [orders, setOrders] = useState<CollectionOrder[]>([])
  const [stats, setStats] = useState<AgentStats>({ today: EMPTY_STAT, week: EMPTY_STAT, month: EMPTY_STAT })
  const [transactions, setTransactions] = useState<AgentTxn[]>([])
  const [payouts, setPayouts] = useState<PayoutOrder[]>([])
  const [availablePayouts, setAvailablePayouts] = useState<AvailableWithdrawal[]>([])
  const [earnings, setEarnings] = useState({ total: 0, locked: 0, available: 0, holdDays: 7 })
  const [loading, setLoading] = useState(true)
  const [collectionsOn, setCollectionsOnState] = useState(localStorage.getItem(CO_KEY) !== '0')
  const [toast, setToast] = useState<string | null>(null)
  /** One-shot new-order alerts (dismiss forever for that event). */
  const [newOrderAlerts, setNewOrderAlerts] = useState<MerchantDepositEvent[]>([])
  /** Orders waiting for merchant confirm after player TRX — keep alerting until resolved. */
  const [checkingById, setCheckingById] = useState<Record<string, MerchantDepositEvent>>({})
  /** orderId → snooze until timestamp */
  const [snoozeUntil, setSnoozeUntil] = useState<Record<string, number>>({})
  const [tick, setTick] = useState(Date.now())

  const showToast = useCallback((m: string) => {
    setToast(m)
    window.setTimeout(() => setToast(null), 1800)
  }, [])

  useEffect(() => {
    const t = window.setInterval(() => setTick(Date.now()), 1000)
    return () => window.clearInterval(t)
  }, [])

  const syncCheckingFromOrders = useCallback((ords: CollectionOrder[]) => {
    setCheckingById((prev) => {
      const next: Record<string, MerchantDepositEvent> = {}
      for (const o of ords) {
        if (o.type !== 'DEPOSIT') continue
        if (!(o.status === 'checking' || o.status === 'processing' || o.status === 'pending')) continue
        if (!(o.submittedAt || (o.trxId && o.trxId.trim()))) continue
        next[o.id] = prev[o.id] ?? alertFromOrder(o)
      }
      return next
    })
    // Drop snooze for orders that are gone / resolved
    setSnoozeUntil((prev) => {
      const keep: Record<string, number> = {}
      for (const [id, until] of Object.entries(prev)) {
        const o = ords.find((x) => x.id === id)
        if (o && (o.status === 'checking' || o.status === 'processing' || o.status === 'pending') && (o.submittedAt || o.trxId)) {
          keep[id] = until
        }
      }
      return keep
    })
  }, [])

  const depositAlert = useMemo(() => {
    const now = tick
    if (newOrderAlerts[0]) return newOrderAlerts[0]!
    const waiting = Object.values(checkingById).filter((a) => (snoozeUntil[a.orderId] ?? 0) <= now)
    return waiting[0] ?? null
  }, [newOrderAlerts, checkingById, snoozeUntil, tick])

  useEffect(() => {
    if (depositAlert) startAlertSound()
    else stopAlertSound()
  }, [depositAlert])

  const snoozeDepositAlert = useCallback(() => {
    const cur = depositAlert
    if (!cur) return
    stopAlertSound()
    if (cur.type === 'deposit_new') {
      setNewOrderAlerts((q) => q.slice(1))
      return
    }
    setSnoozeUntil((prev) => ({ ...prev, [cur.orderId]: Date.now() + CHECKING_SNOOZE_MS }))
  }, [depositAlert])

  const openDepositAlert = useCallback(() => {
    const cur = depositAlert
    if (!cur) return
    stopAlertSound()
    if (cur.type === 'deposit_new') {
      setNewOrderAlerts((q) => q.slice(1))
      return
    }
    // Brief snooze so modal closes while merchant is on the order page; pops again in 10s if still open
    setSnoozeUntil((prev) => ({ ...prev, [cur.orderId]: Date.now() + CHECKING_SNOOZE_MS }))
  }, [depositAlert])

  const reload = useCallback(async () => {
    const safe = async <T,>(fn: () => Promise<T>, fallback: T) => {
      try { return await fn() } catch { return fallback }
    }
    const [summary, accs, ords, agentStats, txns, pays, avail, earn] = await Promise.all([
      safe(() => api.get('/agent/summary'), { balance: 0, frozen: 0, agentActive: true }),
      safe(() => api.get('/agent/accounts'), []),
      safe(() => api.get('/agent/orders'), []),
      safe(() => api.get('/agent/stats'), { today: EMPTY_STAT, week: EMPTY_STAT, month: EMPTY_STAT }),
      safe(() => api.get('/agent/transactions'), []),
      safe(() => api.get('/agent/payouts'), []),
      safe(() => api.get('/agent/payouts/available'), []),
      safe(() => api.get('/agent/earnings'), { total: 0, locked: 0, available: 0, holdDays: 7 }),
    ])
    setBalance(r(summary.balance))
    setFreeze(r(summary.frozen))
    if (summary.agentActive !== undefined) setCollectionsOnState(!!summary.agentActive)
    const mappedAccs = accs.map(mapAccount)
    const mappedOrders = ords.map(mapOrder)
    setAccounts(mappedAccs)
    setOrders(mappedOrders)
    syncCheckingFromOrders(mappedOrders)
    setStats({ today: mapStat(agentStats.today), week: mapStat(agentStats.week), month: mapStat(agentStats.month) })
    setTransactions(txns.map(mapTxn))
    setPayouts(pays.map(mapPayout))
    setAvailablePayouts(avail.map(mapAvailable))
    setEarnings({
      total: r(earn.total),
      locked: r(earn.locked),
      available: r(earn.available),
      holdDays: earn.holdDays ?? 7,
    })
    setWalletAccount(mappedAccs.find((a: BankAccount) => a.on)?.number ?? mappedAccs[0]?.number ?? '—')
    setLoading(false)
  }, [syncCheckingFromOrders])

  useEffect(() => {
    reload().catch((e) => { showToast(e?.message || 'Failed to load'); setLoading(false) })
  }, [reload, showToast])

  // Live deposit alerts from players
  useMerchantRealtime(true, (ev: MerchantDepositEvent) => {
    void reload()
    if (ev.type === 'deposit_submitted' && ev.orderId) {
      setCheckingById((prev) => ({ ...prev, [ev.orderId]: ev }))
      setSnoozeUntil((prev) => {
        const next = { ...prev }
        delete next[ev.orderId]
        return next
      })
      return
    }
    setNewOrderAlerts((q) => [...q, ev])
  })

  // Periodically refresh so checking reminders stay in sync with order status
  useEffect(() => {
    const t = window.setInterval(() => {
      void reload()
    }, 15_000)
    return () => window.clearInterval(t)
  }, [reload])

  const setCollectionsOn = useCallback((v: boolean) => {
    setCollectionsOnState(v)
    localStorage.setItem(CO_KEY, v ? '1' : '0')
    api
      .patch('/agent/active', { active: v })
      .then(() => reload())
      .catch((e) => {
        showToast(e?.message || 'Failed to update collections')
        reload()
      })
  }, [reload, showToast])

  const value = useMemo<Store>(
    () => ({
      balance,
      freeze,
      walletAccount,
      stats,
      transactions,
      loading,
      collectionsOn,
      setCollectionsOn,
      accounts,
      toggleAccount: (id) => {
        const acc = accounts.find((a) => a.id === id)
        if (!acc) return
        api
          .patch(`/agent/accounts/${id}`, { enabled: !acc.on })
          .then(() => reload())
          .catch((e) => { showToast(e?.message || 'Failed'); reload() })
      },
      deleteAccount: (id) => {
        setAccounts((prev) => prev.filter((a) => a.id !== id))
        api.del(`/agent/accounts/${id}`).catch((e) => { showToast(e?.message || 'Failed'); reload() })
      },
      addAccount: async (a) => {
        await api.post('/agent/accounts', { method: METHOD_BE[a.method], number: a.number, holder: a.holder })
        await reload()
      },
      orders,
      acceptOrder: async (id) => {
        await api.post(`/agent/orders/${id}/accept`)
        await reload()
      },
      resolveOrder: async (id, status, trxId) => {
        const be = status === 'success' ? 'SUCCESS' : 'FAIL'
        try {
          await api.post(`/agent/orders/${id}/resolve`, { status: be, trxId })
          showToast(status === 'success' ? 'Marked received' : 'Marked not received')
          setCheckingById((prev) => {
            const next = { ...prev }
            delete next[id]
            return next
          })
          await reload()
        } catch (e: any) {
          showToast(e?.message || 'Failed')
          await reload()
          throw e
        }
      },
      payouts,
      availablePayouts,
      claimPayout: async (withdrawalId) => {
        await api.post(`/agent/payouts/${withdrawalId}/claim`)
        showToast('Claimed — pay the player now')
        await reload()
      },
      submitPayout: async (id, trxId) => {
        await api.post(`/agent/payouts/${id}/pay`, { trxId })
        showToast('On hold — after 5 min: Success, amount + reward added to balance')
        await reload()
      },
      cancelPayout: async (id) => {
        await api.post(`/agent/payouts/${id}/cancel`)
        showToast('Cancelled — another merchant can pay this withdraw')
        await reload()
      },
      abnormalPayout: async (id, reason) => {
        await api.post(`/agent/payouts/${id}/abnormal`, reason ? { reason } : {})
        showToast('Abnormal — amount returned to customer game balance')
        await reload()
      },
      earnings,
      reload: () => { reload().catch(() => {}) },
      toast,
      showToast,
      depositAlert,
      snoozeDepositAlert,
      openDepositAlert,
    }),
    [balance, freeze, walletAccount, stats, transactions, payouts, availablePayouts, earnings, loading, collectionsOn, setCollectionsOn, accounts, orders, toast, showToast, reload, depositAlert, snoozeDepositAlert, openDepositAlert],
  )

  return <StoreCtx.Provider value={value}>{children}</StoreCtx.Provider>
}

export function useStore() {
  const ctx = useContext(StoreCtx)
  if (!ctx) throw new Error('useStore must be used within StoreProvider')
  return ctx
}
