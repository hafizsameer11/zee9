import { useCallback, useEffect, useRef, useState } from 'react'
import { getAccess } from '../../../api/client'
import { connectAeroXSocket } from '../../lib/aeroXSocket'
import { ALL_ASSETS, BOOT_ASSETS } from '../constants/assetManifest'
import {
  LAUNCH_MS,
  RESULT_HOLD_MS,
  WAIT_MS,
  clampBet,
  generateCrashPoint,
  multAt,
  multDiscrete,
  type RoundPhase,
  type SlotPhase,
} from '../constants/gameConfig'

type WalletFns = {
  canAfford: (n: number) => boolean
  debit: (n: number) => boolean
  credit: (n: number) => void
}

type Opts = WalletFns & {
  onMessage?: (msg: string | null) => void
  playSfx?: (id: string) => void
  refresh?: () => Promise<void>
}

export type BetSlot = {
  amount: number
  tab: 'bet' | 'auto'
  phase: SlotPhase
  wager: number
  autoEnabled: boolean
  autoAt: number
  betId?: string | null
  pendingNext: boolean
}

function preload(urls: readonly string[], onProgress?: (pct: number) => void) {
  const unique = [...new Set(urls)]
  return new Promise<void>((resolve) => {
    if (!unique.length) {
      onProgress?.(100)
      resolve()
      return
    }
    let done = 0
    const bump = () => {
      done += 1
      onProgress?.(Math.min(100, Math.round((done / unique.length) * 100)))
      if (done >= unique.length) resolve()
    }
    for (const src of unique) {
      const img = new Image()
      img.decoding = 'async'
      img.onload = bump
      img.onerror = bump
      img.src = src
    }
  })
}

const defaultSlot = (): BetSlot => ({
  amount: 10,
  tab: 'bet',
  phase: 'idle',
  wager: 0,
  autoEnabled: false,
  autoAt: 2,
  betId: null,
  pendingNext: false,
})

type ServerPhase = 'waiting' | 'flying' | 'crashed'

export function useAeroXGame({ canAfford, debit: _debit, credit, onMessage, playSfx, refresh }: Opts) {
  const isLive = typeof window !== 'undefined' && !!getAccess()

  const [phase, setPhase] = useState<RoundPhase>('loading')
  const [loadProgress, setLoadProgress] = useState(0)
  const [mult, setMult] = useState(1)
  const [crashPoint, setCrashPoint] = useState(2)
  const [waitLeft, setWaitLeft] = useState(WAIT_MS)
  const [history, setHistory] = useState<number[]>([])
  const [slots, setSlots] = useState<[BetSlot, BetSlot]>(() => [defaultSlot(), defaultSlot()])
  const [flightStart, setFlightStart] = useState<number | null>(null)
  const [showHelp, setShowHelp] = useState(false)

  const phaseRef = useRef(phase)
  const slotsRef = useRef(slots)
  const crashRef = useRef(crashPoint)
  const multRef = useRef(mult)
  const flightStartRef = useRef<number | null>(null)
  const waitStartRef = useRef(0)
  const rafRef = useRef(0)
  const timers = useRef<number[]>([])
  const playRef = useRef(playSfx)
  const creditRef = useRef(credit)
  const startWaitingRef = useRef<() => void>(() => {})
  const lastMultNotify = useRef(0)
  const prevServerPhase = useRef<ServerPhase | 'idle'>('idle')
  const socketRef = useRef<ReturnType<typeof connectAeroXSocket> | null>(null)
  const busySlots = useRef<[boolean, boolean]>([false, false])
  const refreshRef = useRef(refresh)
  const applyLiveRef = useRef<(state: any) => void>(() => {})
  const placeBetOnServerRef = useRef<(index: 0 | 1) => Promise<boolean>>(async () => false)

  playRef.current = playSfx
  creditRef.current = credit
  refreshRef.current = refresh
  phaseRef.current = phase
  slotsRef.current = slots
  crashRef.current = crashPoint
  multRef.current = mult
  flightStartRef.current = flightStart

  const clearTimers = () => {
    timers.current.forEach((t) => window.clearTimeout(t))
    timers.current = []
  }

  const later = (fn: () => void, ms: number) => {
    const id = window.setTimeout(fn, ms)
    timers.current.push(id)
    return id
  }

  const settleLost = useCallback(() => {
    setSlots((prev) =>
      prev.map((s) =>
        s.phase === 'active' || s.phase === 'pending'
          ? { ...s, phase: 'lost' as SlotPhase, wager: 0, betId: null }
          : s,
      ) as [BetSlot, BetSlot],
    )
  }, [])

  /* -------------------- Demo (local) loop -------------------- */
  const startFlying = useCallback(() => {
    if (rafRef.current) cancelAnimationFrame(rafRef.current)
    const point = generateCrashPoint()
    setCrashPoint(point)
    crashRef.current = point
    setMult(1)
    setPhase('launching')
    phaseRef.current = 'launching'
    playRef.current?.('launch')

    const launchAt = performance.now()
    setFlightStart(launchAt)
    flightStartRef.current = launchAt

    later(() => {
      const flyAt = performance.now()
      setFlightStart(flyAt)
      flightStartRef.current = flyAt
      setPhase('flying')
      phaseRef.current = 'flying'
      setSlots((prev) =>
        prev.map((s) =>
          s.phase === 'pending' ? { ...s, phase: 'active' as SlotPhase } : s,
        ) as [BetSlot, BetSlot],
      )
    }, LAUNCH_MS)

    const tick = (now: number) => {
      if (phaseRef.current === 'launching') {
        rafRef.current = requestAnimationFrame(tick)
        return
      }
      if (phaseRef.current !== 'flying') return

      const start = flightStartRef.current ?? now
      const elapsed = now - start
      const smooth = multAt(elapsed)
      const discrete = multDiscrete(elapsed)
      const cap = crashRef.current

      if (discrete >= cap || smooth >= cap) {
        setMult(cap)
        setPhase('flewAway')
        phaseRef.current = 'flewAway'
        playRef.current?.('flewAway')
        settleLost()
        setHistory((h) => [cap, ...h].slice(0, 18))
        later(() => startWaitingRef.current(), RESULT_HOLD_MS)
        return
      }

      if (now - lastMultNotify.current > 80) {
        lastMultNotify.current = now
        setMult(discrete)
      }

      setSlots((prev) => {
        let changed = false
        const next = prev.map((s) => {
          if (s.phase !== 'active' || !s.autoEnabled) return s
          if (discrete >= s.autoAt) {
            changed = true
            const win = Math.floor(s.wager * discrete * 100) / 100
            creditRef.current(win)
            playRef.current?.('cashout')
            return { ...s, phase: 'cashed' as SlotPhase, wager: 0 }
          }
          return s
        }) as [BetSlot, BetSlot]
        return changed ? next : prev
      })

      rafRef.current = requestAnimationFrame(tick)
    }
    rafRef.current = requestAnimationFrame(tick)
  }, [settleLost])

  const startWaiting = useCallback(() => {
    if (rafRef.current) cancelAnimationFrame(rafRef.current)
    clearTimers()
    setPhase('waiting')
    phaseRef.current = 'waiting'
    setMult(1)
    setFlightStart(null)
    flightStartRef.current = null
    waitStartRef.current = performance.now()
    setWaitLeft(WAIT_MS)
    playRef.current?.('countdown')

    setSlots((prev) =>
      prev.map((s) =>
        s.phase === 'lost' || s.phase === 'cashed' ? { ...s, phase: 'idle' as SlotPhase } : s,
      ) as [BetSlot, BetSlot],
    )

    const waitTick = () => {
      if (phaseRef.current !== 'waiting') return
      const left = Math.max(0, WAIT_MS - (performance.now() - waitStartRef.current))
      setWaitLeft(left)
      if (left <= 0) {
        startFlying()
        return
      }
      rafRef.current = requestAnimationFrame(waitTick)
    }
    rafRef.current = requestAnimationFrame(waitTick)
  }, [startFlying])

  startWaitingRef.current = startWaiting

  /* -------------------- Live (server) -------------------- */
  const applyLiveState = useCallback(
    (state: any) => {
      const nextPhase = state.phase as ServerPhase
      setWaitLeft(Math.max(0, state.waitingMsLeft ?? 0))

      if (Array.isArray(state.history)) setHistory(state.history)

      setSlots((prev) => {
        const next = [...prev] as [BetSlot, BetSlot]
        for (const slot of [0, 1] as const) {
          const mine = Array.isArray(state.myBets)
            ? state.myBets.find((b: any) => b.slot === slot)
            : null
          if (mine) {
            let sp: SlotPhase = 'pending'
            if (mine.state === 'CASHED_OUT') sp = 'cashed'
            else if (mine.state === 'BUST') sp = 'lost'
            else if (nextPhase === 'flying') sp = 'active'
            else sp = 'pending'
            next[slot] = {
              ...next[slot],
              phase: sp,
              wager: mine.bet,
              betId: mine.id,
              autoAt: mine.autoAt ?? next[slot].autoAt,
              autoEnabled: mine.autoAt != null ? true : next[slot].autoEnabled,
            }
          } else if (nextPhase === 'waiting') {
            if (next[slot].phase !== 'idle') {
              next[slot] = { ...next[slot], phase: 'idle', wager: 0, betId: null }
            }
          }
        }
        return next
      })

      if (nextPhase === 'flying') {
        setCrashPoint(100)
        crashRef.current = 100
        setMult(state.multiplier ?? 1)
        if (prevServerPhase.current !== 'flying' || flightStartRef.current == null) {
          const serverNow = state.serverTime ? Date.parse(state.serverTime) : Date.now()
          const clockOffset = Date.now() - serverNow
          const startWall = state.startedAt ? Date.parse(state.startedAt) : Date.now()
          const elapsedAlready = Math.max(0, Date.now() - clockOffset - startWall)
          const perfStart = performance.now() - elapsedAlready
          flightStartRef.current = perfStart
          setFlightStart(perfStart)
          setPhase('flying')
          phaseRef.current = 'flying'
          if (prevServerPhase.current === 'waiting') playRef.current?.('launch')
        } else {
          setPhase('flying')
          phaseRef.current = 'flying'
        }
      } else if (nextPhase === 'crashed') {
        const cap = state.crashPoint ?? state.multiplier ?? 1
        setCrashPoint(cap)
        crashRef.current = cap
        setMult(cap)
        flightStartRef.current = null
        setFlightStart(null)
        setPhase('flewAway')
        phaseRef.current = 'flewAway'
        if (prevServerPhase.current === 'flying') {
          playRef.current?.('flewAway')
          void refreshRef.current?.()
        }
      } else {
        setMult(1)
        setCrashPoint(2)
        crashRef.current = 2
        flightStartRef.current = null
        setFlightStart(null)
        setPhase('waiting')
        phaseRef.current = 'waiting'
        if (prevServerPhase.current !== 'waiting' && prevServerPhase.current !== 'idle') {
          playRef.current?.('countdown')
          void refreshRef.current?.()

          const pendingIndexes = slotsRef.current
            .map((slot, i) => (slot.pendingNext ? i : -1))
            .filter((i): i is 0 | 1 => i === 0 || i === 1)
          if (pendingIndexes.length) {
            setSlots((prev) =>
              prev.map((slot) => ({ ...slot, pendingNext: false })) as [BetSlot, BetSlot],
            )
            later(() => {
              void (async () => {
                for (const i of pendingIndexes) await placeBetOnServerRef.current(i)
              })()
            }, 80)
          }
        }
      }

      prevServerPhase.current = nextPhase
    },
    [],
  )
  applyLiveRef.current = applyLiveState

  useEffect(() => {
    let alive = true
    ;(async () => {
      await preload(BOOT_ASSETS, (p) => alive && setLoadProgress(Math.min(90, p)))
      await preload(ALL_ASSETS, (p) => alive && setLoadProgress(Math.min(99, p)))
      if (!alive) return
      setLoadProgress(100)

      if (!isLive) {
        onMessage?.('Not authenticated')
        return
      }

      later(() => {
        if (!alive) return
        const sock = connectAeroXSocket({
          onState: (s) => applyLiveRef.current(s),
          onError: (message) => onMessage?.(message),
        })
        socketRef.current = sock
      }, 350)
    })()
    return () => {
      alive = false
      clearTimers()
      if (rafRef.current) cancelAnimationFrame(rafRef.current)
      socketRef.current?.close()
      socketRef.current = null
    }
  }, [isLive, onMessage])

  const setAmount = useCallback((index: 0 | 1, amount: number) => {
    setSlots((prev) => {
      const next = [...prev] as [BetSlot, BetSlot]
      next[index] = { ...next[index], amount: clampBet(amount) }
      return next
    })
  }, [])

  const setTab = useCallback((index: 0 | 1, tab: 'bet' | 'auto') => {
    setSlots((prev) => {
      const next = [...prev] as [BetSlot, BetSlot]
      next[index] = {
        ...next[index],
        tab,
        autoEnabled: tab === 'auto' ? true : false,
      }
      return next
    })
  }, [])

  const setAuto = useCallback((index: 0 | 1, autoEnabled: boolean, autoAt?: number) => {
    setSlots((prev) => {
      const next = [...prev] as [BetSlot, BetSlot]
      next[index] = {
        ...next[index],
        autoEnabled,
        autoAt: autoAt ?? next[index].autoAt,
      }
      return next
    })
  }, [])

  const placeBetOnServer = useCallback(
    async (index: 0 | 1) => {
      if (busySlots.current[index]) return false
      const s = slotsRef.current[index]
      if (s.phase === 'active' || s.phase === 'pending') return false
      if (!canAfford(s.amount)) {
        onMessage?.('Insufficient balance')
        playRef.current?.('error')
        return false
      }
      busySlots.current[index] = true
      try {
        playRef.current?.('bet')
        const sock = socketRef.current
        if (!sock) throw new Error('Not connected')
        const res = await sock.request<{ betId: string }>('bet', {
          amount: s.amount,
          slot: index,
          autoAt: s.autoEnabled || s.tab === 'auto' ? s.autoAt : null,
        })
        setSlots((prev) => {
          const next = [...prev] as [BetSlot, BetSlot]
          next[index] = {
            ...next[index],
            phase: 'pending',
            wager: s.amount,
            betId: res.betId,
            autoEnabled: next[index].tab === 'auto',
            pendingNext: false,
          }
          return next
        })
        onMessage?.(null)
        void refreshRef.current?.()
        socketRef.current?.refresh()
        return true
      } catch (e: any) {
        playRef.current?.('error')
        onMessage?.(e?.message || 'Bet failed')
        return false
      } finally {
        busySlots.current[index] = false
      }
    },
    [canAfford, onMessage],
  )
  placeBetOnServerRef.current = placeBetOnServer

  const placeOrCashLive = useCallback(
    async (index: 0 | 1) => {
      const s = slotsRef.current[index]
      const p = phaseRef.current

      if (s.phase === 'active' && p === 'flying' && s.betId) {
        if (busySlots.current[index]) return
        busySlots.current[index] = true
        const betId = s.betId
        const atMult = multRef.current
        const est = Math.floor(s.wager * atMult * 100) / 100
        onMessage?.(`Cashing out ${est.toFixed(2)}…`)
        try {
          const sock = socketRef.current
          if (!sock) throw new Error('Not connected')
          const out = await sock.request<{ payout: number }>('cashout', { betId })
          setSlots((prev) => {
            const next = [...prev] as [BetSlot, BetSlot]
            next[index] = { ...next[index], phase: 'cashed', wager: 0 }
            return next
          })
          playRef.current?.('cashout')
          onMessage?.(`Cashed out ${Number(out.payout).toFixed(2)}`)
          void refreshRef.current?.()
          socketRef.current?.refresh()
        } catch (e: any) {
          playRef.current?.('error')
          onMessage?.(e?.message || 'Cash out failed')
          socketRef.current?.refresh()
        } finally {
          busySlots.current[index] = false
        }
        return
      }

      if (s.pendingNext) {
        setSlots((prev) => {
          const next = [...prev] as [BetSlot, BetSlot]
          next[index] = { ...next[index], pendingNext: false }
          return next
        })
        onMessage?.(null)
        return
      }

      if (s.phase === 'pending') {
        onMessage?.('Bet locked for this round')
        return
      }

      if (s.phase === 'active') return

      if (p === 'waiting' || p === 'loading') {
        await placeBetOnServer(index)
        return
      }

      // Flying / flew away — queue for next round (like Aviator)
      if (!canAfford(s.amount)) {
        onMessage?.('Insufficient balance')
        playRef.current?.('error')
        return
      }
      playRef.current?.('bet')
      setSlots((prev) => {
        const next = [...prev] as [BetSlot, BetSlot]
        next[index] = { ...next[index], pendingNext: true }
        return next
      })
      onMessage?.('Bet queued for next round')
      window.setTimeout(() => onMessage?.(null), 1800)
    },
    [canAfford, onMessage, placeBetOnServer],
  )

  const placeOrCash = useCallback(
    (index: 0 | 1) => {
      if (!isLive) {
        onMessage?.('Not authenticated')
        return
      }
      void placeOrCashLive(index)
    },
    [isLive, onMessage, placeOrCashLive],
  )

  const waitProgress = phase === 'waiting' ? 1 - waitLeft / WAIT_MS : 0

  return {
    phase,
    loadProgress,
    mult,
    crashPoint,
    waitLeft,
    waitProgress,
    history,
    slots,
    flightStart,
    showHelp,
    setShowHelp,
    setAmount,
    setTab,
    setAuto,
    placeOrCash,
    isLive,
  }
}
