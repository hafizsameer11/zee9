import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { roundLossMessage, roundYouWonMessage } from '../../lib/roundResult'
import {
  BETTING_SECONDS,
  BETTABLE_ZONES,
  HISTORY_LIMIT,
  MAX_BET_POSITIONS,
  PAYOUT_MS,
  RESET_MS,
  RESULT_MS,
  REVEAL_LEAD_MS,
  SPIN_MS,
  START_BANNER_MS,
  STOP_BANNER_MS,
  TRACK,
  WARNING_SECONDS,
  calcPayout,
  type AnimalId,
  type BetZoneId,
  type ChipValue,
  type GameState,
} from '../constants/gameConfig'
import { ANIMAL_BY_ID } from '../constants/gameConfig'
import { SPIN_EASE, drawWinningSlot } from '../utils/track'

export type ZooRouletteSfx =
  | 'chip'
  | 'chipSelect'
  | 'whoosh'
  | 'tick'
  | 'countdown'
  | 'start'
  | 'stop'
  | 'trackTick'
  | 'rev'
  | 'reveal'
  | 'winner'
  | 'shimmer'
  | 'coin'
  | 'lose'
  | 'error'
  | 'click'

type Options = {
  assetsReady: boolean
  assetProgress: number
  reducedMotion: boolean
  canAfford: (n: number) => boolean
  debit: (n: number) => boolean | Promise<boolean>
  credit: (n: number) => void | Promise<void>
  playSfx: (id: ZooRouletteSfx, volume?: number) => void
  onToast?: (m: string | null, ms?: number) => void
  onWalletChange?: () => void
}

export type HistoryEntry = { id: number; animal: AnimalId; slot: number }

const now = () => performance.now()

export function useZooRoulette(opts: Options) {
  const { assetsReady, assetProgress, reducedMotion } = opts
  const api = useRef(opts)
  api.current = opts

  const playSfx = useCallback((id: ZooRouletteSfx, volume?: number) => {
    api.current.playSfx(id, volume)
  }, [])

  const [state, setState] = useState<GameState>('LOADING')
  const [countdown, setCountdown] = useState(BETTING_SECONDS)
  const [selectedChip, setSelectedChip] = useState<ChipValue>(1000)
  const [bets, setBets] = useState<Map<BetZoneId, number>>(() => new Map())
  const [lastBets, setLastBets] = useState<Map<BetZoneId, number>>(() => new Map())
  const [activeSlot, setActiveSlot] = useState<number | null>(null)
  const [winningSlot, setWinningSlot] = useState<number | null>(null)
  const [history, setHistory] = useState<HistoryEntry[]>([])
  const [payout, setPayout] = useState(0)
  const [roundId, setRoundId] = useState(() => 200000 + Math.floor(Math.random() * 799999))
  const [revealAnimal, setRevealAnimal] = useState<AnimalId | null>(null)
  const [insufficient, setInsufficient] = useState(false)

  const timers = useRef<number[]>([])
  const raf = useRef(0)
  const alive = useRef(true)
  const betsRef = useRef(bets)
  betsRef.current = bets
  const historySeq = useRef(0)
  const settledFor = useRef<number | null>(null)

  const clearTimers = useCallback(() => {
    for (const t of timers.current) window.clearTimeout(t)
    timers.current = []
    if (raf.current) cancelAnimationFrame(raf.current)
    raf.current = 0
  }, [])

  const after = useCallback((ms: number, fn: () => void) => {
    timers.current.push(window.setTimeout(() => alive.current && fn(), ms))
  }, [])

  useEffect(() => {
    alive.current = true
    return () => {
      alive.current = false
      clearTimers()
    }
  }, [clearTimers])

  const stake = useMemo(() => [...bets.values()].reduce((a, b) => a + b, 0), [bets])
  const winner = winningSlot == null ? null : TRACK[winningSlot]!
  const bettingOpen = state === 'BETTING'
  const warning = bettingOpen && countdown <= WARNING_SECONDS

  const startRound = useCallback(() => {
    settledFor.current = null
    setState('NEW_ROUND')
    setBets(new Map())
    setPayout(0)
    setActiveSlot(null)
    setWinningSlot(null)
    setRevealAnimal(null)
    setCountdown(BETTING_SECONDS)
    setRoundId((r) => r + 1)
    playSfx('start')
    after(START_BANNER_MS, () => setState('BETTING'))
  }, [after, playSfx])

  useEffect(() => {
    if (state === 'LOADING' && assetsReady) startRound()
  }, [state, assetsReady, startRound])

  useEffect(() => {
    if (state !== 'BETTING') return
    const id = window.setInterval(() => {
      setCountdown((c) => {
        const next = c - 1
        if (next <= WARNING_SECONDS && next > 0) playSfx('countdown', 0.75)
        else if (next > 0) playSfx('tick', 0.32)
        if (next <= 0) {
          window.clearInterval(id)
          setState('CLOSING')
        }
        return Math.max(0, next)
      })
    }, 1000)
    return () => window.clearInterval(id)
  }, [state, playSfx])

  useEffect(() => {
    if (state !== 'CLOSING') return
    playSfx('stop')
    after(STOP_BANNER_MS, () => setState('SPINNING'))
  }, [state, after, playSfx])

  useEffect(() => {
    if (state !== 'SPINNING') return
    const target = drawWinningSlot()
    const n = TRACK.length
    const start = Math.floor(Math.random() * n)
    const laps = 4
    const steps = laps * n + ((target - start + n) % n)
    const duration = reducedMotion ? 900 : SPIN_MS
    const t0 = now()
    let lastStep = -1
    let revealFired = reducedMotion

    playSfx('rev', 0.55)

    const frame = () => {
      if (!alive.current) return
      const t = Math.min(1, (now() - t0) / duration)
      const step = Math.floor(SPIN_EASE(t) * steps)
      if (step !== lastStep) {
        lastStep = step
        const slot = (start + step) % n
        setActiveSlot(slot)
        playSfx('trackTick', 0.18 + 0.48 * (1 - t))
      }
      if (!revealFired && now() - t0 >= duration - REVEAL_LEAD_MS) {
        revealFired = true
        setRevealAnimal(TRACK[target]!)
        playSfx('reveal', 0.85)
      }
      if (t < 1) {
        raf.current = requestAnimationFrame(frame)
        return
      }
      setActiveSlot(target)
      setWinningSlot(target)
      setState('RESULT')
    }
    raf.current = requestAnimationFrame(frame)
    return () => {
      if (raf.current) cancelAnimationFrame(raf.current)
      raf.current = 0
    }
  }, [state, reducedMotion, playSfx])

  useEffect(() => {
    if (state !== 'RESULT' || winningSlot == null) return
    if (settledFor.current === winningSlot) return
    settledFor.current = winningSlot
    const animal = TRACK[winningSlot]!
    playSfx('winner')
    historySeq.current += 1
    const entry = { id: historySeq.current, animal, slot: winningSlot }
    setHistory((h) => [entry, ...h].slice(0, HISTORY_LIMIT))

    after(RESULT_MS, () => {
      const won = calcPayout(betsRef.current, animal)
      setPayout(won)
      setState('PAYOUT')
      if (won > 0) {
        playSfx('coin')
        void Promise.resolve(api.current.credit(won)).then(() => api.current.onWalletChange?.())
        const name = ANIMAL_BY_ID.get(animal)?.name ?? animal
        api.current.onToast?.(roundYouWonMessage(won, name), 3000)
      } else if (betsRef.current.size > 0) {
        const totalStaked = [...betsRef.current.values()].reduce((a, b) => a + b, 0)
        playSfx('lose', 0.5)
        api.current.onToast?.(roundLossMessage(totalStaked), 2200)
      }
      after(PAYOUT_MS, () => {
        setLastBets(new Map(betsRef.current))
        setState('RESETTING')
        after(RESET_MS, startRound)
      })
    })
  }, [state, winningSlot, after, playSfx, startRound])

  const flashInsufficient = useCallback(() => {
    setInsufficient(true)
    playSfx('error')
    window.setTimeout(() => alive.current && setInsufficient(false), 2200)
  }, [playSfx])

  const placeBet = useCallback(
    (zone: BetZoneId, value: ChipValue) => {
      if (state !== 'BETTING') return false
      const current = betsRef.current
      if (!current.has(zone) && current.size >= MAX_BET_POSITIONS) {
        playSfx('error')
        api.current.onToast?.(`Max ${MAX_BET_POSITIONS} zones per round`, 2000)
        return false
      }
      if (!api.current.canAfford(value)) {
        flashInsufficient()
        return false
      }
      void Promise.resolve(api.current.debit(value)).then((ok) => {
        if (ok === false) return
        api.current.onWalletChange?.()
      })
      setBets((prev) => {
        const next = new Map(prev)
        next.set(zone, (next.get(zone) ?? 0) + value)
        return next
      })
      const label =
        zone === 'beast' ? 'BEAST' : zone === 'bird' ? 'BIRD' : ANIMAL_BY_ID.get(zone as AnimalId)?.name ?? zone
      api.current.onToast?.(`Bet placed · ${label} ${value}`, 1500)
      return true
    },
    [state, flashInsufficient],
  )

  const rebet = useCallback(() => {
    if (state !== 'BETTING' || lastBets.size === 0) return false
    const merged = new Map(betsRef.current)
    for (const [k, v] of lastBets) merged.set(k, (merged.get(k) ?? 0) + v)
    if (merged.size > MAX_BET_POSITIONS) {
      playSfx('error')
      api.current.onToast?.(`Max ${MAX_BET_POSITIONS} zones per round`, 2000)
      return false
    }
    const total = [...lastBets.values()].reduce((a, b) => a + b, 0)
    if (!api.current.canAfford(total)) {
      flashInsufficient()
      return false
    }
    void Promise.resolve(api.current.debit(total)).then((ok) => {
      if (ok === false) return
      api.current.onWalletChange?.()
    })
    setBets((prev) => {
      const next = new Map(prev)
      for (const [k, v] of lastBets) next.set(k, (next.get(k) ?? 0) + v)
      return next
    })
    playSfx('chip')
    api.current.onToast?.(`Rebet placed · ${total.toLocaleString()}`, 1800)
    return true
  }, [state, lastBets, flashInsufficient, playSfx])

  const statusText =
    state === 'BETTING'
      ? warning
        ? 'CLOSING'
        : 'PLACE YOUR BETS'
      : state === 'CLOSING'
        ? 'BETS CLOSED'
        : state === 'SPINNING'
          ? 'RUNNING'
          : state === 'RESULT' || state === 'PAYOUT'
            ? 'RESULT'
            : 'NEXT ROUND'

  return {
    state,
    statusText,
    countdown,
    warning,
    bettingOpen,
    selectedChip,
    setSelectedChip,
    bets,
    stake,
    lastBets,
    hasLastRound: lastBets.size > 0,
    activeSlot,
    winningSlot,
    winner,
    history,
    payout,
    roundId,
    revealAnimal,
    insufficient,
    loadProgress: assetProgress,
    bettableZones: BETTABLE_ZONES,
    placeBet,
    rebet,
    clearReveal: () => setRevealAnimal(null),
  }
}
