import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react'
import { api, getAccess } from '../api/client'
import { usePlayerAuth } from '../api/auth'
import { usePlayerWalletRealtime } from '../api/walletRealtime'

type WalletContextValue = {
  balance: number
  bonus: number
  refresh: () => Promise<void>
  debit: (amount: number) => boolean
  credit: (amount: number) => void
  canAfford: (amount: number) => boolean
  setBalance: (amount: number) => void
}

const WalletContext = createContext<WalletContextValue | null>(null)

export function WalletProvider({ children }: { children: ReactNode }) {
  const { player } = usePlayerAuth()
  const [balance, setBalanceState] = useState(0)
  const [bonus, setBonus] = useState(0)

  const refresh = useCallback(async () => {
    if (!getAccess()) return
    try {
      const w = await api.get('/me/wallet')
      setBalanceState(Number(w.MAIN ?? 0) / 100)
      setBonus(Number(w.BONUS ?? 0) / 100)
    } catch {
      /* ignore */
    }
  }, [])

  // Re-sync whenever the signed-in player changes (login/logout/refresh).
  useEffect(() => {
    if (player) refresh()
    else {
      setBalanceState(0)
      setBonus(0)
    }
  }, [player, refresh])

  // Live balance when deposit is approved / bets settle (no page refresh needed)
  usePlayerWalletRealtime(!!player, (ev) => {
    setBalanceState(Number(ev.MAIN ?? 0) / 100)
    setBonus(Number(ev.BONUS ?? 0) / 100)
  })

  // Fallback: refresh on focus / slower poll so balance never stays stale if WS drops
  useEffect(() => {
    if (!player) return
    const onFocus = () => {
      void refresh()
    }
    const onVisibility = () => {
      if (document.visibilityState === 'visible') void refresh()
    }
    window.addEventListener('focus', onFocus)
    document.addEventListener('visibilitychange', onVisibility)
    const t = window.setInterval(() => void refresh(), 60000)
    return () => {
      window.removeEventListener('focus', onFocus)
      document.removeEventListener('visibilitychange', onVisibility)
      window.clearInterval(t)
    }
  }, [player, refresh])

  const canAfford = useCallback((amount: number) => amount > 0 && balance >= amount, [balance])

  // Local optimistic helpers (real settlement happens server-side; call refresh() after).
  const debit = useCallback(
    (amount: number) => {
      if (!canAfford(amount)) return false
      setBalanceState((b) => Math.round((b - amount) * 100) / 100)
      return true
    },
    [canAfford],
  )
  const credit = useCallback((amount: number) => {
    if (amount <= 0) return
    setBalanceState((b) => Math.round((b + amount) * 100) / 100)
  }, [])
  const setBalance = useCallback((amount: number) => setBalanceState(Math.max(0, Math.round(amount * 100) / 100)), [])

  const value = useMemo(
    () => ({ balance, bonus, refresh, debit, credit, canAfford, setBalance }),
    [balance, bonus, refresh, debit, credit, canAfford, setBalance],
  )

  return <WalletContext.Provider value={value}>{children}</WalletContext.Provider>
}

export function useWallet() {
  const ctx = useContext(WalletContext)
  if (!ctx) throw new Error('useWallet must be used within WalletProvider')
  return ctx
}
