import { useCallback, useEffect, useRef, useState } from 'react'
import { getAccess } from '../../../api/client'
import { connectDoubleCrashSocket } from '../../lib/doubleCrashSocket'
import { ALL_ASSETS, AVATARS, BOOT_ASSETS } from '../constants/assetManifest'
import {
  FAKE_NAMES,
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
  phase: SlotPhase
  wager: number
  autoBet: boolean
  autoEscape: boolean
  autoAt: number
  betId?: string | null
  queuedNext?: boolean
}

export type LivePlayer = {
  id: string
  name: string
  avatar: string
  bet: number
  mult: number | null
  cashOut: number | null
  isMe?: boolean
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
  phase: 'idle',
  wager: 0,
  autoBet: false,
  autoEscape: false,
  autoAt: 2,
  betId: null,
})

function seedPlayers(): LivePlayer[] {
  return FAKE_NAMES.slice(0, 8).map((name, i) => ({
    id: `p-${i}`,
    name,
    avatar: AVATARS[i % AVATARS.length],
    bet: [500, 1000, 200, 1500, 800, 300, 1200, 600][i],
    mult: null,
    cashOut: null,
  }))
}

type ServerPhase = 'waiting' | 'flying' | 'crashed'

export function useAeroXGame({ canAfford, debit, credit, onMessage, playSfx, refresh }: Opts) {
  const isLive = typeof window !== 'undefined' && !!getAccess()

  const [phase, setPhase] = useState<RoundPhase>('loading')
  const [loadProgress, setLoadProgress] = useState(0)
  const [mult, setMult] = useState(1)
  const [crashPoint, setCrashPoint] = useState(2)
  const [waitLeft, setWaitLeft] = useState(WAIT_MS)
  const [history, setHistory] = useState<number[]>([])
  const [slots, setSlots] = useState<[BetSlot, BetSlot]>(() => [defaultSlot(), defaultSlot()])
  const [flightStart, setFlightStart] = useState<number | null>(null)
  const [players, setPlayers] = useState<LivePlayer[]>(seedPlayers)
  const [showHelp, setShowHelp] = useState(false)
  const [showTrend, setShowTrend] = useState(false)
  const [showSettings, setShowSettings] = useState(false)
  const [showQuest, setShowQuest] = useState(false)
  const [musicOn, setMusicOn] = useState(true)
  const [vibrateOn, setVibrateOn] = useState(false)
  const [cashBadges, setCashBadges] = useState<
    { id: number; slot: 0 | 1; mult: number; amount: number }[]
  >([])
  const badgeId = useRef(0)

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
  const debitRef = useRef(debit)
  const canAffordRef = useRef(canAfford)
  const startWaitingRef = useRef<() => void>(() => {})
  const lastMultNotify = useRef(0)
  const cashedNames = useRef<Set<string>>(new Set())
  const prevServerPhase = useRef<ServerPhase | 'idle'>('idle')
  const socketRef = useRef<ReturnType<typeof connectDoubleCrashSocket> | null>(null)
  const busySlots = useRef<[boolean, boolean]>([false, false])
  const refreshRef = useRef(refresh)
  const placeOrCashLiveRef = useRef<(index: 0 | 1) => Promise<void>>(async () => {})
  const applyLiveRef = useRef<(state: any) => void>(() => {})

  playRef.current = playSfx
  creditRef.current = credit
  debitRef.current = debit
  canAffordRef.current = canAfford
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

  const pushBadge = (slot: 0 | 1, m: number, amount: number) => {
    const id = ++badgeId.current
    setCashBadges((b) => {
      if (b.some((x) => x.slot === slot && Math.abs(x.amount - amount) < 0.01)) return b
      return [...b, { id, slot, mult: m, amount }].slice(-4)
    })
    later(() => setCashBadges((b) => b.filter((x) => x.id !== id)), 2400)
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

  const autoPlaceIfNeeded = useCallback(() => {
    setSlots((prev) => {
      let next = [...prev] as [BetSlot, BetSlot]
      let changed = false
      next = next.map((s) => {
        if (!s.autoBet || s.phase !== 'idle') return s
        if (!canAffordRef.current(s.amount)) return s
        if (!debitRef.current(s.amount)) return s
        changed = true
        playRef.current?.('bet')
        return { ...s, phase: 'pending' as SlotPhase, wager: s.amount }
      }) as [BetSlot, BetSlot]
      return changed ? next : prev
    })
  }, [])

  const startFlying = useCallback(() => {
    if (rafRef.current) cancelAnimationFrame(rafRef.current)
    const point = generateCrashPoint()
    setCrashPoint(point)
    crashRef.current = point
    setMult(1)
    setPhase('launching')
    phaseRef.current = 'launching'
    playRef.current?.('launch')
    cashedNames.current = new Set()

    setPlayers((prev) =>
      prev.map((p, i) => ({
        ...p,
        bet: [200, 500, 1000, 800, 1500, 300, 1200, 600][i % 8] + Math.floor(Math.random() * 200),
        mult: null,
        cashOut: null,
      })),
    )

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
        setHistory((h) => [cap, ...h].slice(0, 24))
        later(() => startWaitingRef.current(), RESULT_HOLD_MS)
        return
      }

      if (now - lastMultNotify.current > 80) {
        lastMultNotify.current = now
        setMult(discrete)
      }

      setPlayers((prev) => {
        let changed = false
        const next = prev.map((p) => {
          if (p.cashOut != null) return p
          const target = 1.2 + (parseInt(p.id.replace(/\D/g, '') || '0', 10) % 7) * 0.55
          if (discrete >= target && !cashedNames.current.has(p.id)) {
            cashedNames.current.add(p.id)
            changed = true
            const win = Math.floor(p.bet * target)
            return { ...p, mult: Math.floor(target * 100) / 100, cashOut: win }
          }
          return p
        })
        return changed ? next : prev
      })

      setSlots((prev) => {
        let changed = false
        const next = prev.map((s, idx) => {
          if (s.phase !== 'active' || !s.autoEscape) return s
          if (discrete >= s.autoAt) {
            changed = true
            const win = Math.floor(s.wager * discrete * 100) / 100
            creditRef.current(win)
            playRef.current?.('cashout')
            const slotIndex = (idx === 1 ? 1 : 0) as 0 | 1
            pushBadge(slotIndex, discrete, win)
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

    later(() => autoPlaceIfNeeded(), 200)

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
  }, [autoPlaceIfNeeded, startFlying])

  startWaitingRef.current = startWaiting

  const applyLiveState = useCallback((state: any) => {
    const nextPhase = state.phase as ServerPhase
    setWaitLeft(Math.max(0, state.waitingMsLeft ?? 0))
    if (Array.isArray(state.history)) setHistory(state.history)

    if (Array.isArray(state.liveBets)) {
      setPlayers(
        state.liveBets.slice(0, 12).map((b: any, i: number) => ({
          id: b.id || `lb-${i}`,
          name: b.name || `P${i}`,
          avatar: AVATARS[i % AVATARS.length],
          bet: b.bet ?? 0,
          mult: b.cashoutAt,
          cashOut: b.cashout,
          isMe: !!b.isMe,
        })),
      )
    }

    const badgeQueue: { slot: 0 | 1; mult: number; amount: number }[] = []
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
          const wasActive = prev[slot].phase === 'active'
          if (sp === 'cashed' && wasActive && mine.cashoutAt && mine.payout) {
            badgeQueue.push({ slot, mult: mine.cashoutAt, amount: mine.payout })
          }
          next[slot] = {
            ...next[slot],
            phase: sp,
            wager: mine.bet,
            betId: mine.id,
            autoAt: mine.autoAt ?? next[slot].autoAt,
            autoEscape: mine.autoAt != null ? true : next[slot].autoEscape,
          }
        } else if (nextPhase === 'waiting' && next[slot].phase !== 'idle') {
          next[slot] = { ...next[slot], phase: 'idle', wager: 0, betId: null }
        }
      }
      return next
    })
    for (const b of badgeQueue) pushBadge(b.slot, b.mult, b.amount)

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
        if (prevServerPhase.current === 'waiting') playRef.current?.('launch')
      }
      setPhase('flying')
      phaseRef.current = 'flying'
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
        const queued = slotsRef.current
          .map((s, i) => (s.queuedNext ? (i as 0 | 1) : null))
          .filter((i): i is 0 | 1 => i != null)
        if (queued.length) {
          setSlots((prev) =>
            prev.map((s) => ({ ...s, queuedNext: false })) as [BetSlot, BetSlot],
          )
          window.setTimeout(() => {
            void (async () => {
              for (const i of queued) await placeOrCashLiveRef.current(i)
            })()
          }, 80)
        }
      }
    }

    prevServerPhase.current = nextPhase
  }, [])
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
        const sock = connectDoubleCrashSocket({
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

  const setAutoBet = useCallback((index: 0 | 1, on: boolean) => {
    setSlots((prev) => {
      const next = [...prev] as [BetSlot, BetSlot]
      next[index] = { ...next[index], autoBet: on }
      return next
    })
  }, [])

  const setAutoEscape = useCallback((index: 0 | 1, on: boolean, autoAt?: number) => {
    setSlots((prev) => {
      const next = [...prev] as [BetSlot, BetSlot]
      next[index] = {
        ...next[index],
        autoEscape: on,
        autoAt: autoAt ?? next[index].autoAt,
      }
      return next
    })
  }, [])

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
          const res = await sock.request<{ payout: number; cashoutAt: number }>('cashout', {
            betId,
          })
          setSlots((prev) => {
            const next = [...prev] as [BetSlot, BetSlot]
            next[index] = { ...next[index], phase: 'cashed', wager: 0 }
            return next
          })
          playRef.current?.('cashout')
          pushBadge(index, Number(res.cashoutAt), Number(res.payout))
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

      if (s.phase === 'pending' && s.betId) {
        onMessage?.('Bet locked for this round')
        return
      }

      if (s.queuedNext) {
        setSlots((prev) => {
          const next = [...prev] as [BetSlot, BetSlot]
          next[index] = { ...next[index], queuedNext: false }
          return next
        })
        onMessage?.(null)
        return
      }

      if (p !== 'waiting' && p !== 'loading') {
        if (!canAfford(s.amount)) {
          onMessage?.('Insufficient balance')
          playRef.current?.('error')
          return
        }
        playRef.current?.('bet')
        setSlots((prev) => {
          const next = [...prev] as [BetSlot, BetSlot]
          next[index] = { ...next[index], queuedNext: true }
          return next
        })
        onMessage?.('Bet queued for next round')
        return
      }

      if (!canAfford(s.amount)) {
        onMessage?.('Insufficient balance')
        playRef.current?.('error')
        return
      }
      if (busySlots.current[index]) return
      busySlots.current[index] = true
      try {
        playRef.current?.('bet')
        const sock = socketRef.current
        if (!sock) throw new Error('Not connected')
        const res = await sock.request<{ betId: string }>('bet', {
          amount: s.amount,
          slot: index,
          autoAt: s.autoEscape ? s.autoAt : null,
        })
        setSlots((prev) => {
          const next = [...prev] as [BetSlot, BetSlot]
          next[index] = {
            ...next[index],
            phase: 'pending',
            wager: s.amount,
            betId: res.betId,
            queuedNext: false,
          }
          return next
        })
        void refreshRef.current?.()
        socketRef.current?.refresh()
      } catch (e: any) {
        playRef.current?.('error')
        onMessage?.(e?.message || 'Bet failed')
      } finally {
        busySlots.current[index] = false
      }
    },
    [canAfford, onMessage],
  )
  placeOrCashLiveRef.current = placeOrCashLive

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

  // Live auto-bet: place via socket once per waiting round when autoBet is on
  const autoBetRoundRef = useRef<string | null>(null)
  useEffect(() => {
    if (!isLive || phase !== 'waiting') {
      if (phase !== 'waiting') autoBetRoundRef.current = null
      return
    }
    const key = `wait-${slots[0].betId ?? ''}-${slots[1].betId ?? ''}-${phase}`
    for (const slot of [0, 1] as const) {
      const s = slots[slot]
      if (!s.autoBet || s.phase !== 'idle') continue
      if (!canAfford(s.amount)) continue
      const mark = `${key}:${slot}`
      if (autoBetRoundRef.current === mark) continue
      autoBetRoundRef.current = mark
      void placeOrCashLive(slot)
    }
  }, [isLive, phase, slots, canAfford, placeOrCashLive])

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
    players,
    showHelp,
    setShowHelp,
    showTrend,
    setShowTrend,
    showSettings,
    setShowSettings,
    showQuest,
    setShowQuest,
    musicOn,
    setMusicOn,
    vibrateOn,
    setVibrateOn,
    setAmount,
    setAutoBet,
    setAutoEscape,
    placeOrCash,
    cashBadges,
    isLive,
  }
}
