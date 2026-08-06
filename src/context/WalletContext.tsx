import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react'
import { api, getAccess } from '../api/client'
import { usePlayerAuth } from '../api/auth'
import { usePlayerWalletRealtime } from '../api/walletRealtime'

type WalletContextValue = {
  /** Balance shown in the UI (settled minus active win holds). */
  balance: number
  bonus: number
  refresh: () => Promise<void>
  debit: (amount: number) => boolean
  credit: (amount: number) => void
  canAfford: (amount: number) => boolean
  setBalance: (amount: number) => void
  /** Hide a credited win from the displayed balance until presentation ends. */
  holdWin: (scopeId: string, amount: number) => void
  releaseWinHold: (scopeId: string) => void
}

const WalletContext = createContext<WalletContextValue | null>(null)

function roundMoney(n: number) {
  return Math.round(n * 100) / 100
}

export function WalletProvider({ children }: { children: ReactNode }) {
  const { player } = usePlayerAuth()
  const [settledBalance, setSettledBalance] = useState(0)
  const [bonus, setBonus] = useState(0)
  const [winHolds, setWinHolds] = useState<Record<string, number>>({})

  const totalHold = useMemo(
    () => Object.values(winHolds).reduce((sum, amount) => sum + amount, 0),
    [winHolds],
  )

  const balance = useMemo(
    () => Math.max(0, roundMoney(settledBalance - totalHold)),
    [settledBalance, totalHold],
  )

  const refresh = useCallback(async () => {
    if (!getAccess()) return
    try {
      const w = await api.get('/me/wallet')
      setSettledBalance(Number(w.MAIN ?? 0) / 100)
      setBonus(Number(w.BONUS ?? 0) / 100)
    } catch {
      /* ignore */
    }
  }, [])

  // Re-sync whenever the signed-in player changes (login/logout/refresh).
  useEffect(() => {
    if (player) refresh()
    else {
      setSettledBalance(0)
      setBonus(0)
      setWinHolds({})
    }
  }, [player, refresh])

  // Live balance when deposit is approved / bets settle (no page refresh needed)
  usePlayerWalletRealtime(!!player, (ev) => {
    setSettledBalance(Number(ev.MAIN ?? 0) / 100)
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

  const canAfford = useCallback(
    (amount: number) => amount > 0 && settledBalance >= amount,
    [settledBalance],
  )

  // Local optimistic helpers (real settlement happens server-side; call refresh() after).
  const debit = useCallback((amount: number) => {
    if (amount <= 0) return false
    let ok = false
    setSettledBalance((b) => {
      if (b < amount) return b
      ok = true
      return roundMoney(b - amount)
    })
    return ok
  }, [])

  const credit = useCallback((amount: number) => {
    if (amount <= 0) return
    setSettledBalance((b) => roundMoney(b + amount))
  }, [])

  const setBalance = useCallback(
    (amount: number) => setSettledBalance(Math.max(0, roundMoney(amount))),
    [],
  )

  const holdWin = useCallback((scopeId: string, amount: number) => {
    if (!scopeId || amount <= 0) return
    setWinHolds((holds) => ({ ...holds, [scopeId]: amount }))
  }, [])

  const releaseWinHold = useCallback((scopeId: string) => {
    if (!scopeId) return
    setWinHolds((holds) => {
      if (!(scopeId in holds)) return holds
      const next = { ...holds }
      delete next[scopeId]
      return next
    })
  }, [])

  const value = useMemo(
    () => ({
      balance,
      bonus,
      refresh,
      debit,
      credit,
      canAfford,
      setBalance,
      holdWin,
      releaseWinHold,
    }),
    [balance, bonus, refresh, debit, credit, canAfford, setBalance, holdWin, releaseWinHold],
  )

  return <WalletContext.Provider value={value}>{children}</WalletContext.Provider>
}

export function useWallet() {
  const ctx = useContext(WalletContext)
  if (!ctx) throw new Error('useWallet must be used within WalletProvider')
  return ctx
}
