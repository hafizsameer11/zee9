import { useCallback, useEffect, useRef, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { useWallet } from '../../context/WalletContext'
import {
  formatPeriod,
  generateWingoResult,
  wingoPayoutMultiplier,
  type WingoBetType,
} from '../engines/wingo'
import { DESIGN_H, DESIGN_W, useDesignScale } from '../hooks/useDesignScale'
import type { GameComponentProps } from '../types'
import WingoDesignUI from './WingoDesignUI'
import styles from './wingoGame.module.css'

const ROUND_MS = 30000
const BET_LOCK_MS = 5000

type PendingBet = { type: WingoBetType; value?: number; amount: number; id: number }

export default function WingoGame({ bet: defaultBet, onMessage }: GameComponentProps) {
  const navigate = useNavigate()
  const { id: gameId } = useParams<{ id: string }>()
  const viewportRef = useRef<HTMLDivElement>(null)
  const scale = useDesignScale(viewportRef)
  const { balance, debit, credit, canAfford } = useWallet()

  const [betAmount, setBetAmount] = useState(defaultBet)
  const [timeLeft, setTimeLeft] = useState(ROUND_MS)
  const [period, setPeriod] = useState(formatPeriod(Date.now()))
  const [result, setResult] = useState<ReturnType<typeof generateWingoResult> | null>(null)
  const [pending, setPending] = useState<PendingBet[]>([])
  const [selected, setSelected] = useState<{ type: WingoBetType; value?: number } | null>(null)
  const [history, setHistory] = useState<ReturnType<typeof generateWingoResult>[]>([])
  const roundStart = useRef(Date.now())
  const pendingRef = useRef<PendingBet[]>([])
  pendingRef.current = pending

  const title = gameId === 'wingo' ? 'WINGO' : 'WINGO LOTTERY'
  const canBet = timeLeft > BET_LOCK_MS

  const settleRound = useCallback(() => {
    const bets = pendingRef.current
    const res = generateWingoResult(period)
    setResult(res)
    setHistory((h) => [res, ...h].slice(0, 12))
    let totalWin = 0
    bets.forEach((b) => {
      const mult = wingoPayoutMultiplier(b, res)
      if (mult > 0) totalWin += b.amount * mult
    })
    if (totalWin > 0) {
      credit(Math.round(totalWin * 100) / 100)
      onMessage?.(`🎉 Won PKR ${Math.round(totalWin).toLocaleString()}!`)
    } else if (bets.length) {
      onMessage?.(`Result #${res.number} · ${res.color}`)
    } else {
      onMessage?.(null)
    }
    setPending([])
    setSelected(null)
    setPeriod(formatPeriod(Date.now()))
    roundStart.current = Date.now()
    setTimeLeft(ROUND_MS)
  }, [credit, onMessage, period])

  useEffect(() => {
    const id = setInterval(() => {
      const elapsed = Date.now() - roundStart.current
      const left = Math.max(0, ROUND_MS - elapsed)
      setTimeLeft(left)
      if (left <= 0) settleRound()
    }, 200)
    return () => clearInterval(id)
  }, [settleRound])

  const placeBet = () => {
    if (!canBet) {
      onMessage?.('Bets locked — wait for next round')
      return
    }
    if (!selected) {
      onMessage?.('Select a bet first')
      return
    }
    if (!canAfford(betAmount) || !debit(betAmount)) {
      onMessage?.('Insufficient balance')
      return
    }
    setPending((p) => [...p, { ...selected, amount: betAmount, id: Date.now() }])
    onMessage?.(null)
  }

  return (
    <WingoDesignUI
      viewportRef={viewportRef}
      scale={scale}
      designW={DESIGN_W}
      designH={DESIGN_H}
      rootClassName={styles.root}
      canvasClassName={styles.canvas}
      title={title}
      balance={balance}
      betAmount={betAmount}
      onBetAmount={setBetAmount}
      period={period}
      timeLeft={timeLeft}
      roundMs={ROUND_MS}
      result={result}
      history={history}
      pending={pending}
      selected={selected}
      onSelect={setSelected}
      onPlaceBet={placeBet}
      onHome={() => navigate('/home')}
      onMines={() => navigate('/play/mines')}
      onAviator={() => navigate('/play/aviator')}
      onTeenPatti={() => navigate('/play/teen-patti')}
      canBet={canBet}
    />
  )
}
