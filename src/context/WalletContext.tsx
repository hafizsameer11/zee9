import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from 'react'

const STORAGE_KEY = 'zee9-demo-balance'
const DEFAULT_BALANCE = 1250

type WalletContextValue = {
  balance: number
  debit: (amount: number) => boolean
  credit: (amount: number) => void
  canAfford: (amount: number) => boolean
  setBalance: (amount: number) => void
}

const WalletContext = createContext<WalletContextValue | null>(null)

function readStoredBalance(): number {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (raw == null) return DEFAULT_BALANCE
    const n = Number(raw)
    return Number.isFinite(n) ? n : DEFAULT_BALANCE
  } catch {
    return DEFAULT_BALANCE
  }
}

export function WalletProvider({ children }: { children: ReactNode }) {
  const [balance, setBalanceState] = useState(readStoredBalance)

  const persist = useCallback((next: number) => {
    setBalanceState(next)
    try {
      localStorage.setItem(STORAGE_KEY, String(next))
    } catch {
      /* ignore */
    }
  }, [])

  const canAfford = useCallback((amount: number) => amount > 0 && balance >= amount, [balance])

  const debit = useCallback(
    (amount: number) => {
      if (!canAfford(amount)) return false
      persist(Math.round((balance - amount) * 100) / 100)
      return true
    },
    [balance, canAfford, persist],
  )

  const credit = useCallback(
    (amount: number) => {
      if (amount <= 0) return
      persist(Math.round((balance + amount) * 100) / 100)
    },
    [balance, persist],
  )

  const setBalance = useCallback(
    (amount: number) => {
      persist(Math.max(0, Math.round(amount * 100) / 100))
    },
    [persist],
  )

  const value = useMemo(
    () => ({ balance, debit, credit, canAfford, setBalance }),
    [balance, debit, credit, canAfford, setBalance],
  )

  return <WalletContext.Provider value={value}>{children}</WalletContext.Provider>
}

export function useWallet() {
  const ctx = useContext(WalletContext)
  if (!ctx) throw new Error('useWallet must be used within WalletProvider')
  return ctx
}
