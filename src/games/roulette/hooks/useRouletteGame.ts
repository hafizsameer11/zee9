import { useCallback, useEffect, useRef, useState } from 'react'
import {
  BETTING_CLOSING_SECONDS,
  HISTORY_LIMIT,
  type RouletteBet,
  type RouletteGameState,
} from '../constants/rouletteConfig'
import { assertValidResult, bindRouletteSocket } from '../services/rouletteGameService'
import {
  connectRouletteSocket,
  type RouletteSocketSeat,
  type RouletteSocketState,
} from '../../lib/rouletteSocket'
import { useRouletteAnimation } from './useRouletteAnimation'
import { useRouletteBets } from './useRouletteBets'

type Opts = {
  assetsReady: boolean
  assetProgress: number
  canAfford: (n: number) => boolean
  reducedMotion?: boolean
  onMessage?: (msg: string | null) => void
  playSfx?: (id: string) => void
  onWalletChange?: () => void
  onPublicBet?: (bet: {
    id: string
    betKey: string
    amount: number
    at: string
    seat?: string
  }) => void
}

function phaseToUi(
  phase: RouletteSocketState['phase'],
  msLeft: number,
  spinningDone: boolean,
): RouletteGameState {
  if (phase === 'betting') {
    const secs = Math.ceil(msLeft / 1000)
    return secs <= BETTING_CLOSING_SECONDS ? 'BETTING_CLOSING' : 'BETTING_OPEN'
  }
  if (phase === 'locked') return spinningDone ? 'RESULT' : 'SPINNING'
  // reveal
  if (!spinningDone) return 'SPINNING'
  const secs = Math.ceil(msLeft / 1000)
  return secs > 2 ? 'RESULT' : 'PAYOUT'
}

export function useRouletteGame({
  assetsReady,
  assetProgress,
  canAfford,
  reducedMotion = false,
  onMessage,
  playSfx,
  onWalletChange,
  onPublicBet,
}: Opts) {
  const [state, setState] = useState<RouletteGameState>('LOADING')
  const [countdown, setCountdown] = useState(0)
  const [history, setHistory] = useState<number[]>([])
  const [winningNumber, setWinningNumber] = useState<number | null>(null)
  const [lastPayout, setLastPayout] = useState(0)
  const [statusText, setStatusText] = useState('Loading')
  const [roundBets, setRoundBets] = useState<RouletteBet[]>([])
  const [error, setError] = useState<string | null>(null)
  const [seats, setSeats] = useState<RouletteSocketSeat[]>([])
  const [playersOnline, setPlayersOnline] = useState(1)
  const [serverPhase, setServerPhase] = useState<'betting' | 'locked' | 'reveal' | null>(null)
  const [cellTotals, setCellTotals] = useState<Record<string, number>>({})

  const mountedRef = useRef(true)
  const playSfxRef = useRef(playSfx)
  playSfxRef.current = playSfx
  const onMessageRef = useRef(onMessage)
  onMessageRef.current = onMessage
  const onWalletChangeRef = useRef(onWalletChange)
  onWalletChangeRef.current = onWalletChange
  const onPublicBetRef = useRef(onPublicBet)
  onPublicBetRef.current = onPublicBet

  const roundIdRef = useRef<string | null>(null)
  const spunForRoundRef = useRef<string | null>(null)
  const spinDoneForRoundRef = useRef<string | null>(null)
  const paidAnnounceRef = useRef<string | null>(null)
  const prevPhaseRef = useRef<string | null>(null)
  const socketRef = useRef<ReturnType<typeof connectRouletteSocket> | null>(null)

  const bettingOpen = state === 'BETTING_OPEN' || state === 'BETTING_CLOSING'

  const betsApi = useRouletteBets({
    canAfford,
    bettingOpen,
    onInsufficient: () => {
      playSfxRef.current?.('error')
      onMessageRef.current?.('Insufficient balance')
    },
    onPlace: () => {
      playSfxRef.current?.('chip')
      socketRef.current?.refresh()
    },
    onRemove: () => {
      playSfxRef.current?.('softClick')
      socketRef.current?.refresh()
    },
    onError: (msg) => {
      playSfxRef.current?.('error')
      onMessageRef.current?.(msg)
    },
    onWalletChange: () => onWalletChangeRef.current?.(),
  })

  const betsApiRef = useRef(betsApi)
  betsApiRef.current = betsApi

  const { visual, spinTo, cancel: cancelSpin } = useRouletteAnimation({
    reducedMotion,
    onComplete: (n) => {
      if (!mountedRef.current) return
      spinDoneForRoundRef.current = roundIdRef.current
      setWinningNumber(n)
      setState('RESULT')
      setStatusText(`Result · ${n}`)
      playSfxRef.current?.('reveal')
    },
  })

  const applyState = useCallback(
    (st: RouletteSocketState) => {
      if (!mountedRef.current) return

      const prevRound = roundIdRef.current
      const isNewRound = prevRound != null && prevRound !== st.roundId
      roundIdRef.current = st.roundId

      if (isNewRound) {
        spunForRoundRef.current = null
        spinDoneForRoundRef.current = null
        paidAnnounceRef.current = null
        cancelSpin()
        setWinningNumber(null)
        setLastPayout(0)
        setRoundBets([])
        betsApiRef.current.clearAfterRound()
      }

      setServerPhase(st.phase)
      setHistory((st.history || []).slice(0, HISTORY_LIMIT))
      setPlayersOnline(Math.max(1, st.playersOnline ?? 1))
      setSeats(st.seats ?? [])
      if (st.cellTotals) setCellTotals(st.cellTotals)

      betsApiRef.current.syncFromServer(st.myBets || [], st.phase)

      const spinDone = spinDoneForRoundRef.current === st.roundId
      const ui = phaseToUi(st.phase, st.msLeft, spinDone)
      setState((prev) => (prev === 'LOADING' && !assetsReady ? prev : ui))

      if (st.phase === 'betting') {
        const secs = Math.max(0, Math.ceil(st.msLeft / 1000))
        setCountdown(secs)
        if (secs <= BETTING_CLOSING_SECONDS && secs > 0) {
          setStatusText('Bets closing')
          if (prevPhaseRef.current === 'betting' && secs === BETTING_CLOSING_SECONDS) {
            playSfxRef.current?.('countdown')
          }
        } else {
          setStatusText('Place your bets')
        }
        if (prevPhaseRef.current && prevPhaseRef.current !== 'betting') {
          playSfxRef.current?.('softClick')
        }
      } else {
        setCountdown(0)
      }

      // Betting → locked: close sfx + start spin
      if (st.phase === 'locked' || st.phase === 'reveal') {
        if (prevPhaseRef.current === 'betting') {
          playSfxRef.current?.('close')
          const locked = betsApiRef.current.snapshotForSpin()
          setRoundBets(locked)
        }

        if (st.result != null && spunForRoundRef.current !== st.roundId) {
          try {
            const n = assertValidResult(st.result)
            spunForRoundRef.current = st.roundId
            setStatusText('Spinning')
            setState('SPINNING')
            playSfxRef.current?.('spin')
            const ok = spinTo(n)
            if (!ok) {
              spinDoneForRoundRef.current = st.roundId
              setWinningNumber(n)
              setState('RESULT')
            }
          } catch (e) {
            setError(e instanceof Error ? e.message : 'Result failed')
          }
        }

        if (st.result != null && spinDone) {
          setWinningNumber(st.result)
        }

        if (st.phase === 'reveal' || spinDone) {
          const payout = st.myPayout ?? 0
          setLastPayout(payout)
          if (paidAnnounceRef.current !== st.roundId && (st.phase === 'reveal' || spinDone)) {
            paidAnnounceRef.current = st.roundId
            if (payout > 0) {
              setStatusText(`You win ${payout}`)
              playSfxRef.current?.('win')
              onMessageRef.current?.(`Won ${payout}`)
              onWalletChangeRef.current?.()
            } else if ((st.myBets || []).length > 0) {
              setStatusText('No win')
              playSfxRef.current?.('lose')
              onWalletChangeRef.current?.()
            } else {
              setStatusText('Next round')
            }
          }
        }
      }

      prevPhaseRef.current = st.phase
    },
    [assetsReady, cancelSpin, spinTo],
  )

  useEffect(() => {
    mountedRef.current = true
    return () => {
      mountedRef.current = false
      cancelSpin()
      bindRouletteSocket(null)
      socketRef.current?.close()
      socketRef.current = null
    }
  }, [cancelSpin])

  useEffect(() => {
    if (!assetsReady || socketRef.current) return
    setStatusText('Connecting')
    const sock = connectRouletteSocket({
      onState: applyState,
      onPresence: (n) => setPlayersOnline(Math.max(1, n)),
      onError: (msg) => {
        setError(msg)
        onMessageRef.current?.(msg)
      },
      onStatus: (s) => {
        if (s === 'open') setError(null)
        if (s === 'connecting' && state === 'LOADING') setStatusText('Connecting')
      },
      onBet: (bet) => onPublicBetRef.current?.(bet),
    })
    socketRef.current = sock
    bindRouletteSocket(sock)
    return () => {
      sock.close()
      bindRouletteSocket(null)
      if (socketRef.current === sock) socketRef.current = null
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [assetsReady, applyState])

  return {
    state,
    countdown,
    history,
    winningNumber,
    lastPayout,
    loadProgress: assetsReady ? 100 : assetProgress,
    statusText,
    error,
    visual,
    roundBets,
    seats,
    playersOnline,
    serverPhase,
    cellTotals,
    socketRef,
    ...betsApi,
    bettingOpen,
  }
}
