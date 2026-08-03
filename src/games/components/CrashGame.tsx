import { useCallback, useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useWallet } from '../../context/WalletContext'
import { sound } from '../../lib/sound'
import { useDesignScale } from '../hooks/useDesignScale'
import { connectCrashSocket } from '../lib/crashSocket'
import type { GameComponentProps } from '../types'
import { roundLossMessage } from '../lib/roundResult'
import CrashDesignUI, { type CrashHistoryEntry, type CrashPhase } from './CrashDesignUI'
import styles from './crashGame.module.css'
import AddCashModal from '../../components/s9/modals/AddCashModal'

const BET_STEPS = [10, 20, 50, 100, 200, 500, 1000, 2000, 5000, 10000]
const INTRO_STORAGE_KEY = 'zee9-crash-welcome-dismissed'
const AUTO_CASHOUT_AT = 2

type ServerPhase = 'waiting' | 'flying' | 'crashed'
type PlayerStatus = 'idle' | 'active' | 'cashed' | 'bust'

export default function CrashGame({ bet: defaultBet, onMessage }: GameComponentProps) {
  const navigate = useNavigate()
  const viewportRef = useRef<HTMLDivElement>(null)
  const layout = useDesignScale(viewportRef)
  const { balance, refresh, canAfford } = useWallet()

  const [serverPhase, setServerPhase] = useState<ServerPhase>('waiting')
  const [playerStatus, setPlayerStatus] = useState<PlayerStatus>('idle')
  const [mult, setMult] = useState(1)
  const [displayMult, setDisplayMult] = useState(1)
  const [elapsedSec, setElapsedSec] = useState(0)
  const [flightStartPerf, setFlightStartPerf] = useState<number | null>(null)
  const [crashCap, setCrashCap] = useState<number | null>(null)
  const [betAmount, setBetAmount] = useState(defaultBet || 10)
  const [countdown, setCountdown] = useState(5)
  const [history, setHistory] = useState<CrashHistoryEntry[]>([])
  const [roundNo, setRoundNo] = useState(1000000)
  const [autoBet, setAutoBet] = useState(false)
  const [autoEscape, setAutoEscape] = useState(false)
  const [gameType, setGameType] = useState<'classic' | 'trenball'>('classic')
  const [betId, setBetId] = useState<string | null>(null)
  const [pendingNextBet, setPendingNextBet] = useState(false)
  const [showWelcome, setShowWelcome] = useState(() => !localStorage.getItem(INTRO_STORAGE_KEY))
  const [showAddCash, setShowAddCash] = useState(false)
  const [menuOpen, setMenuOpen] = useState(false)

  const prevPhase = useRef<ServerPhase | 'idle'>('idle')
  const flightStartPerfRef = useRef<number | null>(null)
  const busyRef = useRef(false)
  const socketRef = useRef<ReturnType<typeof connectCrashSocket> | null>(null)
  const autoBetRef = useRef(autoBet)
  const pendingRef = useRef(pendingNextBet)
  const playerStatusRef = useRef(playerStatus)
  const betAmountRef = useRef(betAmount)
  const autoEscapeRef = useRef(autoEscape)
  const applyStateRef = useRef<(state: any) => void>(() => {})

  autoBetRef.current = autoBet
  pendingRef.current = pendingNextBet
  playerStatusRef.current = playerStatus
  betAmountRef.current = betAmount
  autoEscapeRef.current = autoEscape

  const uiPhase: CrashPhase =
    serverPhase === 'flying'
      ? playerStatus === 'cashed'
        ? 'cashed'
        : 'flying'
      : serverPhase === 'crashed'
        ? 'crashed'
        : 'waiting'

  const betPlaced = playerStatus === 'active' || playerStatus === 'cashed' || playerStatus === 'bust'

  const placeBetOnServer = useCallback(async () => {
    if (busyRef.current) return false
    const amount = betAmountRef.current
    if (!canAfford(amount)) {
      sound.play('error')
      onMessage?.('Insufficient balance')
      return false
    }
    busyRef.current = true
    try {
      const sock = socketRef.current
      if (!sock) throw new Error('Not connected')
      sound.play('bet')
      const res = await sock.request<{ betId: string }>('bet', {
        amount,
        slot: 0,
        autoAt: autoEscapeRef.current ? AUTO_CASHOUT_AT : null,
      })
      setBetId(res.betId)
      setPlayerStatus('active')
      playerStatusRef.current = 'active'
      setPendingNextBet(false)
      onMessage?.(null)
      void refresh()
      socketRef.current?.refresh()
      return true
    } catch (e: any) {
      sound.play('error')
      onMessage?.(e?.message || 'Bet failed')
      return false
    } finally {
      busyRef.current = false
    }
  }, [canAfford, onMessage, refresh])

  const applyState = useCallback(
    (state: any) => {
      const nextPhase = state.phase as ServerPhase
      setServerPhase(nextPhase)
      setCountdown(Math.max(0, (state.waitingMsLeft ?? 0) / 1000))

      if (Array.isArray(state.history)) {
        setHistory(
          state.history.map((m: number, i: number) => ({
            roundId: 4_500_000 + state.history.length - i,
            mult: m,
          })),
        )
      }
      if (state.roundId) {
        const n = parseInt(String(state.roundId).replace(/\D/g, '').slice(-7), 10)
        if (Number.isFinite(n)) setRoundNo(n)
      }

      const mine = Array.isArray(state.myBets) ? state.myBets.find((b: any) => b.slot === 0) : null
      if (mine) {
        setBetId(mine.id)
        if (mine.state === 'CASHED_OUT') {
          setPlayerStatus('cashed')
          playerStatusRef.current = 'cashed'
        } else if (mine.state === 'BUST') {
          setPlayerStatus('bust')
          playerStatusRef.current = 'bust'
        } else if (playerStatusRef.current !== 'cashed') {
          setPlayerStatus('active')
          playerStatusRef.current = 'active'
        }
      } else if (nextPhase === 'waiting') {
        setBetId(null)
        setPlayerStatus('idle')
        playerStatusRef.current = 'idle'
      }

      // Only set flight clock — rocket RAF lives in CrashDesignUI (not killed by cashout)
      if (nextPhase === 'flying') {
        if (prevPhase.current !== 'flying' || flightStartPerfRef.current == null) {
          const serverNow = state.serverTime ? Date.parse(state.serverTime) : Date.now()
          const clockOffset = Date.now() - serverNow
          const startWall = state.startedAt ? Date.parse(state.startedAt) : Date.now()
          const elapsedAlready = Math.max(0, Date.now() - clockOffset - startWall)
          const perfStart = performance.now() - elapsedAlready
          flightStartPerfRef.current = perfStart
          setFlightStartPerf(perfStart)
          setCrashCap(null)
        }
      } else if (nextPhase === 'crashed') {
        flightStartPerfRef.current = null
        setFlightStartPerf(null)
        const crash = state.crashPoint ?? state.multiplier ?? 1
        setCrashCap(crash)
        setMult(crash)
        setDisplayMult(crash)
        setElapsedSec((state.elapsedMs ?? 0) / 1000)
      } else {
        flightStartPerfRef.current = null
        setFlightStartPerf(null)
        setCrashCap(null)
        setMult(1)
        setDisplayMult(1)
        setElapsedSec(0)
      }

      if (prevPhase.current !== nextPhase) {
        if (nextPhase === 'flying' && prevPhase.current === 'waiting') {
          sound.play('whoosh', { volume: 0.5 })
        }
        if (nextPhase === 'crashed' && prevPhase.current === 'flying') {
          sound.play('crash')
          if (playerStatusRef.current !== 'cashed') {
            const staked = betAmountRef.current
            onMessage?.(
              staked > 0 ? `💥 Bang! ${roundLossMessage(staked)}` : '💥 Bang!',
            )
          }
          void refresh()
        }
        if (nextPhase === 'waiting') {
          onMessage?.(null)
          const shouldPlace = pendingRef.current || autoBetRef.current
          setPendingNextBet(false)
          void refresh()
          if (shouldPlace) {
            window.setTimeout(() => void placeBetOnServer(), 60)
          }
        }
        prevPhase.current = nextPhase
      }
    },
    [onMessage, placeBetOnServer, refresh],
  )
  applyStateRef.current = applyState

  useEffect(() => {
    const sock = connectCrashSocket({
      onState: (s) => applyStateRef.current(s),
      onError: (message) => onMessage?.(message),
    })
    socketRef.current = sock
    return () => {
      sock.close()
      socketRef.current = null
    }
  }, [onMessage])

  const onFlightMult = useCallback((m: number, elapsed: number) => {
    setMult(m)
    setDisplayMult(m)
    setElapsedSec(elapsed)
  }, [])

  const onBet = async () => {
    if (serverPhase === 'waiting' && playerStatus === 'idle') {
      await placeBetOnServer()
      return
    }
    if (playerStatus === 'active') return
    if (pendingNextBet) {
      setPendingNextBet(false)
      onMessage?.(null)
      return
    }
    if (serverPhase === 'flying' || serverPhase === 'crashed' || playerStatus === 'cashed') {
      setPendingNextBet(true)
      onMessage?.('Bet queued for next round')
      window.setTimeout(() => onMessage?.(null), 1800)
    }
  }

  const cashOut = async () => {
    if (busyRef.current || !betId) return
    if (serverPhase !== 'flying' || playerStatus !== 'active') return
    busyRef.current = true

    const id = betId
    const atMult = mult
    const estPayout = Math.round(betAmount * atMult)

    onMessage?.(`Cashing out ${estPayout.toLocaleString()}…`)
    try {
      const sock = socketRef.current
      if (!sock) throw new Error('Not connected')
      const res = await sock.request<{ payout: number; cashoutAt: number }>('cashout', {
        betId: id,
      })
      setPlayerStatus('cashed')
      playerStatusRef.current = 'cashed'
      sound.play('cashout')
      sound.play('coin', { volume: 0.65 })
      onMessage?.(
        `🎉 Cashed ${Math.round(res.payout).toLocaleString()} @ ${Number(res.cashoutAt).toFixed(2)}x`,
      )
      window.setTimeout(() => onMessage?.(null), 1800)
      window.setTimeout(() => void refresh(), 400)
      socketRef.current?.refresh()
    } catch (e: any) {
      sound.play('error')
      onMessage?.(e?.message || 'Cash out failed')
      socketRef.current?.refresh()
    } finally {
      busyRef.current = false
    }
  }

  const adjustBet = (delta: number) => {
    if (serverPhase === 'flying' && playerStatus === 'active') return
    sound.play('chip', { volume: 0.45 })
    setBetAmount((b) => {
      const idx = BET_STEPS.findIndex((s) => s >= b)
      const i = idx === -1 ? BET_STEPS.length - 1 : idx
      if (delta > 0) return BET_STEPS[Math.min(BET_STEPS.length - 1, i + 1)]
      return BET_STEPS[Math.max(0, i - 1)]
    })
  }

  const dismissWelcome = (training: boolean) => {
    localStorage.setItem(INTRO_STORAGE_KEY, '1')
    setShowWelcome(false)
    if (training) onMessage?.('Training mode — place a bet before the round starts!')
  }

  return (
    <>
    <CrashDesignUI
      viewportRef={viewportRef}
      layout={layout}
      rootClassName={styles.root}
      canvasClassName={styles.canvas}
      bankroll={balance}
      balance={balance}
      betAmount={betAmount}
      mult={mult}
      displayMult={displayMult}
      elapsedSec={elapsedSec}
      flightStartPerf={flightStartPerf}
      crashCap={crashCap}
      onFlightMult={onFlightMult}
      phase={uiPhase}
      serverPhase={serverPhase}
      playerStatus={playerStatus}
      pendingNextBet={pendingNextBet}
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
      onBet={() => void onBet()}
      onCashOut={cashOut}
      onHome={() => navigate('/')}
      onAddCash={() => {
        setMenuOpen(false)
        setShowAddCash(true)
      }}
      menuOpen={menuOpen}
      onToggleMenu={() => setMenuOpen((v) => !v)}
    />
    {showAddCash && <AddCashModal onClose={() => setShowAddCash(false)} />}
    </>
  )
}
