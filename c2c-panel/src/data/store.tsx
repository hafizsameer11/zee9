import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from 'react'
import {
  BALANCE,
  INITIAL_ACCOUNTS,
  INITIAL_ORDERS,
  type BankAccount,
  type CollectionOrder,
} from './mock'

interface Store {
  balance: number
  freeze: number
  collectionsOn: boolean
  setCollectionsOn: (v: boolean) => void
  accounts: BankAccount[]
  toggleAccount: (id: string) => void
  deleteAccount: (id: string) => void
  addAccount: (a: Omit<BankAccount, 'id'>) => void
  orders: CollectionOrder[]
  resolveOrder: (id: string, status: CollectionOrder['status']) => void
  toast: string | null
  showToast: (m: string) => void
}

const StoreCtx = createContext<Store | null>(null)

const LS_KEY = 'c2c-panel-state-v1'

interface Persisted {
  collectionsOn: boolean
  accounts: BankAccount[]
  orders: CollectionOrder[]
  balance: number
  freeze: number
}

function load(): Persisted | null {
  try {
    const raw = localStorage.getItem(LS_KEY)
    return raw ? (JSON.parse(raw) as Persisted) : null
  } catch {
    return null
  }
}

export function StoreProvider({ children }: { children: ReactNode }) {
  const saved = load()
  const [collectionsOn, setCollectionsOn] = useState(saved?.collectionsOn ?? true)
  const [accounts, setAccounts] = useState<BankAccount[]>(saved?.accounts ?? INITIAL_ACCOUNTS)
  const [orders, setOrders] = useState<CollectionOrder[]>(saved?.orders ?? INITIAL_ORDERS)
  const [balance, setBalance] = useState(saved?.balance ?? BALANCE.balance)
  const [freeze, setFreeze] = useState(saved?.freeze ?? BALANCE.freeze)
  const [toast, setToast] = useState<string | null>(null)

  useEffect(() => {
    const data: Persisted = { collectionsOn, accounts, orders, balance, freeze }
    localStorage.setItem(LS_KEY, JSON.stringify(data))
  }, [collectionsOn, accounts, orders, balance, freeze])

  function showToast(m: string) {
    setToast(m)
    window.setTimeout(() => setToast(null), 1800)
  }

  const value = useMemo<Store>(
    () => ({
      balance,
      freeze,
      collectionsOn,
      setCollectionsOn,
      accounts,
      toggleAccount: (id) =>
        setAccounts((prev) => prev.map((a) => (a.id === id ? { ...a, on: !a.on } : a))),
      deleteAccount: (id) => setAccounts((prev) => prev.filter((a) => a.id !== id)),
      addAccount: (a) =>
        setAccounts((prev) => [...prev, { ...a, id: 'a' + Date.now() }]),
      orders,
      resolveOrder: (id, status) => {
        setOrders((prev) => prev.filter((o) => o.id !== id))
        const order = orders.find((o) => o.id === id)
        if (order && status === 'success') {
          setBalance((b) => b + order.reward)
          setFreeze((f) => Math.max(0, f - order.amount))
        }
        showToast(status === 'success' ? 'done' : 'Order updated')
      },
      toast,
      showToast,
    }),
    [balance, freeze, collectionsOn, accounts, orders, toast],
  )

  return <StoreCtx.Provider value={value}>{children}</StoreCtx.Provider>
}

export function useStore() {
  const ctx = useContext(StoreCtx)
  if (!ctx) throw new Error('useStore must be used within StoreProvider')
  return ctx
}
