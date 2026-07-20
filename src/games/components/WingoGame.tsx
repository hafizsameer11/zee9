import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useWallet } from '../../context/WalletContext'
import { sound } from '../../lib/sound'
import {
  formatPeriod,
  generateWingoResult,
  wingoPayoutMultiplier,
  type WingoBetType,
} from '../engines/wingo'
import { useDesignScale } from '../hooks/useDesignScale'
import type { GameComponentProps } from '../types'
import WingoDesignUI, { type BetCounters, type MyBetRecord, type WingoMode } from './WingoDesignUI'
import styles from './wingoGame.module.css'
import './wingo.tw.css'

const BET_LOCK_MS = 5000

const MODE_MS: Record<WingoMode, number> = {
  '30s': 30000,
  '1min': 60000,
  '3min': 180000,
  '5min': 300000,
}

type PendingBet = { type: WingoBetType; value?: number; amount: number; id: number }

function betKey(type: WingoBetType, value?: number) {
  return type === 'number' ? `n-${value}` : type
}

function seedHistory(count: number): ReturnType<typeof generateWingoResult>[] {
  const items: ReturnType<typeof generateWingoResult>[] = []
  let ts = Date.now() - count * 30000
  for (let i = 0; i < count; i++) {
    const period = formatPeriod(ts)
    items.push(generateWingoResult(period))
    ts += 30000
  }
  return items.reverse()
}

export default function WingoGame({ onMessage }: GameComponentProps) {
  const navigate = useNavigate()
  const viewportRef = useRef<HTMLDivElement>(null)
  const layout = useDesignScale(viewportRef)
  const { balance, debit, credit, canAfford, setBalance } = useWallet()

  const [betAmount, setBetAmount] = useState(10)
  const [mode, setMode] = useState<WingoMode>('30s')
  const [roundMs, setRoundMs] = useState(MODE_MS['30s'])
  const [timeLeft, setTimeLeft] = useState(MODE_MS['30s'])
  const [period, setPeriod] = useState(formatPeriod(Date.now()))
  const [pending, setPending] = useState<PendingBet[]>([])
  const [history, setHistory] = useState(() => seedHistory(30))
  const [myHistory, setMyHistory] = useState<MyBetRecord[]>([])
  const [resultReveal, setResultReveal] = useState<ReturnType<typeof generateWingoResult> | null>(null)
  const [lastBetKey, setLastBetKey] = useState<string | null>(null)
  const roundStart = useRef(Date.now())
  const pendingRef = useRef<PendingBet[]>([])
  pendingRef.current = pending

  const canBet = timeLeft > BET_LOCK_MS

  const counters = useMemo<BetCounters>(() => {
    const map: BetCounters = {}
    pending.forEach((b) => {
      const key = betKey(b.type, b.value)
      if (!map[key]) map[key] = { count: 0, amount: 0 }
      map[key].count += 1
      map[key].amount += b.amount
    })
    return map
  }, [pending])

  const settleRound = useCallback(() => {
    const bets = pendingRef.current
    const res = generateWingoResult(period)
    setHistory((h) => [res, ...h].slice(0, 50))
    setResultReveal(res)
    window.setTimeout(() => setResultReveal(null), 2800)

    let totalWin = 0
    bets.forEach((b) => {
      const mult = wingoPayoutMultiplier(b, res)
      if (mult > 0) totalWin += b.amount * mult
    })
    const roundedWin = Math.round(totalWin * 100) / 100

    if (bets.length > 0) {
      setMyHistory((h) => [
        { id: Date.now(), period, bets: [...bets], result: res, winAmount: roundedWin },
        ...h,
      ].slice(0, 30))
    }

    if (roundedWin > 0) {
      credit(roundedWin)
      sound.play('win')
      onMessage?.(`Won Rs ${Math.round(roundedWin).toLocaleString()}!`)
    } else if (bets.length) {
      sound.play('lose', { volume: 0.55 })
      onMessage?.(`Result #${res.number}`)
    } else {
      onMessage?.(null)
    }

    setPending([])
    setPeriod(formatPeriod(Date.now()))
    roundStart.current = Date.now()
    setTimeLeft(roundMs)
  }, [credit, onMessage, period, roundMs])

  useEffect(() => {
    const id = setInterval(() => {
      const elapsed = Date.now() - roundStart.current
      const left = Math.max(0, roundMs - elapsed)
      setTimeLeft(left)
      if (left <= 0) settleRound()
    }, 200)
    return () => clearInterval(id)
  }, [settleRound, roundMs])

  const handleModeChange = (next: WingoMode) => {
    if (next === mode) return
    setMode(next)
    const ms = MODE_MS[next]
    setRoundMs(ms)
    roundStart.current = Date.now()
    setTimeLeft(ms)
    setPending([])
    setPeriod(formatPeriod(Date.now()))
    onMessage?.(null)
  }

  const placeBet = (type: WingoBetType, value?: number) => {
    if (!canBet) {
      sound.play('error', { volume: 0.4 })
      onMessage?.('Bets locked — wait for next round')
      return
    }
    if (!canAfford(betAmount) || !debit(betAmount)) {
      sound.play('error')
      onMessage?.('Insufficient balance')
      return
    }
    sound.play('chip')
    setPending((p) => [...p, { type, value, amount: betAmount, id: Date.now() }])
    setLastBetKey(betKey(type, value))
    onMessage?.(null)
  }

  const revokeLast = () => {
    if (!canBet || pending.length === 0) return
    const last = pending[pending.length - 1]
    credit(last.amount)
    setPending((p) => p.slice(0, -1))
    onMessage?.(null)
  }

  return (
    <WingoDesignUI
      viewportRef={viewportRef}
      layout={layout}
      rootClassName={styles.root}
      canvasClassName={styles.canvas}
      balance={balance}
      betAmount={betAmount}
      onBetAmount={setBetAmount}
      onRefreshBalance={() => setBalance(balance)}
      period={period}
      timeLeft={timeLeft}
      roundMs={roundMs}
      resultReveal={resultReveal}
      lastBetKey={lastBetKey}
      mode={mode}
      onModeChange={handleModeChange}
      history={history}
      myHistory={myHistory}
      pending={pending}
      counters={counters}
      onBet={placeBet}
      onRevoke={revokeLast}
      canBet={canBet}
      onHome={() => navigate('/home')}
    />
  )
}
