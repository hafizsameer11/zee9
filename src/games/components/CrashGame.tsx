import { useCallback, useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useWallet } from '../../context/WalletContext'
import { generateCrashPoint, multiplierAtElapsed } from '../engines/crash'
import { useDesignScale } from '../hooks/useDesignScale'
import type { GameComponentProps } from '../types'
import CrashDesignUI, { type CrashHistoryEntry, type CrashPhase } from './CrashDesignUI'
import styles from './crashGame.module.css'

const BET_STEPS = [10, 20, 50, 100, 200, 500, 1000, 2000, 5000]
const ROUND_WAIT_SEC = 5
const INTRO_STORAGE_KEY = 'zee9-crash-welcome-dismissed'
const AUTO_CASHOUT = 2

export default function CrashGame({ bet: defaultBet, onMessage }: GameComponentProps) {
  const navigate = useNavigate()
  const viewportRef = useRef<HTMLDivElement>(null)
  const layout = useDesignScale(viewportRef)
  const { balance, debit, credit, canAfford } = useWallet()

  const [phase, setPhase] = useState<CrashPhase>('waiting')
  const [mult, setMult] = useState(1)
  const [betAmount, setBetAmount] = useState(defaultBet || 20)
  const [countdown, setCountdown] = useState(ROUND_WAIT_SEC)
  const [history, setHistory] = useState<CrashHistoryEntry[]>([
    { roundId: 4518440, mult: 1.02 },
    { roundId: 4518441, mult: 2.65 },
    { roundId: 4518442, mult: 1.34 },
    { roundId: 4518443, mult: 10.82 },
    { roundId: 4518444, mult: 1.89 },
    { roundId: 4518445, mult: 3.21 },
  ])
  const [roundNo, setRoundNo] = useState(4518446)
  const [autoBet, setAutoBet] = useState(false)
  const [autoEscape, setAutoEscape] = useState(false)
  const [gameType, setGameType] = useState<'classic' | 'trenball'>('classic')
  const [betPlaced, setBetPlaced] = useState(false)
  const [showWelcome, setShowWelcome] = useState(() => !localStorage.getItem(INTRO_STORAGE_KEY))

  const crashPoint = useRef(1)
  const startTime = useRef(0)
  const raf = useRef(0)
  const activeBet = useRef(0)
  const cashed = useRef(false)
  const countdownRef = useRef(ROUND_WAIT_SEC)
  const phaseRef = useRef<CrashPhase>('waiting')
  const launchingRef = useRef(false)
  const flyingRoundRef = useRef(roundNo)

  useEffect(() => {
    phaseRef.current = phase
  }, [phase])

  const stopLoop = useCallback(() => {
    if (raf.current) cancelAnimationFrame(raf.current)
  }, [])

  const resetWaiting = useCallback(() => {
    setPhase('waiting')
    setMult(1)
    setBetPlaced(false)
    activeBet.current = 0
    cashed.current = false
    countdownRef.current = ROUND_WAIT_SEC
    setCountdown(ROUND_WAIT_SEC)
    launchingRef.current = false
  }, [])

  const endCrash = useCallback(() => {
    stopLoop()
    setPhase('crashed')
    setMult(crashPoint.current)
    setHistory((h) => [{ roundId: flyingRoundRef.current, mult: crashPoint.current }, ...h].slice(0, 12))
    if (!cashed.current) onMessage?.('💥 Crashed!')
    setTimeout(resetWaiting, 2200)
  }, [onMessage, resetWaiting, stopLoop])

  const doCashOut = useCallback(
    (atMult: number) => {
      if (cashed.current) return
      cashed.current = true
      stopLoop()
      const win = Math.round(activeBet.current * atMult * 100) / 100
      credit(win)
      setPhase('cashed')
      onMessage?.(`🎉 Cashed out PKR ${win.toLocaleString()}!`)
      setTimeout(resetWaiting, 2200)
    },
    [credit, onMessage, resetWaiting, stopLoop],
  )

  const tick = useCallback(() => {
    const elapsed = Date.now() - startTime.current
    const m = multiplierAtElapsed(elapsed)
    setMult(m)
    if (m >= crashPoint.current) {
      endCrash()
      return
    }
    if (autoEscape && AUTO_CASHOUT > 0 && m >= AUTO_CASHOUT && !cashed.current) {
      doCashOut(m)
      return
    }
    raf.current = requestAnimationFrame(tick)
  }, [autoEscape, doCashOut, endCrash])

  const startFlying = useCallback(() => {
    if (launchingRef.current) return
    launchingRef.current = true
    crashPoint.current = generateCrashPoint()
    startTime.current = Date.now()
    setMult(1)
    setPhase('flying')
    setRoundNo((n) => {
      flyingRoundRef.current = n
      return n + 1
    })
    onMessage?.(null)
    raf.current = requestAnimationFrame(tick)
  }, [onMessage, tick])

  const placeBet = useCallback(() => {
    if (phaseRef.current !== 'waiting' || betPlaced) return
    if (!canAfford(betAmount)) {
      onMessage?.('Insufficient balance')
      return
    }
    if (!debit(betAmount)) return
    activeBet.current = betAmount
    cashed.current = false
    setBetPlaced(true)
    onMessage?.(null)
  }, [betAmount, betPlaced, canAfford, debit, onMessage])

  const cashOut = () => {
    if (phase !== 'flying' || !betPlaced || cashed.current) return
    doCashOut(mult)
  }

  const adjustBet = (delta: number) => {
    if (phase === 'flying') return
    setBetAmount((b) => {
      const idx = BET_STEPS.findIndex((s) => s >= b)
      const i = idx === -1 ? BET_STEPS.length - 1 : idx
      if (delta > 0) return BET_STEPS[Math.min(BET_STEPS.length - 1, i + 1)]
      return BET_STEPS[Math.max(0, i - 1)]
    })
  }

  useEffect(() => {
    const id = window.setInterval(() => {
      if (phaseRef.current !== 'waiting') return
      countdownRef.current = Math.max(0, countdownRef.current - 0.05)
      setCountdown(countdownRef.current)
      if (countdownRef.current <= 0 && !launchingRef.current) {
        if (autoBet && !betPlaced && canAfford(betAmount)) {
          if (debit(betAmount)) {
            activeBet.current = betAmount
            cashed.current = false
            setBetPlaced(true)
          }
        }
        startFlying()
      }
    }, 50)
    return () => clearInterval(id)
  }, [autoBet, betAmount, betPlaced, canAfford, debit, startFlying])

  useEffect(() => () => stopLoop(), [stopLoop])

  const dismissWelcome = (training: boolean) => {
    localStorage.setItem(INTRO_STORAGE_KEY, '1')
    setShowWelcome(false)
    if (training) onMessage?.('Training mode — place a bet before the round starts!')
  }

  return (
    <CrashDesignUI
      viewportRef={viewportRef}
      layout={layout}
      rootClassName={styles.root}
      canvasClassName={styles.canvas}
      bankroll={balance}
      balance={balance}
      betAmount={betAmount}
      mult={mult}
      phase={phase}
      countdown={countdown}
      history={history}
      roundNo={roundNo}
      autoBet={autoBet}
      autoEscape={autoEscape}
      gameType={gameType}
      betPlaced={betPlaced}
      showWelcome={showWelcome}
      onWelcomeChoice={dismissWelcome}
      onAutoBetToggle={() => setAutoBet((v) => !v)}
      onAutoEscapeToggle={() => setAutoEscape((v) => !v)}
      onGameTypeToggle={() => setGameType((g) => (g === 'classic' ? 'trenball' : 'classic'))}
      onBetMinus={() => adjustBet(-1)}
      onBetPlus={() => adjustBet(1)}
      onBet={placeBet}
      onCashOut={cashOut}
      onHome={() => navigate('/home')}
    />
  )
}
