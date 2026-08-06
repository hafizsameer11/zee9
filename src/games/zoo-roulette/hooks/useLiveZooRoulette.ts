import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import type { GameSocket } from '../../lib/createGameSocket'
import {
  connectZooRouletteSocket,
  type ZooRoulettePublicBet,
  type ZooRouletteSocketState,
} from '../../lib/zooRouletteSocket'
import {
  ANIMAL_BY_ID,
  BETTING_SECONDS,
  HISTORY_LIMIT,
  MAX_BET_POSITIONS,
  PAYOUT_MS,
  RESULT_MS,
  REVEAL_LEAD_MS,
  SPIN_MS,
  STOP_BANNER_MS,
  TRACK,
  WARNING_SECONDS,
  type AnimalId,
  type BetZoneId,
  type ChipValue,
  type GameState,
} from '../constants/gameConfig'
import { SPIN_EASE } from '../utils/track'
import { roundLossMessage, roundYouWonMessage, sumBetAmounts } from '../../lib/roundResult'
import type { HistoryEntry, ZooRouletteSfx } from './useZooRoulette'

const LOCK_MS = STOP_BANNER_MS + SPIN_MS
const REVEAL_MS = RESULT_MS + PAYOUT_MS + 900

type Options = {
  enabled: boolean
  assetsReady: boolean
  assetProgress: number
  reducedMotion: boolean
  canAfford: (amount: number) => boolean
  playSfx: (id: ZooRouletteSfx, volume?: number) => void
  onToast?: (message: string | null, ms?: number) => void
  onWalletChange?: () => void
}

function hashStart(value: string) {
  let hash = 2166136261
  for (let i = 0; i < value.length; i++) hash = Math.imul(hash ^ value.charCodeAt(i), 16777619)
  return (hash >>> 0) % TRACK.length
}

export function useLiveZooRoulette(options: Options) {
  const api = useRef(options)
  api.current = options
  const socketRef = useRef<GameSocket | null>(null)
  const stateRef = useRef<ZooRouletteSocketState | null>(null)
  const lockEndAt = useRef(0)
  const raf = useRef(0)
  const walletRefreshRound = useRef<string | null>(null)
  const payoutAnnounceRound = useRef<string | null>(null)
  const previousBets = useRef<Map<BetZoneId, number>>(new Map())
  const currentRound = useRef<string | null>(null)

  const [server, setServer] = useState<ZooRouletteSocketState | null>(null)
  const [status, setStatus] = useState<'connecting' | 'open' | 'closed'>('closed')
  const [selectedChip, setSelectedChip] = useState<ChipValue>(1000)
  const [activeSlot, setActiveSlot] = useState<number | null>(null)
  const [insufficient, setInsufficient] = useState(false)
  const [publicBet, setPublicBet] = useState<ZooRoulettePublicBet | null>(null)

  const playSfx = useCallback((id: ZooRouletteSfx, volume?: number) => {
    api.current.playSfx(id, volume)
  }, [])

  const toast = useCallback((message: string | null, ms = 2200) => {
    api.current.onToast?.(message, ms)
  }, [])

  useEffect(() => {
    if (!options.enabled || !options.assetsReady) return
    const socket = connectZooRouletteSocket({
      onState: (next) => {
        const previous = stateRef.current
        if (currentRound.current && currentRound.current !== next.roundId && previous) {
          toast(null)
          const saved = new Map<BetZoneId, number>()
          for (const bet of previous.myBets) {
            saved.set(bet.zone, (saved.get(bet.zone) ?? 0) + bet.amount)
          }
          previousBets.current = saved
          setActiveSlot(null)
        }
        currentRound.current = next.roundId
        stateRef.current = next
        if (next.phase === 'locked') lockEndAt.current = Date.now() + next.msLeft
        setServer(next)

        if (next.phase === 'reveal' && walletRefreshRound.current !== next.roundId) {
          walletRefreshRound.current = next.roundId
          api.current.onWalletChange?.()
        }

      },
      onBet: setPublicBet,
      onStatus: setStatus,
      onError: (message) => {
        if (message === 'Not authenticated' || message === 'Not connected') {
          toast(message, 2600)
        }
      },
    })
    socketRef.current = socket
    return () => {
      socket.close()
      if (socketRef.current === socket) socketRef.current = null
    }
  }, [options.enabled, options.assetsReady, playSfx, toast])

  useEffect(() => {
    if (!server || server.phase !== 'locked' || server.resultSlot == null) return
    const target = server.resultSlot
    const start = hashStart(server.roundId)
    const steps = TRACK.length * 4 + ((target - start + TRACK.length) % TRACK.length)
    let last = -1
    let revealFired = api.current.reducedMotion

    const frame = () => {
      const remaining = Math.max(0, lockEndAt.current - Date.now())
      const elapsed = LOCK_MS - remaining
      const spinElapsed = elapsed - STOP_BANNER_MS
      if (spinElapsed < 0) {
        setActiveSlot(null)
      } else {
        const progress = api.current.reducedMotion ? 1 : Math.min(1, spinElapsed / SPIN_MS)
        const step = Math.floor(SPIN_EASE(progress) * steps)
        if (step !== last) {
          last = step
          setActiveSlot((start + step) % TRACK.length)
          if (progress < 1) playSfx('trackTick', 0.18 + 0.48 * (1 - progress))
        }
        if (!revealFired && remaining <= REVEAL_LEAD_MS && server.resultAnimal) {
          revealFired = true
          playSfx('reveal', 0.85)
        }
      }
      if (remaining > 0) raf.current = requestAnimationFrame(frame)
      else setActiveSlot(target)
    }
    raf.current = requestAnimationFrame(frame)
    return () => cancelAnimationFrame(raf.current)
  }, [server?.roundId, server?.phase, server?.resultSlot, server?.resultAnimal, playSfx])

  const gameState: GameState = useMemo(() => {
    if (!options.assetsReady || !server) return 'LOADING'
    if (server.phase === 'betting') {
      return server.msLeft > BETTING_SECONDS * 1000 ? 'NEW_ROUND' : 'BETTING'
    }
    if (server.phase === 'locked') {
      return server.msLeft > SPIN_MS ? 'CLOSING' : 'SPINNING'
    }
    const elapsed = REVEAL_MS - server.msLeft
    if (elapsed < RESULT_MS) return 'RESULT'
    if (elapsed < RESULT_MS + PAYOUT_MS) return 'PAYOUT'
    return 'RESETTING'
  }, [options.assetsReady, server])

  useEffect(() => {
    if (gameState !== 'PAYOUT' || !server) return
    if (payoutAnnounceRound.current === server.roundId) return
    payoutAnnounceRound.current = server.roundId
    const staked = sumBetAmounts(server.myBets)
    if (staked <= 0) return
    if (server.myPayout > 0) {
      const name = server.resultAnimal
        ? (ANIMAL_BY_ID.get(server.resultAnimal)?.name ?? server.resultAnimal)
        : undefined
      toast(roundYouWonMessage(server.myPayout, name), 3000)
      playSfx('coin')
    } else {
      toast(roundLossMessage(staked), 2200)
      playSfx('lose', 0.5)
    }
  }, [gameState, server, playSfx, toast])

  const bets = useMemo(() => {
    const result = new Map<BetZoneId, number>()
    for (const bet of server?.myBets ?? []) {
      result.set(bet.zone, (result.get(bet.zone) ?? 0) + bet.amount)
    }
    return result
  }, [server?.myBets])

  const history = useMemo<HistoryEntry[]>(
    () =>
      (server?.history ?? [])
        .filter((entry) => server?.phase === 'reveal' || entry.period !== server?.period)
        .slice(0, HISTORY_LIMIT)
        .map((entry, index) => ({ id: index + 1, animal: entry.animal, slot: entry.slot })),
    [server?.history, server?.period, server?.phase],
  )

  const flashInsufficient = useCallback(() => {
    setInsufficient(true)
    playSfx('error')
    window.setTimeout(() => setInsufficient(false), 2200)
  }, [playSfx])

  const placeBet = useCallback(
    async (zone: BetZoneId, value: ChipValue) => {
      if (!stateRef.current?.canBet || !socketRef.current?.ready()) {
        playSfx('error', 0.45)
        return false
      }
      if (!api.current.canAfford(value)) {
        flashInsufficient()
        return false
      }
      const distinct = new Set((stateRef.current?.myBets ?? []).map((bet) => bet.zone))
      if (!distinct.has(zone) && distinct.size >= MAX_BET_POSITIONS) {
        playSfx('error', 0.45)
        toast(`Max ${MAX_BET_POSITIONS} zones per round`, 2000)
        return false
      }
      try {
        await socketRef.current.request('bet', { zone, amount: value })
        api.current.onWalletChange?.()
        const label =
          zone === 'beast' ? 'BEAST' : zone === 'bird' ? 'BIRD' : ANIMAL_BY_ID.get(zone as AnimalId)?.name ?? zone
        toast(`Bet placed · ${label} ${value}`, 1500)
        playSfx('chip', 0.85)
        return true
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Bet failed'
        if (/insufficient/i.test(message)) {
          flashInsufficient()
        } else if (/betting closed|cannot revoke|bet failed/i.test(message)) {
          playSfx('error', 0.45)
        } else {
          toast(message, 2000)
        }
        socketRef.current?.refresh()
        api.current.onWalletChange?.()
        return false
      }
    },
    [flashInsufficient, playSfx, toast],
  )

  const rebet = useCallback(async () => {
    if (!stateRef.current?.canBet || !socketRef.current?.ready()) {
      playSfx('error', 0.45)
      return false
    }
    try {
      const data = (await socketRef.current.request('rebet')) as { count?: number; total?: number }
      api.current.onWalletChange?.()
      const count = data?.count ?? 0
      const total = data?.total ?? 0
      toast(count > 0 ? `Rebet placed · ${total.toLocaleString()}` : 'Rebet placed', 1800)
      playSfx('chip', 0.85)
      return true
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Rebet failed'
      if (/insufficient/i.test(message)) {
        flashInsufficient()
      } else if (/betting closed|no previous|cannot revoke/i.test(message)) {
        playSfx('error', 0.45)
      } else {
        toast(message, 2000)
      }
      socketRef.current?.refresh()
      return false
    }
  }, [flashInsufficient, playSfx, toast])

  const countdown = server?.phase === 'betting' ? Math.ceil(server.msLeft / 1000) : 0
  const warning = gameState === 'BETTING' && countdown <= WARNING_SECONDS
  const winner = server?.resultAnimal ?? null
  const winningSlot =
    server?.phase === 'reveal' && server.resultSlot != null ? server.resultSlot : null

  const settledPayout = server?.myPayout ?? 0
  const displayPayout = gameState === 'PAYOUT' ? settledPayout : 0

  return {
    state: gameState,
    statusText: status === 'open' ? (server?.canBet ? 'PLACE YOUR BETS' : 'RESULT') : 'CONNECTING',
    countdown,
    warning,
    bettingOpen:
      gameState === 'BETTING' &&
      !!server?.canBet &&
      (server?.msLeft ?? 0) > 300 &&
      status === 'open',
    selectedChip,
    setSelectedChip,
    bets,
    stake: [...bets.values()].reduce((a, b) => a + b, 0),
    lastBets: previousBets.current,
    hasLastRound: previousBets.current.size > 0,
    activeSlot,
    winningSlot,
    winner,
    history,
    payout: displayPayout,
    settledPayout,
    roundId: server?.period ?? 'SYNC',
    revealAnimal: winner,
    insufficient,
    loadProgress: options.assetProgress,
    bettableZones: [
      'monkey', 'rabbit', 'lion', 'panda',
      'swallow', 'pigeon', 'peacock', 'eagle',
      'shark', 'beast', 'bird',
    ] as BetZoneId[],
    placeBet,
    rebet,
    clearReveal: () => undefined,
    cellTotals: server?.cellTotals ?? {},
    publicBet,
    playersOnline: server?.playersOnline ?? 0,
    connected: status === 'open',
  }
}
