import { useCallback, useMemo, useRef, useState } from 'react'
import {
  CHIP_VALUES,
  type BetSelection,
  type BetType,
  type ChipValue,
  type RouletteBet,
} from '../constants/rouletteConfig'
import { placeRouletteBet, revokeRouletteBets } from '../services/rouletteGameService'
import { aggregateByCell, potentialWin, totalStake } from '../utils/payoutCalculator'
import type { RouletteSocketBet } from '../../lib/rouletteSocket'

function selectionFromBet(type: BetType, value: number | null): BetSelection {
  if (type === 'straight' || type === 'dozen' || type === 'column') return (value ?? 0) as BetSelection
  return type as BetSelection
}

function nearestChip(amount: number): ChipValue {
  let best: ChipValue = CHIP_VALUES[0]!
  for (const v of CHIP_VALUES) {
    if (Math.abs(v - amount) < Math.abs(best - amount)) best = v
  }
  return best
}

export function mapServerBets(rows: RouletteSocketBet[]): RouletteBet[] {
  return rows
    .filter((b) => b.state === 'ACTIVE' || b.state === 'CASHED_OUT' || b.state === 'BUST')
    .map((b) => ({
      id: b.id,
      type: b.type as BetType,
      selection: selectionFromBet(b.type as BetType, b.value),
      cellKey: b.cellKey,
      amount: b.amount,
      chipValue: nearestChip(b.amount),
      createdAt: Date.now(),
    }))
}

export type PlaceBetInput = {
  type: BetType
  selection: BetSelection
  cellKey: string
  chipValue: ChipValue
}

type UseRouletteBetsOpts = {
  bettingOpen: boolean
  canAfford: (amount: number) => boolean
  onInsufficient?: () => void
  onPlace?: () => void
  onRemove?: () => void
  onError?: (msg: string) => void
  /** Called after successful wallet-affecting API so parent can refresh(). */
  onWalletChange?: () => void
}

export function useRouletteBets({
  bettingOpen,
  canAfford,
  onInsufficient,
  onPlace,
  onRemove,
  onError,
  onWalletChange,
}: UseRouletteBetsOpts) {
  const [bets, setBets] = useState<RouletteBet[]>([])
  const [selectedChip, setSelectedChip] = useState<ChipValue>(100)
  const [hasLastRound, setHasLastRound] = useState(false)
  const [busy, setBusy] = useState(false)
  const lastRoundBetsRef = useRef<RouletteBet[]>([])
  const betsRef = useRef(bets)
  betsRef.current = bets

  const stake = useMemo(() => totalStake(bets), [bets])
  const potential = useMemo(() => potentialWin(bets), [bets])
  const byCell = useMemo(() => aggregateByCell(bets), [bets])

  const syncFromServer = useCallback((rows: RouletteSocketBet[], phase: string) => {
    if (phase === 'betting') {
      setBets(mapServerBets(rows.filter((b) => b.state === 'ACTIVE')))
      return
    }
    // Keep stacks visible through spin/reveal (includes settled wins/losses)
    setBets(mapServerBets(rows.filter((b) => b.state === 'ACTIVE' || b.state === 'CASHED_OUT' || b.state === 'BUST')))
  }, [])

  const valueFromInput = (input: PlaceBetInput): number | null => {
    if (input.type === 'straight' || input.type === 'dozen' || input.type === 'column') {
      return typeof input.selection === 'number' ? input.selection : null
    }
    return null
  }

  const placeBet = useCallback(
    async (input: PlaceBetInput) => {
      if (!bettingOpen || busy) return false
      const amount = input.chipValue
      if (!amount || amount <= 0 || !CHIP_VALUES.includes(amount)) return false
      if (!canAfford(amount)) {
        onInsufficient?.()
        return false
      }
      setBusy(true)
      try {
        const data = await placeRouletteBet({
          type: input.type,
          value: valueFromInput(input),
          cellKey: input.cellKey,
          amount,
        })
        const bet: RouletteBet = {
          id: data.betId,
          type: input.type,
          selection: input.selection,
          cellKey: data.cellKey || input.cellKey,
          amount: data.amount,
          chipValue: amount,
          createdAt: Date.now(),
        }
        setBets((prev) => [...prev, bet])
        onPlace?.()
        onWalletChange?.()
        return true
      } catch (e) {
        const msg = e instanceof Error ? e.message : 'Bet failed'
        if (/insufficient/i.test(msg)) onInsufficient?.()
        else onError?.(msg)
        return false
      } finally {
        setBusy(false)
      }
    },
    [bettingOpen, busy, canAfford, onInsufficient, onPlace, onError, onWalletChange],
  )

  const undo = useCallback(async () => {
    if (!bettingOpen || busy || betsRef.current.length === 0) return false
    setBusy(true)
    try {
      await revokeRouletteBets('last')
      setBets((prev) => prev.slice(0, -1))
      onRemove?.()
      onWalletChange?.()
      return true
    } catch (e) {
      onError?.(e instanceof Error ? e.message : 'Undo failed')
      return false
    } finally {
      setBusy(false)
    }
  }, [bettingOpen, busy, onRemove, onError, onWalletChange])

  const clear = useCallback(async () => {
    if (!bettingOpen || busy || betsRef.current.length === 0) return false
    setBusy(true)
    try {
      await revokeRouletteBets('all')
      setBets([])
      onRemove?.()
      onWalletChange?.()
      return true
    } catch (e) {
      onError?.(e instanceof Error ? e.message : 'Clear failed')
      return false
    } finally {
      setBusy(false)
    }
  }, [bettingOpen, busy, onRemove, onError, onWalletChange])

  const doubleBets = useCallback(async () => {
    if (!bettingOpen || busy) return false
    const current = betsRef.current
    if (current.length === 0) return false
    const extra = totalStake(current)
    if (!canAfford(extra)) {
      onInsufficient?.()
      return false
    }
    setBusy(true)
    try {
      for (const b of current) {
        await placeRouletteBet({
          type: b.type,
          value: typeof b.selection === 'number' ? b.selection : null,
          cellKey: b.cellKey,
          amount: b.amount,
        })
      }
      onPlace?.()
      onWalletChange?.()
      return true
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Double failed'
      if (/insufficient/i.test(msg)) onInsufficient?.()
      else onError?.(msg)
      return false
    } finally {
      setBusy(false)
    }
  }, [bettingOpen, busy, canAfford, onInsufficient, onPlace, onError, onWalletChange])

  const snapshotForSpin = useCallback(() => {
    const snap = betsRef.current.map((b) => ({ ...b }))
    lastRoundBetsRef.current = snap
    setHasLastRound(snap.length > 0)
    return snap
  }, [])

  const clearAfterRound = useCallback(() => {
    setBets([])
  }, [])

  const rebet = useCallback(async () => {
    if (!bettingOpen || busy) return false
    const prev = lastRoundBetsRef.current
    if (prev.length === 0) return false
    const need = totalStake(prev)
    if (!canAfford(need)) {
      onInsufficient?.()
      return false
    }
    setBusy(true)
    try {
      if (betsRef.current.length > 0) await revokeRouletteBets('all')
      for (const b of prev) {
        await placeRouletteBet({
          type: b.type,
          value: typeof b.selection === 'number' ? b.selection : null,
          cellKey: b.cellKey,
          amount: b.amount,
        })
      }
      onPlace?.()
      onWalletChange?.()
      return true
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Rebet failed'
      if (/insufficient/i.test(msg)) onInsufficient?.()
      else onError?.(msg)
      return false
    } finally {
      setBusy(false)
    }
  }, [bettingOpen, busy, canAfford, onInsufficient, onPlace, onError, onWalletChange])

  return {
    bets,
    selectedChip,
    setSelectedChip,
    stake,
    potential,
    byCell,
    placeBet,
    undo,
    clear,
    doubleBets,
    rebet,
    snapshotForSpin,
    clearAfterRound,
    syncFromServer,
    lastRoundBetsRef,
    hasLastRound,
    busy,
  }
}
