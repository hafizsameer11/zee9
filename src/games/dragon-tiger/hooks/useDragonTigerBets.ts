import { useCallback, useMemo, useRef, useState } from 'react'
import {
  CHIP_VALUES,
  type BetSelection,
  type ChipValue,
  type DragonTigerBet,
} from '../constants/gameConfig'
import {
  aggregateByZone,
  lockedBetSide,
  potentialWin,
  totalStake,
} from '../utils/payoutCalculator'
import { placeServerBet } from '../services/dragonTigerGameService'
import { getAccess } from '../../../api/client'
import type { DragonTigerSocketBet } from '../../lib/dragonTigerSocket'

let betSeq = 0
function nextBetId() {
  betSeq += 1
  return `dtb-${Date.now()}-${betSeq}`
}

function nearestChip(amount: number): ChipValue {
  let best: ChipValue = CHIP_VALUES[0]!
  for (const v of CHIP_VALUES) {
    if (Math.abs(v - amount) < Math.abs(best - amount)) best = v
  }
  return best
}

export function mapServerBets(rows: DragonTigerSocketBet[], roundId: string): DragonTigerBet[] {
  return rows
    .filter((b) => b.state === 'ACTIVE' || b.state === 'CASHED_OUT' || b.state === 'BUST')
    .map((b) => ({
      id: b.id,
      roundId,
      selection: b.side,
      chipValue: nearestChip(b.amount),
      amount: b.amount,
      createdAt: Date.now(),
    }))
}

type Opts = {
  canAfford: (n: number) => boolean
  debit: (n: number) => boolean
  credit: (n: number) => void
  bettingOpen: boolean
  roundId: string
  onInsufficient?: () => void
  onPlace?: () => void
  onRemove?: () => void
  onClosed?: () => void
  onWalletChange?: () => void
  onError?: (msg: string) => void
}

function betFailureMessage(e: unknown, fallback: string): string {
  if (e instanceof Error) return e.message
  if (typeof (e as { message?: string })?.message === 'string') return (e as { message: string }).message
  return fallback
}

function handleBetFailure(
  e: unknown,
  fallback: string,
  handlers: Pick<Opts, 'onInsufficient' | 'onError' | 'onClosed'>,
) {
  const msg = betFailureMessage(e, fallback)
  if (/insufficient/i.test(msg)) {
    handlers.onInsufficient?.()
    return
  }
  if (/betting closed/i.test(msg)) {
    handlers.onClosed?.()
    return
  }
  handlers.onError?.(msg)
}

export function useDragonTigerBets({
  canAfford,
  debit,
  credit,
  bettingOpen,
  roundId,
  onInsufficient,
  onPlace,
  onRemove,
  onClosed,
  onWalletChange,
  onError,
}: Opts) {
  const [bets, setBets] = useState<DragonTigerBet[]>([])
  const [selectedChip, setSelectedChip] = useState<ChipValue>(10)
  const [hasLastRound, setHasLastRound] = useState(false)
  const [busy, setBusy] = useState(false)
  const lastRoundBetsRef = useRef<DragonTigerBet[]>([])
  const live = !!getAccess()

  const stake = useMemo(() => totalStake(bets), [bets])
  const potential = useMemo(() => potentialWin(bets), [bets])
  const byZone = useMemo(() => aggregateByZone(bets), [bets])
  const lockedSide = useMemo(() => lockedBetSide(bets), [bets])

  const syncFromServer = useCallback((rows: DragonTigerSocketBet[], phase: string, rid: string) => {
    if (phase === 'betting') {
      setBets(mapServerBets(rows.filter((b) => b.state === 'ACTIVE'), rid))
      return
    }
    setBets(mapServerBets(rows, rid))
  }, [])

  const placeBet = useCallback(
    (selection: BetSelection, chipValue?: ChipValue) => {
      if (!bettingOpen) {
        onClosed?.()
        return false
      }
      const amount = chipValue ?? selectedChip
      if (!amount || amount <= 0 || !CHIP_VALUES.includes(amount as ChipValue)) return false
      const activeSide = lockedBetSide(bets)
      if (activeSide && activeSide !== selection) {
        onError?.('Choose one side per round — Dragon, Tie, or Tiger')
        return false
      }
      if (!canAfford(amount)) {
        onInsufficient?.()
        return false
      }

      if (live) {
        if (busy) return false
        setBusy(true)
        void placeServerBet(selection, amount)
          .then(() => {
            // Bets come from server state sync — local append would double amounts.
            onPlace?.()
            onWalletChange?.()
          })
          .catch((e: unknown) => {
            handleBetFailure(e, 'Bet failed', { onInsufficient, onError, onClosed })
          })
          .finally(() => setBusy(false))
        return true
      }

      if (!debit(amount)) {
        onInsufficient?.()
        return false
      }
      setBets((prev) => [
        ...prev,
        {
          id: nextBetId(),
          roundId,
          selection,
          chipValue: amount,
          amount,
          createdAt: Date.now(),
        },
      ])
      onPlace?.()
      return true
    },
    [
      bettingOpen,
      selectedChip,
      bets,
      canAfford,
      debit,
      roundId,
      onInsufficient,
      onPlace,
      onClosed,
      live,
      busy,
      onWalletChange,
      onError,
    ],
  )

  const undo = useCallback(() => {
    if (!bettingOpen || live) return false
    setBets((prev) => {
      if (prev.length === 0) return prev
      const last = prev[prev.length - 1]!
      credit(last.amount)
      onRemove?.()
      return prev.slice(0, -1)
    })
    return true
  }, [bettingOpen, credit, onRemove, live])

  const clear = useCallback(() => {
    if (!bettingOpen || live) return false
    setBets((prev) => {
      if (prev.length === 0) return prev
      credit(totalStake(prev))
      onRemove?.()
      return []
    })
    return true
  }, [bettingOpen, credit, onRemove, live])

  const doubleBets = useCallback(() => {
    if (!bettingOpen || bets.length === 0) return false
    const extra = totalStake(bets)
    if (!canAfford(extra)) {
      onInsufficient?.()
      return false
    }
    if (live) {
      // Place each side amount again on server
      if (busy) return false
      setBusy(true)
      void Promise.all(bets.map((b) => placeServerBet(b.selection, b.amount)))
        .then(() => {
          onPlace?.()
          onWalletChange?.()
        })
        .catch((e: unknown) => {
          handleBetFailure(e, 'Double failed', { onInsufficient, onError, onClosed })
        })
        .finally(() => setBusy(false))
      return true
    }
    if (!debit(extra)) {
      onInsufficient?.()
      return false
    }
    setBets((prev) => [
      ...prev,
      ...prev.map((b) => ({
        ...b,
        id: nextBetId(),
        createdAt: Date.now(),
      })),
    ])
    onPlace?.()
    return true
  }, [bettingOpen, bets, canAfford, debit, onInsufficient, onPlace, live, busy, onWalletChange, onError, onClosed])

  const snapshotForRound = useCallback(() => {
    lastRoundBetsRef.current = bets.map((b) => ({ ...b }))
    setHasLastRound(lastRoundBetsRef.current.length > 0)
    return lastRoundBetsRef.current
  }, [bets])

  const clearAfterRound = useCallback(() => {
    setBets([])
  }, [])

  const rebet = useCallback(() => {
    if (!bettingOpen) return false
    const prev = lastRoundBetsRef.current
    if (prev.length === 0) return false
    if (live) {
      if (busy) return false
      const need = totalStake(prev)
      if (!canAfford(need)) {
        onInsufficient?.()
        return false
      }
      setBusy(true)
      void Promise.all(prev.map((b) => placeServerBet(b.selection, b.amount)))
        .then(() => {
          onPlace?.()
          onWalletChange?.()
        })
        .catch((e: unknown) => {
          handleBetFailure(e, 'Rebet failed', { onInsufficient, onError, onClosed })
        })
        .finally(() => setBusy(false))
      return true
    }
    setBets((current) => {
      const currentStake = current.length ? totalStake(current) : 0
      const need = totalStake(prev)
      const net = Math.round((need - currentStake) * 100) / 100
      if (net > 0) {
        if (!canAfford(net) || !debit(net)) {
          onInsufficient?.()
          return current
        }
      } else if (net < 0) {
        credit(-net)
      }
      onPlace?.()
      return prev.map((b) => ({
        ...b,
        id: nextBetId(),
        roundId,
        createdAt: Date.now(),
      }))
    })
    return true
  }, [bettingOpen, canAfford, debit, credit, onInsufficient, onPlace, roundId, live, busy, onWalletChange, onError, onClosed])

  return {
    bets,
    selectedChip,
    setSelectedChip,
    stake,
    potential,
    byZone,
    lockedSide,
    placeBet,
    undo,
    clear,
    doubleBets,
    rebet,
    snapshotForRound,
    clearAfterRound,
    syncFromServer,
    lastRoundBetsRef,
    hasLastRound,
  }
}
