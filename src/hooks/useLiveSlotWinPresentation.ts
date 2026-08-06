import { useCallback } from 'react'
import { useWallet } from '../context/WalletContext'
import { useWinPresentationHold } from './useWinPresentationHold'

/**
 * Standard live-slot win presentation: sync wallet, mask credited win during animation, reveal after.
 */
export function useLiveSlotWinPresentation(scopeId: string) {
  const { refresh } = useWallet()
  const { holdWin, releaseWinHold } = useWinPresentationHold(scopeId)

  const beginLiveWin = useCallback(
    async (serverWin: number) => {
      await refresh()
      if (serverWin > 0) holdWin(serverWin)
    },
    [holdWin, refresh],
  )

  const endLiveWin = useCallback(async () => {
    releaseWinHold()
    await refresh()
  }, [refresh, releaseWinHold])

  return { beginLiveWin, endLiveWin, holdWin, releaseWinHold, refresh }
}
