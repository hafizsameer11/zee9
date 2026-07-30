import { useCallback, useEffect, useRef, useState } from 'react'
import { type RoundPhase, BET_SECONDS, randomResult } from '../engines/wingoLottery'

type Opts = {
  enabled?: boolean
  onResult: (n: number) => void
  onBettingOpen?: () => void
  allowPreview?: boolean
}

/** Timings tuned to the attached S9 ball-machine video (~29s round clip). */
const HOLDS: Partial<Record<RoundPhase, number>> = {
  BETTING_CLOSING: 120,
  STOP_BETTING: 1400, // enter+hold+exit ~350+800+250
  MACHINE_ENTERING: 700,
  BALLS_MIXING: 5600,
  BALL_SELECTED: 900,
  RESULT_REVEAL: 1200,
  RESULT_TO_HISTORY: 750,
  SETTLEMENT: 2200,
  START_BETTING: 1000,
  ROUND_RESET: 200,
}

/**
 * Central round-animation controller.
 * Engine/backend result is chosen before visuals; ball motion never decides the winner.
 */
export function useWingoLotteryPhases({ enabled = true, onResult, onBettingOpen, allowPreview = false }: Opts) {
  const [phase, setPhase] = useState<RoundPhase>('BETTING_OPEN')
  const [seconds, setSeconds] = useState(BET_SECONDS)
  const [result, setResult] = useState<number | null>(null)
  const timers = useRef<number[]>([])
  const running = useRef(false)
  const resultRef = useRef<number | null>(null)
  const onResultRef = useRef(onResult)
  const onOpenRef = useRef(onBettingOpen)
  onResultRef.current = onResult
  onOpenRef.current = onBettingOpen

  const clearTimers = () => {
    for (const t of timers.current) window.clearTimeout(t)
    timers.current = []
    running.current = false
  }

  const after = useCallback((ms: number, fn: () => void) => {
    const id = window.setTimeout(fn, ms)
    timers.current.push(id)
  }, [])

  const runCloseSequence = useCallback(
    (forced?: number) => {
      if (running.current) return
      running.current = true
      clearTimers()
      running.current = true
      const n = forced ?? randomResult()
      resultRef.current = n
      setResult(n)
      setPhase('BETTING_CLOSING')
      setSeconds(0)

      const chain: RoundPhase[] = [
        'STOP_BETTING',
        'MACHINE_ENTERING',
        'BALLS_MIXING',
        'BALL_SELECTED',
        'RESULT_REVEAL',
        'RESULT_TO_HISTORY',
        'SETTLEMENT',
        'START_BETTING',
        'ROUND_RESET',
      ]

      let delay = HOLDS.BETTING_CLOSING ?? 120
      for (const p of chain) {
        const hold = HOLDS[p] ?? 800
        const at = delay
        after(at, () => {
          setPhase(p)
          if (p === 'BALLS_MIXING') onResultRef.current(n)
          if (p === 'ROUND_RESET') {
            setResult(null)
            resultRef.current = null
            setSeconds(BET_SECONDS)
            setPhase('BETTING_OPEN')
            running.current = false
            onOpenRef.current?.()
          }
        })
        delay += hold
      }
    },
    [after],
  )

  useEffect(() => {
    if (!enabled) return
    if (phase !== 'BETTING_OPEN') return

    const tick = window.setInterval(() => {
      setSeconds((s) => {
        if (s <= 1) {
          window.clearInterval(tick)
          runCloseSequence()
          return 0
        }
        return s - 1
      })
    }, 1000)

    return () => window.clearInterval(tick)
  }, [phase, enabled, runCloseSequence])

  useEffect(() => () => clearTimers(), [])

  const jumpPhase = useCallback(
    (p: RoundPhase | 'FULL_ROUND' | 'CHIP_BURST') => {
      if (!allowPreview) return
      if (p === 'FULL_ROUND') {
        running.current = false
        runCloseSequence(7)
        return
      }
      if (p === 'CHIP_BURST') {
        setPhase('BETTING_OPEN')
        return
      }
      clearTimers()
      if (p === 'BETTING_OPEN') {
        setResult(null)
        setSeconds(BET_SECONDS)
        setPhase('BETTING_OPEN')
        return
      }
      if (resultRef.current == null) {
        const n = 7
        resultRef.current = n
        setResult(n)
      }
      setPhase(p)
    },
    [allowPreview, runCloseSequence],
  )

  const bettingOpen = phase === 'BETTING_OPEN'

  return { phase, seconds, result, bettingOpen, jumpPhase }
}
