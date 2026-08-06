import { useCallback, useEffect } from 'react'
import { useWallet } from '../context/WalletContext'

/**
 * Hold credited wins out of the displayed balance until the win presentation finishes.
 * `canAfford` / debits still use the settled server balance — only the visible bar is masked.
 */
export function useWinPresentationHold(scopeId: string) {
  const { holdWin, releaseWinHold } = useWallet()

  const hold = useCallback(
    (amount: number) => {
      if (amount > 0) holdWin(scopeId, amount)
    },
    [holdWin, scopeId],
  )

  const release = useCallback(() => {
    releaseWinHold(scopeId)
  }, [releaseWinHold, scopeId])

  useEffect(() => () => releaseWinHold(scopeId), [releaseWinHold, scopeId])

  return { holdWin: hold, releaseWinHold: release }
}

/**
 * Reactive helper — keeps a hold while `active` is true and releases when it turns false.
 */
export function useSyncWinHold(scopeId: string, winAmount: number, active: boolean) {
  const { holdWin, releaseWinHold } = useWallet()

  useEffect(() => {
    if (active && winAmount > 0) {
      holdWin(scopeId, winAmount)
      return () => releaseWinHold(scopeId)
    }
    releaseWinHold(scopeId)
    return undefined
  }, [active, winAmount, holdWin, releaseWinHold, scopeId])
}
