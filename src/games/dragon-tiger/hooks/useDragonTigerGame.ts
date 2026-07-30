import { useCallback, useEffect, useRef, useState } from 'react'
import {
  BETTING_CLOSING_SECONDS,
  BETTING_SECONDS,
  DEAL_MS,
  FLIP_MS,
  HISTORY_LIMIT,
  STOP_BANNER_MS,
  TREND_LIMIT,
  WINNER_MS,
  type DragonTigerGameState,
  type PlayingCard,
  type Rank,
  type Suit,
  type Winner,
} from '../constants/gameConfig'
import { bindDragonTigerSocket } from '../services/dragonTigerGameService'
import { useDragonTigerBets } from './useDragonTigerBets'
import { getAccess } from '../../../api/client'
import {
  connectDragonTigerSocket,
  type DragonTigerSocketState,
} from '../../lib/dragonTigerSocket'

type WalletFns = {
  canAfford: (n: number) => boolean
  debit: (n: number) => boolean
  credit: (n: number) => void
}

type Opts = WalletFns & {
  assetsReady: boolean
  assetProgress: number
  reducedMotion?: boolean
  onMessage?: (msg: string | null) => void
  playSfx?: (id: string) => void
  onWalletChange?: () => void
}

const INITIAL_HISTORY: Winner[] = [
  'dragon',
  'tiger',
  'dragon',
  'tie',
  'tiger',
  'dragon',
  'dragon',
  'tiger',
  'dragon',
  'tiger',
  'tie',
  'dragon',
]

function toCard(c: { rank: string; suit: string; value: number; id: string } | null): PlayingCard | null {
  if (!c) return null
  return {
    rank: c.rank as Rank,
    suit: c.suit as Suit,
    value: c.value,
    id: c.id,
  }
}

export function useDragonTigerGame({
  canAfford,
  debit,
  credit,
  assetsReady,
  assetProgress,
  reducedMotion = false,
  onMessage,
  playSfx,
  onWalletChange,
}: Opts) {
  const live = !!getAccess()
  const [state, setState] = useState<DragonTigerGameState>('LOADING')
  const [countdown, setCountdown] = useState(BETTING_SECONDS)
  const [history, setHistory] = useState<Winner[]>(live ? [] : INITIAL_HISTORY)
  const [trend, setTrend] = useState<Winner[]>(live ? [] : INITIAL_HISTORY)
  const [dragonCard, setDragonCard] = useState<PlayingCard | null>(null)
  const [tigerCard, setTigerCard] = useState<PlayingCard | null>(null)
  const [dragonRevealed, setDragonRevealed] = useState(false)
  const [tigerRevealed, setTigerRevealed] = useState(false)
  const [winner, setWinner] = useState<Winner | null>(null)
  const [lastPayout, setLastPayout] = useState(0)
  const [statusText, setStatusText] = useState('Loading')
  const [showStopBanner, setShowStopBanner] = useState(false)
  const [showVictory, setShowVictory] = useState(false)
  const [closedNotice, setClosedNotice] = useState(false)
  const [roundId, setRoundId] = useState(() => `dt-round-${Date.now()}`)
  const [dealingPhase, setDealingPhase] = useState<'idle' | 'dragon' | 'tiger' | 'done'>('idle')
  const [error, setError] = useState<string | null>(null)
  const [zoneTotals, setZoneTotals] = useState({ dragon: 0, tiger: 0, tie: 0 })
  const [playersOnline, setPlayersOnline] = useState(1)

  const mountedRef = useRef(true)
  const stateRef = useRef(state)
  stateRef.current = state
  const intervalRef = useRef<number | null>(null)
  const timeoutRefs = useRef<number[]>([])
  const startedRef = useRef(false)
  const resolvingRef = useRef(false)
  const playSfxRef = useRef(playSfx)
  playSfxRef.current = playSfx
  const onMessageRef = useRef(onMessage)
  onMessageRef.current = onMessage
  const creditRef = useRef(credit)
  creditRef.current = credit
  const onWalletChangeRef = useRef(onWalletChange)
  onWalletChangeRef.current = onWalletChange
  const reducedRef = useRef(reducedMotion)
  reducedRef.current = reducedMotion
  const socketRef = useRef<ReturnType<typeof connectDragonTigerSocket> | null>(null)
  const roundIdRef = useRef<string | null>(null)
  const prevPhaseRef = useRef<string | null>(null)
  const animForRoundRef = useRef<string | null>(null)
  const paidAnnounceRef = useRef<string | null>(null)

  const clearTimers = useCallback(() => {
    if (intervalRef.current != null) {
      window.clearInterval(intervalRef.current)
      intervalRef.current = null
    }
    for (const id of timeoutRefs.current) window.clearTimeout(id)
    timeoutRefs.current = []
  }, [])

  const later = useCallback((fn: () => void, ms: number) => {
    const id = window.setTimeout(() => {
      if (mountedRef.current) fn()
    }, ms)
    timeoutRefs.current.push(id)
  }, [])

  const bettingOpen = state === 'BETTING_OPEN' || state === 'BETTING_CLOSING'

  const betsApi = useDragonTigerBets({
    canAfford,
    debit,
    credit,
    bettingOpen,
    roundId,
    onInsufficient: () => {
      playSfxRef.current?.('error')
      onMessageRef.current?.('Insufficient balance')
    },
    onPlace: () => playSfxRef.current?.('chip'),
    onRemove: () => playSfxRef.current?.('click'),
    onClosed: () => {
      setClosedNotice(true)
      playSfxRef.current?.('error')
      later(() => setClosedNotice(false), 1600)
    },
    onWalletChange: () => onWalletChangeRef.current?.(),
    onError: (msg) => onMessageRef.current?.(msg),
  })

  const betsApiRef = useRef(betsApi)
  betsApiRef.current = betsApi

  /* ---------- LIVE: server WebSocket driven ---------- */
  const runRevealAnim = useCallback(
    (st: DragonTigerSocketState) => {
      if (!st.roundId || animForRoundRef.current === st.roundId) return
      animForRoundRef.current = st.roundId
      const scale = reducedRef.current ? 0.45 : 1
      const dCard = toCard(st.dragonCard)
      const tCard = toCard(st.tigerCard)
      const win = st.winner

      setShowStopBanner(true)
      setState('BETTING_CLOSED')
      setStatusText('Stop Betting')
      playSfxRef.current?.('stop')
      betsApiRef.current.snapshotForRound()

      later(() => {
        setShowStopBanner(false)
        setState('DEALING')
        setStatusText('Dealing')
        setDealingPhase('dragon')
        playSfxRef.current?.('deal')

        later(() => {
          setDealingPhase('tiger')
          playSfxRef.current?.('deal')

          later(() => {
            setDealingPhase('done')
            if (dCard) setDragonCard(dCard)
            if (tCard) setTigerCard(tCard)
            if (win) setWinner(win)

            setState('REVEALING_DRAGON')
            setStatusText('Reveal')
            playSfxRef.current?.('flip')
            later(() => {
              setDragonRevealed(true)
              setState('REVEALING_TIGER')
              playSfxRef.current?.('flip')
              later(() => {
                setTigerRevealed(true)
                setState('SHOWING_WINNER')
                setStatusText(
                  win === 'tie' ? 'Tie' : win === 'dragon' ? 'Dragon wins' : 'Tiger wins',
                )
                if (win === 'dragon') {
                  playSfxRef.current?.('dragon')
                  playSfxRef.current?.('dragonRoar')
                } else if (win === 'tiger') {
                  playSfxRef.current?.('tiger')
                  playSfxRef.current?.('tigerRoar')
                } else {
                  playSfxRef.current?.('tie')
                }

                later(() => {
                  playSfxRef.current?.('highlight')

                  const payout = st.myPayout ?? 0
                  setLastPayout(payout)
                  setState('PAYOUT')
                  if (win) {
                    setHistory((h) => [win, ...h].slice(0, HISTORY_LIMIT))
                    setTrend((h) => [win, ...h].slice(0, TREND_LIMIT))
                  }

                  if (paidAnnounceRef.current !== st.roundId) {
                    paidAnnounceRef.current = st.roundId
                    if (payout > 0) {
                      setShowVictory(true)
                      setStatusText(`You win ${payout}`)
                      playSfxRef.current?.('win')
                      playSfxRef.current?.('coin')
                      onMessageRef.current?.(`Won ${payout}`)
                    } else if ((st.myBets || []).length > 0) {
                      setShowVictory(false)
                      setStatusText('No win')
                      playSfxRef.current?.('lose')
                    } else {
                      setShowVictory(false)
                      setStatusText('Next round')
                    }
                    onWalletChangeRef.current?.()
                  }
                }, WINNER_MS * scale)
              }, FLIP_MS * scale)
            }, FLIP_MS * scale)
          }, DEAL_MS * scale)
        }, DEAL_MS * scale)
      }, STOP_BANNER_MS * scale)
    },
    [later],
  )

  const applyServerState = useCallback(
    (st: DragonTigerSocketState) => {
      if (!mountedRef.current || !st.roundId) return

      const prevRound = roundIdRef.current
      const isNewRound = prevRound != null && prevRound !== st.roundId
      roundIdRef.current = st.roundId
      setRoundId(st.roundId)

      if (isNewRound) {
        animForRoundRef.current = null
        paidAnnounceRef.current = null
        setShowStopBanner(false)
        setShowVictory(false)
        setDragonCard(null)
        setTigerCard(null)
        setDragonRevealed(false)
        setTigerRevealed(false)
        setWinner(null)
        setLastPayout(0)
        setDealingPhase('idle')
        betsApiRef.current.clearAfterRound()
      }

      setZoneTotals(st.zoneTotals || { dragon: 0, tiger: 0, tie: 0 })
      setPlayersOnline(Math.max(1, st.playersOnline ?? 1))
      if (st.history?.length) {
        setHistory(st.history.slice(0, HISTORY_LIMIT))
        setTrend(st.history.slice(0, TREND_LIMIT))
      }
      betsApiRef.current.syncFromServer(st.myBets || [], st.phase, st.roundId)

      if (st.phase === 'betting') {
        const secs = Math.max(0, Math.ceil(st.msLeft / 1000))
        setCountdown(secs)
        const ui: DragonTigerGameState =
          secs <= BETTING_CLOSING_SECONDS && secs > 0 ? 'BETTING_CLOSING' : 'BETTING_OPEN'
        setState(ui)
        setStatusText(ui === 'BETTING_CLOSING' ? 'Bets closing' : 'Place your bets')
        if (secs <= BETTING_CLOSING_SECONDS && secs > 0) {
          if (prevPhaseRef.current === 'betting' && secs === BETTING_CLOSING_SECONDS) {
            playSfxRef.current?.('countdown')
          }
          if (secs <= 5) playSfxRef.current?.('tick')
        }
        if (prevPhaseRef.current && prevPhaseRef.current !== 'betting') {
          playSfxRef.current?.('softClick')
        }
      }

      if (st.phase === 'locked') {
        setCountdown(0)
        if (prevPhaseRef.current === 'betting' || animForRoundRef.current !== st.roundId) {
          // Wait for reveal cards — show stop / dealing until then
          if (animForRoundRef.current !== st.roundId) {
            setShowStopBanner(true)
            setState('BETTING_CLOSED')
            setStatusText('Stop Betting')
            if (prevPhaseRef.current === 'betting') playSfxRef.current?.('stop')
          }
        }
      }

      if (st.phase === 'reveal' && st.dragonCard && st.tigerCard && st.winner) {
        setCountdown(0)
        if (animForRoundRef.current !== st.roundId) {
          runRevealAnim(st)
        } else if (st.msLeft < 800) {
          // End of reveal window — prep for next round
          setShowVictory(false)
          setState('RESETTING')
          setStatusText('Resetting')
        }
      }

      prevPhaseRef.current = st.phase
    },
    [runRevealAnim],
  )

  /* ---------- DEMO: local timer loop (logged-out only) ---------- */
  const beginBetting = useRef<() => void>(() => {})
  const beginResolve = useRef<() => void>(() => {})

  beginResolve.current = () => {
    if (live || !mountedRef.current || resolvingRef.current) return
    resolvingRef.current = true
    setError('Not authenticated')
    onMessageRef.current?.('Not authenticated')
    resolvingRef.current = false
  }

  beginBetting.current = () => {
    if (live || !mountedRef.current) return
    setError('Not authenticated')
    onMessageRef.current?.('Not authenticated')
    setStatusText('Not authenticated')
  }

  useEffect(() => {
    mountedRef.current = true
    return () => {
      mountedRef.current = false
      clearTimers()
      bindDragonTigerSocket(null)
      socketRef.current?.close()
      socketRef.current = null
    }
  }, [clearTimers])

  useEffect(() => {
    if (!assetsReady || startedRef.current) return
    startedRef.current = true

    if (!live) {
      setError('Not authenticated')
      setStatusText('Not authenticated')
      onMessageRef.current?.('Not authenticated')
      return
    }

    setStatusText('Connecting')
    const sock = connectDragonTigerSocket({
      onState: applyServerState,
      onHello: () => onWalletChangeRef.current?.(),
      onError: (msg) => {
        setError(msg)
        onMessageRef.current?.(msg)
      },
      onStatus: (s) => {
        if (s === 'connecting') setStatusText('Connecting')
        if (s === 'open') setStatusText('Place your bets')
        if (s === 'closed') setStatusText('Reconnecting…')
      },
    })
    socketRef.current = sock
    bindDragonTigerSocket(sock)
  }, [assetsReady, live, applyServerState])

  return {
    state,

    countdown,
    history,
    trend,
    dragonCard,
    tigerCard,
    dragonRevealed,
    tigerRevealed,
    winner,
    lastPayout,
    loadProgress: assetsReady ? 100 : assetProgress,
    statusText,
    error,
    showStopBanner,
    showVictory,
    closedNotice,
    dealingPhase,
    roundId,
    zoneTotals,
    playersOnline,
    live,
    ...betsApi,
    bettingOpen,
  }
}
