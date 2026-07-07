import { useCallback, useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useWallet } from '../../context/WalletContext'
import { generateCrashPoint, multiplierAtElapsed } from '../engines/crash'
import { DESIGN_H, DESIGN_W, useDesignScale } from '../hooks/useDesignScale'
import type { GameComponentProps } from '../types'
import CrashDesignUI from './CrashDesignUI'
import styles from './crashGame.module.css'

type Phase = 'idle' | 'flying' | 'crashed' | 'cashed'

const LIVE_FEED = [
  { initials: 'AK', name: 'Ahmed_K', bet: 500, mult: 5.87, status: 'won' as const },
  { initials: 'SN', name: 'Sana92', bet: 200, mult: null, status: 'flying' as const },
  { initials: 'BR', name: 'Bilal.R', bet: 1000, mult: 2.41, status: 'won' as const },
  { initials: 'ZR', name: 'Zara_R', bet: 300, mult: null, status: 'flying' as const },
  { initials: 'HM', name: 'Hamza_M', bet: 150, mult: 1.98, status: 'won' as const },
  { initials: 'FK', name: 'Faris_K', bet: 750, mult: null, status: 'flying' as const },
]

export default function CrashGame({ bet: defaultBet, onMessage }: GameComponentProps) {
  const navigate = useNavigate()
  const viewportRef = useRef<HTMLDivElement>(null)
  const scale = useDesignScale(viewportRef)
  const { balance, debit, credit, canAfford } = useWallet()

  const [phase, setPhase] = useState<Phase>('idle')
  const [mult, setMult] = useState(1)
  const [betAmount, setBetAmount] = useState(defaultBet)
  const [autoCashout, setAutoCashout] = useState(2)
  const [history, setHistory] = useState<number[]>([1.12, 3.44, 12.8, 1.31, 2.07, 4.6, 1.09, 2.9])
  const [roundNo, setRoundNo] = useState(94207)
  const [lastWin, setLastWin] = useState<number | null>(null)

  const crashPoint = useRef(1)
  const startTime = useRef(0)
  const raf = useRef(0)
  const activeBet = useRef(0)
  const cashed = useRef(false)

  const stopLoop = useCallback(() => {
    if (raf.current) cancelAnimationFrame(raf.current)
  }, [])

  const resetIdle = useCallback(() => {
    setPhase('idle')
    setMult(1)
    activeBet.current = 0
    cashed.current = false
  }, [])

  const endCrash = useCallback(() => {
    stopLoop()
    setPhase('crashed')
    setMult(crashPoint.current)
    setHistory((h) => [crashPoint.current, ...h].slice(0, 12))
    if (!cashed.current) onMessage?.('💥 Crashed!')
    setTimeout(resetIdle, 2200)
  }, [onMessage, resetIdle, stopLoop])

  const doCashOut = useCallback(
    (atMult: number) => {
      if (cashed.current) return
      cashed.current = true
      stopLoop()
      const win = Math.round(activeBet.current * atMult * 100) / 100
      credit(win)
      setLastWin(win)
      setPhase('cashed')
      onMessage?.(`🎉 Cashed out PKR ${win.toLocaleString()}!`)
      setTimeout(resetIdle, 2200)
    },
    [credit, onMessage, resetIdle, stopLoop],
  )

  const tick = useCallback(() => {
    const elapsed = Date.now() - startTime.current
    const m = multiplierAtElapsed(elapsed)
    setMult(m)
    if (m >= crashPoint.current) {
      endCrash()
      return
    }
    if (autoCashout > 0 && m >= autoCashout && !cashed.current) {
      doCashOut(m)
      return
    }
    raf.current = requestAnimationFrame(tick)
  }, [autoCashout, doCashOut, endCrash])

  const startRound = useCallback(() => {
    if (phase !== 'idle') return
    if (!canAfford(betAmount)) {
      onMessage?.('Insufficient balance')
      return
    }
    if (!debit(betAmount)) return
    activeBet.current = betAmount
    cashed.current = false
    crashPoint.current = generateCrashPoint()
    startTime.current = Date.now()
    setMult(1)
    setPhase('flying')
    setRoundNo((n) => n + 1)
    setLastWin(null)
    onMessage?.(null)
    raf.current = requestAnimationFrame(tick)
  }, [betAmount, canAfford, debit, onMessage, phase, tick])

  const cashOut = () => {
    if (phase !== 'flying' || cashed.current) return
    doCashOut(mult)
  }

  const adjustBet = (delta: number) => {
    if (phase === 'flying') return
    setBetAmount((b) => Math.max(50, Math.min(5000, b + delta)))
  }

  useEffect(() => () => stopLoop(), [stopLoop])

  const flying = phase === 'flying'
  const crashed = phase === 'crashed'
  const totalStake = phase === 'flying' || phase === 'cashed' ? activeBet.current : 0
  const potentialWin = flying ? Math.round(activeBet.current * mult) : 0

  return (
    <CrashDesignUI
      viewportRef={viewportRef}
      scale={scale}
      designW={DESIGN_W}
      designH={DESIGN_H}
      rootClassName={styles.root}
      canvasClassName={styles.canvas}
      balance={balance}
      betAmount={betAmount}
      autoCashout={autoCashout}
      onAutoCashout={setAutoCashout}
      onBetMinus={() => adjustBet(-50)}
      onBetPlus={() => adjustBet(50)}
      onQuickStake={setBetAmount}
      mult={mult}
      phase={phase}
      flying={flying}
      crashed={crashed}
      history={history}
      roundNo={roundNo}
      liveFeed={LIVE_FEED}
      totalStake={totalStake}
      potentialWin={potentialWin}
      lastWin={lastWin}
      onBet={startRound}
      onCashOut={cashOut}
      onHome={() => navigate('/home')}
      onMines={() => navigate('/play/mines')}
      onAviator={() => navigate('/play/aviator')}
      onTeenPatti={() => navigate('/play/teen-patti')}
      onWingo={() => navigate('/play/wingo-lottery')}
      onDoubleCrash={() => navigate('/play/double-crash')}
    />
  )
}
