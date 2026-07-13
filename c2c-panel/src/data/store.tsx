import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react'
import { api } from '../api/client'
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

const EMPTY_STAT: StatGroup = { colAmount: 0, colReward: 0, payAmount: 0, payReward: 0 }

interface Store {
  balance: number
  freeze: number
  walletAccount: string
  loading: boolean
  collectionsOn: boolean
  setCollectionsOn: (v: boolean) => void
  accounts: BankAccount[]
  toggleAccount: (id: string) => void
  deleteAccount: (id: string) => void
  addAccount: (a: Omit<BankAccount, 'id'>) => void
  orders: CollectionOrder[]
  resolveOrder: (id: string, status: CollectionOrder['status'], trxId?: string) => void
  acceptOrder: (id: string) => Promise<void>
  payouts: PayoutOrder[]
  submitPayout: (id: string, trxId: string, senderAccount: string) => Promise<void>
  stats: AgentStats
  transactions: AgentTxn[]
  reload: () => void
  toast: string | null
  showToast: (m: string) => void
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
  }
}

const TXN_LABEL: Record<string, string> = {
  DEPOSIT: 'Deposit',
  WITHDRAWAL_FREEZE: 'Withdrawal (freeze)',
  WITHDRAWAL_PAID: 'Withdrawal (paid)',
  WITHDRAWAL_UNFREEZE: 'Withdrawal (unfreeze)',
  DEPOSIT_BONUS: 'Deposit bonus',
  REGISTRATION_BONUS: 'Registration bonus',
  DAILY_BONUS: 'Daily bonus',
  COMMISSION: 'Commission',
  WHEEL_PRIZE: 'Wheel prize',
  BONUS_RELEASE: 'Bonus release',
  ADMIN_ADJUST: 'Adjustment',
}
function mapStat(s: any): StatGroup {
  return { colAmount: r(s?.colAmount), colReward: r(s?.colReward), payAmount: r(s?.payAmount), payReward: r(s?.payReward) }
}
function mapTxn(t: any): AgentTxn {
  return { id: t.id, type: TXN_LABEL[t.type] ?? t.type, amount: r(t.amount), signed: r(t.signed), time: String(t.time).replace('T', ' ').slice(0, 19) }
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

const CO_KEY = 'c2c-collections-on'

export function StoreProvider({ children }: { children: ReactNode }) {
  const [balance, setBalance] = useState(0)
  const [freeze, setFreeze] = useState(0)
  const [walletAccount, setWalletAccount] = useState('')
  const [accounts, setAccounts] = useState<BankAccount[]>([])
  const [orders, setOrders] = useState<CollectionOrder[]>([])
  const [stats, setStats] = useState<AgentStats>({ today: EMPTY_STAT, week: EMPTY_STAT, month: EMPTY_STAT })
  const [transactions, setTransactions] = useState<AgentTxn[]>([])
  const [payouts, setPayouts] = useState<PayoutOrder[]>([])
  const [loading, setLoading] = useState(true)
  const [collectionsOn, setCollectionsOnState] = useState(localStorage.getItem(CO_KEY) !== '0')
  const [toast, setToast] = useState<string | null>(null)

  const showToast = useCallback((m: string) => {
    setToast(m)
    window.setTimeout(() => setToast(null), 1800)
  }, [])

  const reload = useCallback(async () => {
    const safe = async <T,>(fn: () => Promise<T>, fallback: T) => {
      try { return await fn() } catch { return fallback }
    }
    const [summary, accs, ords, agentStats, txns, pays] = await Promise.all([
      safe(() => api.get('/agent/summary'), { balance: 0, frozen: 0, agentActive: true }),
      safe(() => api.get('/agent/accounts'), []),
      safe(() => api.get('/agent/orders'), []),
      safe(() => api.get('/agent/stats'), { today: EMPTY_STAT, week: EMPTY_STAT, month: EMPTY_STAT }),
      safe(() => api.get('/me/wallet/transactions'), []),
      safe(() => api.get('/agent/payouts'), []),
    ])
    setBalance(r(summary.balance))
    setFreeze(r(summary.frozen))
    if (summary.agentActive !== undefined) setCollectionsOnState(!!summary.agentActive)
    const mappedAccs = accs.map(mapAccount)
    setAccounts(mappedAccs)
    setOrders(ords.map(mapOrder))
    setStats({ today: mapStat(agentStats.today), week: mapStat(agentStats.week), month: mapStat(agentStats.month) })
    setTransactions(txns.map(mapTxn))
    setPayouts(pays.map(mapPayout))
    setWalletAccount(mappedAccs.find((a: BankAccount) => a.on)?.number ?? mappedAccs[0]?.number ?? '—')
    setLoading(false)
  }, [])

  useEffect(() => {
    reload().catch((e) => { showToast(e?.message || 'Failed to load'); setLoading(false) })
  }, [reload, showToast])

  const setCollectionsOn = useCallback((v: boolean) => {
    setCollectionsOnState(v)
    localStorage.setItem(CO_KEY, v ? '1' : '0')
  }, [])

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
        setAccounts((prev) => prev.map((a) => (a.id === id ? { ...a, on: !a.on } : a)))
        api.patch(`/agent/accounts/${id}`, { enabled: !acc.on }).catch((e) => { showToast(e?.message || 'Failed'); reload() })
      },
      deleteAccount: (id) => {
        setAccounts((prev) => prev.filter((a) => a.id !== id))
        api.del(`/agent/accounts/${id}`).catch((e) => { showToast(e?.message || 'Failed'); reload() })
      },
      addAccount: (a) => {
        api
          .post('/agent/accounts', { method: METHOD_BE[a.method], number: a.number, holder: a.holder })
          .then(() => reload())
          .catch((e) => showToast(e?.message || 'Failed to add account'))
      },
      orders,
      acceptOrder: async (id) => {
        await api.post(`/agent/orders/${id}/accept`)
        await reload()
      },
      resolveOrder: (id, status, trxId) => {
        const be = status === 'success' ? 'SUCCESS' : 'FAIL'
        api
          .post(`/agent/orders/${id}/resolve`, { status: be, trxId })
          .then(() => reload())
          .catch((e) => { showToast(e?.message || 'Failed'); reload() })
        showToast(status === 'success' ? 'Order completed' : 'Order updated')
      },
      payouts,
      submitPayout: async (id, trxId, senderAccount) => {
        await api.post(`/agent/payouts/${id}/pay`, { trxId, senderAccount })
        showToast('Payment submitted')
        await reload()
      },
      reload: () => { reload().catch(() => {}) },
      toast,
      showToast,
    }),
    [balance, freeze, walletAccount, stats, transactions, payouts, loading, collectionsOn, setCollectionsOn, accounts, orders, toast, showToast, reload],
  )

  return <StoreCtx.Provider value={value}>{children}</StoreCtx.Provider>
}

export function useStore() {
  const ctx = useContext(StoreCtx)
  if (!ctx) throw new Error('useStore must be used within StoreProvider')
  return ctx
}
