import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useWallet } from '../../context/WalletContext'
import type { WingoBetType } from '../engines/wingo'
import { connectWingoSocket } from '../lib/wingoSocket'
import type { GameComponentProps } from '../types'
import { roundLossMessage, roundWinMessage } from '../lib/roundResult'
import WingoDesignUI, {
  type BetCounters,
  type MyBetRecord,
  type WingoHistoryRow,
  type WingoMode,
  type WingoServerResult,
} from './WingoDesignUI'

const CHIPS = [10, 50, 100, 500, 1000, 2000, 5000, 10000]

/** Betting closes this long before the countdown hits zero (matches server). */
const LOCK_MS = 5_000

type ServerBet = {
  id: string
  type: WingoBetType
  value: number | null
  amount: number
  payout: number
  state: string
}

type PendingBet = {
  localId: string
  betId?: string
  period: string
  type: WingoBetType
  value: number | null
  amount: number
}

function betKey(type: WingoBetType, value?: number | null) {
  return type === 'number' ? `n-${value}` : type
}

export default function WingoGame({ onMessage }: GameComponentProps) {
  const navigate = useNavigate()
  const { balance, refresh, canAfford } = useWallet()
  const revokeBusy = useRef(false)
  const socketRef = useRef<ReturnType<typeof connectWingoSocket> | null>(null)
  const applyStateRef = useRef<(s: any) => void>(() => {})
  const lastRevealPeriod = useRef<string | null>(null)
  const lastSignature = useRef('')

  const [mode, setMode] = useState<WingoMode>('30s')
  const [betAmount, setBetAmount] = useState(10)
  const [period, setPeriod] = useState('—')
  const [phase, setPhase] = useState<'betting' | 'locked' | 'reveal'>('betting')
  const [deadline, setDeadline] = useState(() => Date.now() + 30_000)
  const [canBet, setCanBet] = useState(true)
  const [myBets, setMyBets] = useState<ServerBet[]>([])
  const [pending, setPending] = useState<PendingBet[]>([])
  const [pendingSpend, setPendingSpend] = useState(0)
  const [history, setHistory] = useState<WingoHistoryRow[]>([])
  const [myHistory, setMyHistory] = useState<MyBetRecord[]>([])
  const [result, setResult] = useState<WingoServerResult | null>(null)
  const [showHelp, setShowHelp] = useState(false)

  // Read inside callbacks that must not be re-created on every state push.
  const modeRef = useRef(mode)
  const periodRef = useRef(period)
  const betAmountRef = useRef(betAmount)
  const canBetRef = useRef(canBet)
  const deadlineRef = useRef(deadline)
  const pendingSpendRef = useRef(0)
  const betQueue = useRef<Promise<void>>(Promise.resolve())
  const localSeq = useRef(0)
  const walletTimer = useRef<number | null>(null)
  modeRef.current = mode
  periodRef.current = period
  betAmountRef.current = betAmount
  canBetRef.current = canBet
  deadlineRef.current = deadline

  const toast = useCallback(
    (text: string, ms = 1800) => {
      onMessage?.(text)
      window.setTimeout(() => onMessage?.(null), ms)
    },
    [onMessage],
  )

  /** Bets are debited server-side; pull the real balance once the burst ends. */
  const scheduleWalletRefresh = useCallback(() => {
    if (walletTimer.current) window.clearTimeout(walletTimer.current)
    walletTimer.current = window.setTimeout(() => {
      walletTimer.current = null
      const snapshot = pendingSpendRef.current
      void refresh().finally(() => {
        pendingSpendRef.current = Math.max(0, pendingSpendRef.current - snapshot)
        setPendingSpend(pendingSpendRef.current)
      })
    }, 400)
  }, [refresh])

  const counters = useMemo<BetCounters>(() => {
    const map: BetCounters = {}
    const add = (key: string, amount: number) => {
      if (!map[key]) map[key] = { count: 0, amount: 0 }
      map[key].count += 1
      map[key].amount += amount
    }
    const confirmed = new Set<string>()
    for (const b of myBets) {
      confirmed.add(b.id)
      if (b.state !== 'ACTIVE') continue
      add(betKey(b.type, b.value), b.amount)
    }
    for (const p of pending) {
      if (p.betId && confirmed.has(p.betId)) continue
      add(betKey(p.type, p.value), p.amount)
    }
    return map
  }, [myBets, pending])

  const applyState = useCallback(
    (state: any) => {
      if (!state) return

      const nextPeriod = state.period ?? '—'
      const serverBets: ServerBet[] = Array.isArray(state.myBets) ? state.myBets : []

      // Drop optimistic bets the server has confirmed, or that belong to a
      // round that already rolled over.
      const confirmed = new Set(serverBets.map((b) => b.id))
      setPending((list) => {
        const next = list.filter(
          (p) => p.period === nextPeriod && !(p.betId && confirmed.has(p.betId)),
        )
        return next.length === list.length ? list : next
      })

      // Only the countdown changes between most pushes — skip the re-render
      // unless something the UI actually draws is different.
      const signature = [
        nextPeriod,
        state.phase,
        state.canBet ? 1 : 0,
        serverBets.map((b) => `${b.id}:${b.state}:${b.amount}`).join(','),
        Array.isArray(state.history) ? state.history.length : 0,
        Array.isArray(state.history) ? (state.history[0]?.period ?? '') : '',
      ].join('|')

      const drift = Math.abs(deadlineRef.current - (Date.now() + (state.msLeft ?? 0)))
      if (typeof state.msLeft === 'number' && drift > 400) {
        setDeadline(Date.now() + state.msLeft)
      }

      if (signature !== lastSignature.current) {
        lastSignature.current = signature
        setPeriod(nextPeriod)
        setPhase(state.phase ?? 'betting')
        setCanBet(Boolean(state.canBet))
        setMyBets(serverBets)
        if (Array.isArray(state.history)) setHistory(state.history)
      }

      if (Array.isArray(state.myHistory)) {
        setMyHistory(
          state.myHistory.map((b: any) => ({
            id: b.id,
            period: b.period,
            type: b.type,
            value: b.value,
            amount: b.amount,
            payout: b.payout,
            state: b.state,
            resultNumber: b.resultNumber,
          })),
        )
      }

      if (state.phase === 'reveal' && state.result) {
        setResult(state.result)
        if (lastRevealPeriod.current !== state.period) {
          lastRevealPeriod.current = state.period
          const wins = serverBets.filter((b) => b.state === 'CASHED_OUT')
          const totalWin = wins.reduce((s, b) => s + (b.payout || 0), 0)
          if (totalWin > 0) {
            toast(roundWinMessage(totalWin), 2200)
          } else if (serverBets.some((b) => b.state === 'BUST' || b.state === 'CASHED_OUT')) {
            const staked = serverBets
              .filter((b) => b.state === 'BUST' || b.state === 'CASHED_OUT')
              .reduce((s, b) => s + (Number(b.amount) || 0), 0)
            toast(staked > 0 ? roundLossMessage(staked) : `Result #${state.result.number}`)
          }
          void refresh()
        }
      } else if (state.phase !== 'reveal') {
        setResult(null)
      }
    },
    [refresh, toast],
  )
  applyStateRef.current = applyState

  useEffect(() => {
    const sock = connectWingoSocket(mode, {
      onState: (s) => applyStateRef.current(s),
      onError: (message) => onMessage?.(message),
    })
    socketRef.current = sock
    return () => {
      sock.close()
      socketRef.current = null
    }
    // Reconnect when mode changes for a clean stream
  }, [mode, onMessage])

  useEffect(
    () => () => {
      if (walletTimer.current) window.clearTimeout(walletTimer.current)
    },
    [],
  )

  const onModeChange = (next: WingoMode) => {
    if (next === mode) return
    setMode(next)
    setResult(null)
    setPending([])
    setMyBets([])
    lastSignature.current = ''
    lastRevealPeriod.current = null
  }

  /** Optimistic: the chip lands immediately, the server call runs behind it. */
  const placeBet = useCallback(
    (type: WingoBetType, value?: number) => {
      if (!canBetRef.current || deadlineRef.current - Date.now() <= LOCK_MS) {
        toast('Betting closed — wait for the next round', 1400)
        return
      }
      const amount = betAmountRef.current
      if (!canAfford(amount + pendingSpendRef.current)) {
        toast('Insufficient balance')
        return
      }

      const localId = `p${++localSeq.current}`
      const betPeriod = periodRef.current
      const betMode = modeRef.current
      pendingSpendRef.current += amount
      setPendingSpend(pendingSpendRef.current)
      setPending((list) => [
        ...list,
        { localId, period: betPeriod, type, value: type === 'number' ? (value ?? null) : null, amount },
      ])
      onMessage?.(null)

      betQueue.current = betQueue.current.then(async () => {
        try {
          const sock = socketRef.current
          if (!sock) throw new Error('Not connected')
          const res = await sock.request<{ betId: string }>('bet', {
            mode: betMode,
            type,
            amount,
            value: type === 'number' ? value : null,
          })
          setPending((list) =>
            list.map((p) => (p.localId === localId ? { ...p, betId: res?.betId } : p)),
          )
        } catch (e: any) {
          setPending((list) => list.filter((p) => p.localId !== localId))
          pendingSpendRef.current = Math.max(0, pendingSpendRef.current - amount)
          setPendingSpend(pendingSpendRef.current)
          toast(e?.message || 'Bet failed', 2200)
        }
        scheduleWalletRefresh()
      })
    },
    [canAfford, onMessage, scheduleWalletRefresh, toast],
  )

  const revoke = async () => {
    if (revokeBusy.current || !canBet) return
    if (!myBets.some((b) => b.state === 'ACTIVE') && !pending.length) return
    revokeBusy.current = true
    try {
      await betQueue.current
      const sock = socketRef.current
      if (!sock) throw new Error('Not connected')
      const res = await sock.request<{ refunded: number }>('revoke', { mode })
      setPending([])
      setMyBets([])
      lastSignature.current = ''
      toast(`Revoked — refunded Rs ${Math.round(res.refunded).toLocaleString()}`)
      scheduleWalletRefresh()
      socketRef.current?.refresh()
    } catch (e: any) {
      toast(e?.message || 'Revoke failed', 2200)
    } finally {
      revokeBusy.current = false
    }
  }

  const displayBalance = Math.max(0, balance - pendingSpend)
  const hasBets = pending.length > 0 || myBets.some((b) => b.state === 'ACTIVE')

  return (
    <WingoDesignUI
      balance={displayBalance}
      betAmount={betAmount}
      chips={CHIPS}
      mode={mode}
      period={period}
      phase={phase}
      deadline={deadline}
      lockMs={LOCK_MS}
      canBet={canBet}
      hasBets={hasBets}
      counters={counters}
      history={history}
      myHistory={myHistory}
      result={result}
      showHelp={showHelp}
      onHome={() => navigate('/')}
      onHelp={() => setShowHelp((v) => !v)}
      onCloseHelp={() => setShowHelp(false)}
      onModeChange={onModeChange}
      onChipSelect={setBetAmount}
      onBet={placeBet}
      onRevoke={() => void revoke()}
      onRefreshBalance={() => void refresh()}
    />
  )
}
