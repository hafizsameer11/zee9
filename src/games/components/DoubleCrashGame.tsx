import { useCallback, useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useWallet } from '../../context/WalletContext'
import { generateCrashPoint, multiplierAtElapsed } from '../engines/crash'
import { useDesignScale } from '../hooks/useDesignScale'
import type { GameComponentProps } from '../types'
import DoubleCrashDesignUI from './DoubleCrashDesignUI'
import styles from './doubleCrashGame.module.css'

type GlobalPhase = 'idle' | 'flying' | 'cooldown'
type SlotPhase = 'idle' | 'active' | 'cashed' | 'lost'

type RocketSlot = {
  bet: number
  autoAt: number
  phase: SlotPhase
  wager: number
}

const LIVE_FEED = [
  { initials: 'AK', name: 'Ahmed_K', bet: 500, rocket: 'B' as const, mult: 5.87, status: 'won' as const },
  { initials: 'SN', name: 'Sana92', bet: 200, rocket: 'A' as const, mult: null, status: 'flying' as const },
  { initials: 'BR', name: 'Bilal.R', bet: 1000, rocket: 'both' as const, mult: 2.41, status: 'won' as const },
  { initials: 'ZR', name: 'Zara_R', bet: 300, rocket: 'B' as const, mult: null, status: 'flying' as const },
  { initials: 'HM', name: 'Hamza_M', bet: 150, rocket: 'A' as const, mult: 1.98, status: 'won' as const },
]

export default function DoubleCrashGame({ bet: defaultBet, onMessage }: GameComponentProps) {
  const navigate = useNavigate()
  const viewportRef = useRef<HTMLDivElement>(null)
  const layout = useDesignScale(viewportRef)
  const { balance, debit, credit, canAfford } = useWallet()

  const [globalPhase, setGlobalPhase] = useState<GlobalPhase>('idle')
  const [mult, setMult] = useState(1)
  const [slots, setSlots] = useState<RocketSlot[]>([
    { bet: defaultBet, autoAt: 2, phase: 'idle', wager: 0 },
    { bet: Math.min(defaultBet * 2.5, 500), autoAt: 5, phase: 'idle', wager: 0 },
  ])
  const [history, setHistory] = useState<number[]>([1.02, 3.44, 12.8, 1.31, 2.07, 4.6, 1.09, 8.15, 2.9])
  const [roundNo, setRoundNo] = useState(89231)
  const [rocketCrashed, setRocketCrashed] = useState<[boolean, boolean]>([false, false])

  const crashPoints = useRef<[number, number]>([1, 1])
  const startTime = useRef(0)
  const raf = useRef(0)
  const slotsRef = useRef(slots)
  const crashedRef = useRef<[boolean, boolean]>([false, false])
  slotsRef.current = slots
  crashedRef.current = rocketCrashed

  const stopLoop = useCallback(() => {
    if (raf.current) cancelAnimationFrame(raf.current)
  }, [])

  const resetRound = useCallback(() => {
    setSlots((s) => s.map((slot) => ({ ...slot, phase: 'idle', wager: 0 })))
    setGlobalPhase('idle')
    setMult(1)
    setRocketCrashed([false, false])
    crashedRef.current = [false, false]
  }, [])

  const endRound = useCallback(() => {
    stopLoop()
    const [a, b] = crashPoints.current
    const peak = Math.max(a, b)
    setHistory((h) => [peak, ...h].slice(0, 12))
    setGlobalPhase('cooldown')
    setTimeout(resetRound, 2200)
  }, [resetRound, stopLoop])

  const cashOutSlot = useCallback(
    (index: number, atMult: number) => {
      const slot = slotsRef.current[index]
      if (slot.phase !== 'active') return
      const win = Math.round(slot.wager * atMult * 100) / 100
      credit(win)
      setSlots((s) => {
        const next = [...s]
        next[index] = { ...next[index], phase: 'cashed' }
        return next
      })
      onMessage?.(`🎉 Rocket ${index === 0 ? 'A' : 'B'} · PKR ${win.toLocaleString()}`)
    },
    [credit, onMessage],
  )

  const tick = useCallback(() => {
    const elapsed = Date.now() - startTime.current
    const m = multiplierAtElapsed(elapsed)
    setMult(m)

    const crashed = [...crashedRef.current] as [boolean, boolean]
    let changed = false

    slotsRef.current.forEach((slot, i) => {
      const cp = crashPoints.current[i]
      if (slot.phase === 'active' && !crashed[i]) {
        if (slot.autoAt > 0 && m >= slot.autoAt) {
          cashOutSlot(i, m)
        } else if (m >= cp) {
          crashed[i] = true
          changed = true
          setSlots((s) => {
            const next = [...s]
            if (next[i].phase === 'active') next[i] = { ...next[i], phase: 'lost' }
            return next
          })
        }
      }
    })

    if (changed) {
      crashedRef.current = crashed
      setRocketCrashed(crashed)
    }

    if (!slotsRef.current.some((s) => s.phase === 'active')) {
      endRound()
      return
    }

    raf.current = requestAnimationFrame(tick)
  }, [cashOutSlot, endRound])

  const startFlying = useCallback(() => {
    crashPoints.current = [generateCrashPoint(), generateCrashPoint()]
    startTime.current = Date.now()
    setMult(1)
    setRocketCrashed([false, false])
    crashedRef.current = [false, false]
    setGlobalPhase('flying')
    setRoundNo((n) => n + 1)
    onMessage?.(null)
    raf.current = requestAnimationFrame(tick)
  }, [onMessage, tick])

  const placeBoth = useCallback(() => {
    if (globalPhase === 'flying' || globalPhase === 'cooldown') return
    const idleSlots = slots
      .map((s, i) => ({ s, i }))
      .filter(({ s }) => s.phase === 'idle')
    if (!idleSlots.length) return
    const total = idleSlots.reduce((sum, { s }) => sum + s.bet, 0)
    if (!canAfford(total)) {
      onMessage?.('Insufficient balance')
      return
    }
    const next = [...slots]
    for (const { s, i } of idleSlots) {
      if (!debit(s.bet)) return
      next[i] = { ...next[i], phase: 'active', wager: s.bet }
    }
    setSlots(next)
    if (globalPhase === 'idle') startFlying()
  }, [canAfford, debit, globalPhase, onMessage, slots, startFlying])

  const manualCashOut = (index: number) => {
    if (globalPhase !== 'flying' || rocketCrashed[index]) return
    cashOutSlot(index, mult)
  }

  const updateSlot = (index: number, patch: Partial<RocketSlot>) => {
    if (globalPhase === 'flying') return
    setSlots((s) => {
      const next = [...s]
      next[index] = { ...next[index], ...patch }
      return next
    })
  }

  const setBothBets = (amount: number) => {
    if (globalPhase === 'flying') return
    setSlots((s) => s.map((slot) => ({ ...slot, bet: amount })))
  }

  const displayMult = (index: number) => {
    if (globalPhase === 'idle') return 1
    const cp = crashPoints.current[index]
    if (rocketCrashed[index]) return cp
    return Math.min(mult, cp)
  }

  useEffect(() => () => stopLoop(), [stopLoop])

  const flying = globalPhase === 'flying'
  const totalStake = slots.reduce((s, slot) => s + (slot.phase === 'active' ? slot.wager : 0), 0)
  const potentialWin = slots.reduce((s, slot, i) => {
    if (slot.phase !== 'active') return s
    return s + slot.wager * displayMult(i)
  }, 0)
  const placeBothTotal = slots.filter((s) => s.phase === 'idle').reduce((sum, s) => sum + s.bet, 0)

  return (
    <DoubleCrashDesignUI
      viewportRef={viewportRef}
      layout={layout}
      rootClassName={styles.root}
      canvasClassName={styles.canvas}
      balance={balance}
      slots={slots}
      displayMultA={displayMult(0)}
      displayMultB={displayMult(1)}
      flying={flying}
      rocketCrashed={rocketCrashed}
      history={history}
      roundNo={roundNo}
      liveFeed={LIVE_FEED}
      totalStake={totalStake}
      potentialWin={potentialWin}
      placeBothTotal={placeBothTotal}
      onPlaceBoth={placeBoth}
      onCashOut={manualCashOut}
      onUpdateSlot={updateSlot}
      onQuickStake={setBothBets}
      onHome={() => navigate('/home')}
    />
  )
}
