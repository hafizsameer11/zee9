import { useCallback, useEffect, useRef, useState } from 'react'
import { roundLossMessage } from '../../lib/roundResult'
import {
  BET_AMOUNTS,
  MULT_SPIN_MS,
  REEL_STAGGER_MS,
  SPIN_MS,
  TURBO_SPIN_MS,
  WHEEL_SPIN_MS,
  WIN_HOLD_MS,
  formatMoney,
} from '../constants/gameConfig'
import {
  MULTIPLIERS,
  SYMBOL_META,
  type Fg2Multiplier,
  type Fg2Symbol,
  type SpecialToken,
} from '../constants/symbolConfig'
import {
  buildReelStrip,
  buildSpecialStrip,
  evaluateSpin,
  spinGrid,
  spinSpecial,
  spinWheelReward,
  type Fg2SpinResult,
} from '../engines/fortuneGems2Engine'
import type { Fg2Sfx } from './useFortuneGems2Sound'
import { isLivePlayer, preconnectSlot, serverSlotSpin } from '../../lib/serverSpin'

export type Fg2Phase =
  | 'idle'
  | 'spinning'
  | 'specialSpin'
  | 'wheelSpin'
  | 'presenting'
  | 'done'

export type Fg2GameApi = {
  canAfford: (n: number) => boolean
  debit: (n: number) => boolean
  credit: (n: number) => void
  getBalance?: () => number
  refresh?: () => Promise<void> | void
  play: (id: Fg2Sfx, volume?: number) => void
  onMessage?: (msg: string | null) => void
}

const VALID_SYMBOLS = new Set(Object.keys(SYMBOL_META) as Fg2Symbol[])

function coerceSymbol(raw: unknown): Fg2Symbol {
  if (typeof raw === 'string' && VALID_SYMBOLS.has(raw as Fg2Symbol)) return raw as Fg2Symbol
  if (raw === 'gem') return 'ruby'
  return 'J'
}

function coerceSpecial(raw: any): SpecialToken {
  if (raw?.kind === 'wheel') {
    return { kind: 'wheel', color: raw.color === 'red' ? 'red' : 'green' }
  }
  const v = Number(raw?.value ?? 2)
  const value = (MULTIPLIERS.includes(v as Fg2Multiplier) ? v : 2) as Fg2Multiplier
  return { kind: 'mult', value }
}

function coerceGrid(raw: unknown): Fg2Symbol[] | null {
  if (!Array.isArray(raw) || raw.length < 9) return null
  return raw.slice(0, 9).map(coerceSymbol)
}

export function useFortuneGems2Game(api: Fg2GameApi) {
  const [phase, setPhase] = useState<Fg2Phase>('idle')
  const [betIndex, setBetIndex] = useState(2)
  const [grid, setGrid] = useState<Fg2Symbol[]>(() => spinGrid())
  const [special, setSpecial] = useState<SpecialToken>(() => spinSpecial())
  const [strips, setStrips] = useState(() => [buildReelStrip(), buildReelStrip(), buildReelStrip()] as const)
  const [specialStrip, setSpecialStrip] = useState(() => buildSpecialStrip())
  const [stoppingReels, setStoppingReels] = useState<boolean[]>([false, false, false])
  const [specialStopping, setSpecialStopping] = useState(false)
  const [wheelAngle, setWheelAngle] = useState(0)
  const [wheelSpinning, setWheelSpinning] = useState(false)
  const [wheelReward, setWheelReward] = useState(0)
  const [result, setResult] = useState<Fg2SpinResult | null>(null)
  const [winCells, setWinCells] = useState<Set<number>>(new Set())
  const [lastWin, setLastWin] = useState(0)
  const [displayWin, setDisplayWin] = useState(0)
  const [banner, setBanner] = useState('Win multiplier points')
  const [turbo, setTurbo] = useState(false)
  const [auto, setAuto] = useState(false)
  const [autoLeft, setAutoLeft] = useState(0)
  const [extraBet, setExtraBet] = useState(false)
  const [busy, setBusy] = useState(false)
  /** Live play: mask wallet WS updates until win/loss presentation finishes */
  const [balanceHold, setBalanceHold] = useState<number | null>(null)

  const baseBetAmount = BET_AMOUNTS[betIndex]
  const betAmount = extraBet ? baseBetAmount * 1.5 : baseBetAmount
  const timers = useRef<ReturnType<typeof setTimeout>[]>([])
  const spinningRef = useRef(false)
  const apiRef = useRef(api)
  apiRef.current = api

  const clearTimers = useCallback(() => {
    timers.current.forEach(clearTimeout)
    timers.current = []
  }, [])

  const later = useCallback((fn: () => void, ms: number) => {
    const t = setTimeout(fn, ms)
    timers.current.push(t)
    return t
  }, [])

  useEffect(() => () => clearTimers(), [clearTimers])
  useEffect(() => preconnectSlot('fortune-gems-2'), [])

  const countUp = useCallback((target: number, ms: number) => {
    const start = performance.now()
    const from = 0
    const step = (now: number) => {
      const t = Math.min(1, (now - start) / ms)
      const eased = 1 - Math.pow(1 - t, 3)
      setDisplayWin(Math.round(from + (target - from) * eased))
      if (t < 1) requestAnimationFrame(step)
      else setDisplayWin(target)
    }
    requestAnimationFrame(step)
  }, [])

  const finishRound = useCallback(
    (res: Fg2SpinResult) => {
      const a = apiRef.current
      setResult(res)
      setPhase('presenting')
      const cells = new Set<number>()
      if (res.fullBoard) {
        for (let i = 0; i < 9; i++) cells.add(i)
      } else {
        res.lines.forEach((l) => l.cells.forEach((c) => cells.add(c)))
      }
      // If server paid but local lines empty, still light the middle row as fallback
      if (cells.size === 0 && res.payout > 0) {
        ;[3, 4, 5].forEach((i) => cells.add(i))
      }
      setWinCells(cells)

      if (res.payout > 0) {
        setLastWin(res.payout)
        const countMs = Math.min(1800, 600 + res.payout * 2)
        countUp(res.payout, countMs)
        later(() => {
          if (!isLivePlayer()) a.credit(res.payout)
          else {
            setBalanceHold(null)
            void a.refresh?.()
          }
        }, countMs)
        if (res.fullBoard) {
          setBanner('Full-board reward!')
          a.play('bigwin', 0.7)
        } else if (res.wheelTriggered) {
          setBanner('Lucky Wheel reward!')
          a.play('wheelWin', 0.65)
        } else if (res.basePayout > 0 && res.multiplier > 1) {
          setBanner(`${formatMoney(res.basePayout)} × ${res.multiplier}`)
          a.play(res.lines.some((l) => l.symbol === 'wild') ? 'wild' : 'win', 0.55)
        } else if (res.multiplier >= 10) {
          setBanner(`${res.multiplier}× Multiplier!`)
          a.play('win', 0.6)
        } else {
          setBanner('Winning amount multiplied')
          a.play(res.lines.some((l) => l.symbol === 'wild') ? 'wild' : 'win', 0.55)
        }
        const breakdown =
          res.basePayout > 0 && res.multiplier > 1 && !res.wheelTriggered
            ? `${formatMoney(res.basePayout)} × ${res.multiplier} = ${formatMoney(res.payout)}`
            : res.payout.toLocaleString()
        a.onMessage?.(
          res.fullBoard
            ? `Full board · ${res.payout.toLocaleString()}`
            : `Win · ${breakdown}`,
        )
      } else {
        setLastWin(0)
        setDisplayWin(0)
        setBanner('Spin again for fortune')
        a.onMessage?.(roundLossMessage(betAmount))
        if (isLivePlayer()) {
          later(() => {
            setBalanceHold(null)
            void a.refresh?.()
          }, WIN_HOLD_MS)
        }
      }

      later(() => {
        setPhase('idle')
        setBusy(false)
        spinningRef.current = false
        // Keep winCells briefly on idle, clear next spin
        if (auto && autoLeft > 1) {
          setAutoLeft((n) => n - 1)
        } else if (auto) {
          setAuto(false)
          setAutoLeft(0)
        }
      }, WIN_HOLD_MS + (res.payout > 0 ? 600 : 0))
    },
    [auto, autoLeft, betAmount, countUp, later],
  )

  const runWheel = useCallback(
    (gridFinal: Fg2Symbol[], specialFinal: SpecialToken) => {
      const a = apiRef.current
      setPhase('wheelSpin')
      setWheelSpinning(true)
      setBanner('Lucky Wheel activated')
      a.play('wheelStart', 0.6)
      const reward = spinWheelReward()
      setWheelReward(reward)
      const rewards = [3, 5, 8, 10, 15, 20, 30, 50, 100, 200, 500, 1000]
      const idx = Math.max(0, rewards.indexOf(reward))
      const segment = 360 / 12
      const extra = 360 * (5 + Math.floor(Math.random() * 3))
      const target = extra + (360 - ((idx * segment + segment / 2) % 360))
      setWheelAngle((prev) => prev + target)

      const duration = turbo ? WHEEL_SPIN_MS * 0.55 : WHEEL_SPIN_MS
      const ticks = turbo ? 10 : 16
      for (let i = 0; i < ticks; i++) {
        later(() => a.play('wheelTick', 0.25 + i * 0.02), 180 + i * (duration / (ticks + 2)))
      }

      later(() => {
        setWheelSpinning(false)
        const res = evaluateSpin(gridFinal, specialFinal, betAmount, reward)
        finishRound(res)
      }, duration)
    },
    [betAmount, finishRound, later, turbo],
  )

  const spin = useCallback(async () => {
    if (spinningRef.current || busy) return
    const a = apiRef.current
    if (!a.canAfford(betAmount)) {
      a.play('error')
      a.onMessage?.('Low balance — add cash or lower your bet')
      return
    }

    let serverGrid: Fg2Symbol[] | null = null
    let serverSpecial: SpecialToken | null = null

    const balanceBeforeSpin = a.getBalance?.() ?? 0

    if (isLivePlayer()) {
      try {
        const settled = await serverSlotSpin('fortune-gems-2', betAmount)
        serverGrid = coerceGrid(settled?.payload?.grid)
        if (settled?.payload?.special) serverSpecial = coerceSpecial(settled.payload.special)
        setBalanceHold(Math.round((balanceBeforeSpin - betAmount) * 100) / 100)
      } catch (e: any) {
        a.play('error')
        a.onMessage?.(e?.message || 'Spin failed')
        return
      }
    } else if (!a.debit(betAmount)) {
      a.play('error')
      return
    }

    spinningRef.current = true
    setBusy(true)
    clearTimers()
    setResult(null)
    setWinCells(new Set())
    setLastWin(0)
    setDisplayWin(0)
    setBanner('Spinning…')
    a.play('spin', 0.5)
    a.onMessage?.(null)

    const finalGrid = serverGrid ?? spinGrid()
    const finalSpecial = serverSpecial ?? spinSpecial()
    const newStrips = [buildReelStrip(), buildReelStrip(), buildReelStrip()] as const
    const newSpecialStrip = buildSpecialStrip()
    setStrips(newStrips)
    setSpecialStrip(newSpecialStrip)
    setStoppingReels([false, false, false])
    setSpecialStopping(false)
    setPhase('spinning')
    const pendingGrid = finalGrid

    const baseMs = turbo ? TURBO_SPIN_MS : SPIN_MS
    const stagger = turbo ? 120 : REEL_STAGGER_MS

    ;[0, 1, 2].forEach((col) => {
      later(() => {
        setStoppingReels((prev) => {
          const next = [...prev]
          next[col] = true
          return next
        })
        setGrid((g) => {
          const next = [...g] as Fg2Symbol[]
          next[col] = pendingGrid[col]!
          next[col + 3] = pendingGrid[col + 3]!
          next[col + 6] = pendingGrid[col + 6]!
          return next
        })
        a.play('reelStop', 0.4)
      }, baseMs + col * stagger)
    })

    later(() => {
      setPhase('specialSpin')
      setBanner('Special Wheel activated')
      a.play('multMove', 0.4)
      setSpecialStopping(false)
      later(() => {
        setSpecialStopping(true)
        setSpecial(finalSpecial)
        a.play('multLock', 0.5)
        later(() => {
          if (finalSpecial.kind === 'wheel') {
            runWheel(finalGrid, finalSpecial)
          } else {
            const res = evaluateSpin(finalGrid, finalSpecial, betAmount, 0)
            if (finalSpecial.kind === 'mult') {
              setBanner(`${finalSpecial.value}× Multiplier`)
            }
            finishRound(res)
          }
        }, 380)
      }, turbo ? MULT_SPIN_MS * 0.5 : MULT_SPIN_MS)
    }, baseMs + 3 * stagger + 120)
  }, [betAmount, busy, clearTimers, finishRound, later, runWheel, turbo])

  useEffect(() => {
    if (phase === 'idle' && auto && autoLeft > 0 && !busy) {
      const t = setTimeout(() => spin(), 450)
      return () => clearTimeout(t)
    }
  }, [phase, auto, autoLeft, busy, spin])

  const betPlus = useCallback(() => {
    if (busy) return
    apiRef.current.play('button', 0.35)
    setBetIndex((i) => Math.min(BET_AMOUNTS.length - 1, i + 1))
  }, [busy])

  const betMinus = useCallback(() => {
    if (busy) return
    apiRef.current.play('button', 0.35)
    setBetIndex((i) => Math.max(0, i - 1))
  }, [busy])

  const selectBet = useCallback((amount: number) => {
    if (busy) return
    const index = BET_AMOUNTS.findIndex((value) => value === amount)
    if (index < 0) return
    apiRef.current.play('button', 0.35)
    setBetIndex(index)
  }, [busy])

  const toggleExtraBet = useCallback(() => {
    if (busy) return
    apiRef.current.play('button', 0.35)
    setExtraBet((enabled) => !enabled)
  }, [busy])

  const toggleTurbo = useCallback(() => {
    apiRef.current.play('button', 0.35)
    setTurbo((t) => !t)
  }, [])

  const toggleAuto = useCallback(() => {
    apiRef.current.play('button', 0.35)
    setAuto((prev) => {
      if (prev) {
        setAutoLeft(0)
        return false
      }
      setAutoLeft(20)
      return true
    })
  }, [])

  return {
    phase,
    betAmount,
    baseBetAmount,
    extraBet,
    grid,
    special,
    strips,
    specialStrip,
    stoppingReels,
    specialStopping,
    wheelAngle,
    wheelSpinning,
    wheelReward,
    result,
    winCells,
    lastWin,
    displayWin,
    banner,
    turbo,
    auto,
    autoLeft,
    busy,
    balanceHold,
    spin,
    betPlus,
    betMinus,
    selectBet,
    toggleExtraBet,
    toggleTurbo,
    toggleAuto,
    setBanner,
  }
}
