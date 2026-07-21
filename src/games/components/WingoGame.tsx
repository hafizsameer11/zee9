import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { api } from '../../api/client'
import { useWallet } from '../../context/WalletContext'
import type { WingoBetType } from '../engines/wingo'
import { connectWingoSocket } from '../lib/wingoSocket'
import type { GameComponentProps } from '../types'
import WingoDesignUI, {
  type BetCounters,
  type MyBetRecord,
  type WingoHistoryRow,
  type WingoMode,
  type WingoServerResult,
} from './WingoDesignUI'

const CHIPS = [1, 10, 100, 500, 1000]

type ServerBet = {
  id: string
  type: WingoBetType
  value: number | null
  amount: number
  payout: number
  state: string
}

function betKey(type: WingoBetType, value?: number | null) {
  return type === 'number' ? `n-${value}` : type
}

export default function WingoGame({ onMessage }: GameComponentProps) {
  const navigate = useNavigate()
  const { balance, refresh, canAfford } = useWallet()
  const busyRef = useRef(false)
  const socketRef = useRef<ReturnType<typeof connectWingoSocket> | null>(null)
  const applyStateRef = useRef<(s: any) => void>(() => {})
  const lastRevealPeriod = useRef<string | null>(null)

  const [mode, setMode] = useState<WingoMode>('30s')
  const [betAmount, setBetAmount] = useState(10)
  const [period, setPeriod] = useState('—')
  const [phase, setPhase] = useState<'betting' | 'locked' | 'reveal'>('betting')
  const [msLeft, setMsLeft] = useState(30000)
  const [canBet, setCanBet] = useState(true)
  const [myBets, setMyBets] = useState<ServerBet[]>([])
  const [history, setHistory] = useState<WingoHistoryRow[]>([])
  const [myHistory, setMyHistory] = useState<MyBetRecord[]>([])
  const [result, setResult] = useState<WingoServerResult | null>(null)
  const [showHelp, setShowHelp] = useState(false)

  const counters = useMemo<BetCounters>(() => {
    const map: BetCounters = {}
    for (const b of myBets) {
      if (b.state !== 'ACTIVE') continue
      const key = betKey(b.type, b.value)
      if (!map[key]) map[key] = { count: 0, amount: 0 }
      map[key].count += 1
      map[key].amount += b.amount
    }
    return map
  }, [myBets])

  const applyState = useCallback(
    (state: any) => {
      if (!state) return
      setPeriod(state.period ?? '—')
      setPhase(state.phase ?? 'betting')
      setMsLeft(typeof state.msLeft === 'number' ? state.msLeft : 0)
      setCanBet(Boolean(state.canBet))
      setMyBets(Array.isArray(state.myBets) ? state.myBets : [])
      if (Array.isArray(state.history)) setHistory(state.history)
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
          const wins = (state.myBets || []).filter((b: ServerBet) => b.state === 'CASHED_OUT')
          const totalWin = wins.reduce((s: number, b: ServerBet) => s + (b.payout || 0), 0)
          if (totalWin > 0) {
            onMessage?.(`Won Rs ${Math.round(totalWin).toLocaleString()}!`)
            window.setTimeout(() => onMessage?.(null), 2200)
          } else if ((state.myBets || []).some((b: ServerBet) => b.state === 'BUST' || b.state === 'CASHED_OUT')) {
            onMessage?.(`Result #${state.result.number}`)
            window.setTimeout(() => onMessage?.(null), 1800)
          }
          void refresh()
        }
      } else if (state.phase !== 'reveal') {
        setResult(null)
      }
    },
    [onMessage, refresh],
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

  const onModeChange = (next: WingoMode) => {
    if (next === mode) return
    setMode(next)
    setResult(null)
    lastRevealPeriod.current = null
  }

  const placeBet = async (type: WingoBetType, value?: number) => {
    if (busyRef.current || !canBet) return
    if (!canAfford(betAmount)) {
      onMessage?.('Insufficient balance')
      return
    }
    busyRef.current = true
    try {
      await api.post('/games/wingo/bet', {
        mode,
        type,
        amount: betAmount,
        value: type === 'number' ? value : null,
      })
      void refresh()
      socketRef.current?.refresh()
      onMessage?.(null)
    } catch (e: any) {
      onMessage?.(e?.message || 'Bet failed')
    } finally {
      busyRef.current = false
    }
  }

  const revoke = async () => {
    if (busyRef.current || !canBet) return
    if (!myBets.some((b) => b.state === 'ACTIVE')) return
    busyRef.current = true
    try {
      const res = await api.post('/games/wingo/revoke', { mode })
      onMessage?.(`Revoked — refunded Rs ${Math.round(res.refunded).toLocaleString()}`)
      window.setTimeout(() => onMessage?.(null), 1800)
      void refresh()
      socketRef.current?.refresh()
    } catch (e: any) {
      onMessage?.(e?.message || 'Revoke failed')
    } finally {
      busyRef.current = false
    }
  }

  return (
    <WingoDesignUI
      balance={balance}
      betAmount={betAmount}
      chips={CHIPS}
      mode={mode}
      period={period}
      phase={phase}
      msLeft={msLeft}
      canBet={canBet}
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
