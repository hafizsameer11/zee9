import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { roundLossMessage, roundYouWonMessage } from '../../lib/roundResult'
import {
  BETTING_SECONDS,
  BRAND_BY_ID,
  CAR_LEAD_MS,
  CHIP_VALUES,
  HISTORY_LIMIT,
  PAYOUT_MS,
  RESET_MS,
  RESULT_MS,
  SPIN_MS,
  START_BANNER_MS,
  STOP_BANNER_MS,
  TRACK,
  WARNING_SECONDS,
  type BrandId,
  type ChipValue,
  type GameState,
} from '../constants/gameConfig'
import { SPIN_EASE, drawWinningSlot } from '../utils/track'

export type CarRouletteSfx =
  | 'chip'
  | 'chipSelect'
  | 'whoosh'
  | 'tick'
  | 'countdown'
  | 'start'
  | 'stop'
  | 'trackTick'
  | 'rev'
  | 'pass'
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
  playSfx: (id: CarRouletteSfx, volume?: number) => void
  onToast?: (m: string | null, ms?: number) => void
  onWalletChange?: () => void
}

export type HistoryEntry = { id: number; brand: BrandId; slot: number }

const now = () => performance.now()

export function useCarRoulette(opts: Options) {
  const { assetsReady, assetProgress, reducedMotion } = opts

  /**
   * Host callbacks are re-created on most parent renders. Reading them through
   * a ref keeps the round effects out of the dependency graph, so a round is
   * never scheduled twice.
   */
  const api = useRef(opts)
  api.current = opts

  const playSfx = useCallback((id: CarRouletteSfx, volume?: number) => {
    api.current.playSfx(id, volume)
  }, [])

  const [state, setState] = useState<GameState>('LOADING')
  const [countdown, setCountdown] = useState(BETTING_SECONDS)
  const [selectedChip, setSelectedChip] = useState<ChipValue>(CHIP_VALUES[1])
  const [bets, setBets] = useState<Map<BrandId, number>>(() => new Map())
  const [lastBets, setLastBets] = useState<Map<BrandId, number>>(() => new Map())
  const [activeSlot, setActiveSlot] = useState<number | null>(null)
  const [winningSlot, setWinningSlot] = useState<number | null>(null)
  const [history, setHistory] = useState<HistoryEntry[]>([])
  const [payout, setPayout] = useState(0)
  const [roundId, setRoundId] = useState(() => 100000 + Math.floor(Math.random() * 899999))
  const [carPass, setCarPass] = useState<BrandId | null>(null)
  const [insufficient, setInsufficient] = useState(false)

  const timers = useRef<number[]>([])
  const raf = useRef(0)
  const alive = useRef(true)
  const betsRef = useRef(bets)
  betsRef.current = bets
  const historySeq = useRef(0)
  /** Guards the reveal→payout chain so each drawn slot settles exactly once. */
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

  /* ---------------------------------------------------------------- rounds */

  const startRound = useCallback(() => {
    settledFor.current = null
    setState('NEW_ROUND')
    setBets(new Map())
    setPayout(0)
    setActiveSlot(null)
    setWinningSlot(null)
    setCarPass(null)
    setCountdown(BETTING_SECONDS)
    setRoundId((r) => r + 1)
    playSfx('start')
    after(START_BANNER_MS, () => setState('BETTING'))
  }, [after, playSfx])

  useEffect(() => {
    if (state === 'LOADING' && assetsReady) startRound()
  }, [state, assetsReady, startRound])

  // Betting countdown
  useEffect(() => {
    if (state !== 'BETTING') return
    const id = window.setInterval(() => {
      setCountdown((c) => {
        const next = c - 1
        if (next <= WARNING_SECONDS && next > 0) playSfx('countdown', 0.7)
        else if (next > 0) playSfx('tick', 0.3)
        if (next <= 0) {
          window.clearInterval(id)
          setState('CLOSING')
        }
        return Math.max(0, next)
      })
    }, 1000)
    return () => window.clearInterval(id)
  }, [state, playSfx])

  // Closing banner then the chase
  useEffect(() => {
    if (state !== 'CLOSING') return
    playSfx('stop')
    after(STOP_BANNER_MS, () => setState('SPINNING'))
  }, [state, after, playSfx])

  // Track chase
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
    let carFired = reducedMotion

    playSfx('rev', 0.5)

    const frame = () => {
      if (!alive.current) return
      const t = Math.min(1, (now() - t0) / duration)
      const step = Math.floor(SPIN_EASE(t) * steps)
      if (step !== lastStep) {
        lastStep = step
        const slot = (start + step) % n
        setActiveSlot(slot)
        // Ticks thin out with the chase, so the rhythm slows with the light.
        playSfx('trackTick', 0.16 + 0.5 * (1 - t))
      }
      if (!carFired && now() - t0 >= duration - CAR_LEAD_MS) {
        carFired = true
        setCarPass(TRACK[target]!)
        playSfx('pass', 0.9)
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

  // Winner reveal → payout → reset
  useEffect(() => {
    if (state !== 'RESULT' || winningSlot == null) return
    if (settledFor.current === winningSlot) return
    settledFor.current = winningSlot
    const brand = TRACK[winningSlot]!
    playSfx('winner')
    historySeq.current += 1
    const entry = { id: historySeq.current, brand, slot: winningSlot }
    setHistory((h) => [entry, ...h].slice(0, HISTORY_LIMIT))

    after(RESULT_MS, () => {
      const staked = betsRef.current.get(brand) ?? 0
      const won = staked * (BRAND_BY_ID.get(brand)?.mult ?? 0)
      setPayout(won)
      setState('PAYOUT')
      if (won > 0) {
        playSfx('coin')
        void Promise.resolve(api.current.credit(won)).then(() => api.current.onWalletChange?.())
        const name = BRAND_BY_ID.get(brand)!.name
        api.current.onToast?.(roundYouWonMessage(won, name), 2800)
      } else if (betsRef.current.size > 0) {
        const totalStaked = [...betsRef.current.values()].reduce((a, b) => a + b, 0)
        playSfx('lose', 0.55)
        api.current.onToast?.(roundLossMessage(totalStaked), 2200)
      }
      after(PAYOUT_MS, () => {
        setLastBets(new Map(betsRef.current))
        setState('RESETTING')
        after(RESET_MS, startRound)
      })
    })
  }, [state, winningSlot, after, playSfx, startRound])

  /* ------------------------------------------------------------------ bets */

  const flashInsufficient = useCallback(() => {
    setInsufficient(true)
    playSfx('error')
    window.setTimeout(() => alive.current && setInsufficient(false), 2200)
  }, [playSfx])

  const placeBet = useCallback(
    (brand: BrandId, value: ChipValue) => {
      if (state !== 'BETTING') return false
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
        next.set(brand, (next.get(brand) ?? 0) + value)
        return next
      })
      const name = BRAND_BY_ID.get(brand)?.name ?? brand
      api.current.onToast?.(`Bet placed · ${name} ${value}`, 1600)
      return true
    },
    [state, flashInsufficient],
  )

  const rebet = useCallback(() => {
    if (state !== 'BETTING' || lastBets.size === 0) return false
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
    carPass,
    insufficient,
    loadProgress: assetProgress,
    placeBet,
    rebet,
    clearCarPass: () => setCarPass(null),
  }
}
