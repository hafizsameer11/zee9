import { useCallback, useEffect, useRef, useState } from 'react'
import { DEMO_BALANCE } from '../../../data/s9Games'
import { isLivePlayer, preconnectSlot, serverSlotSpin } from '../../lib/serverSpin'
import {
  AUTO_SPIN_OPTIONS,
  BET_AMOUNTS,
  CASCADE_DROP_MS,
  COMBO,
  DEFAULT_BET,
  FREE_SPIN_COUNT,
  SPIN_MS,
  SUPER_WIN_MS,
  SUPER_WIN_MULT,
  TURBO_CASCADE_MS,
  TURBO_SPIN_MS,
  TURBO_SUPER_WIN_MS,
  TURBO_WIN_HOLD_MS,
  WIN_HOLD_MS,
  featureBuyCost,
  formatMoney,
} from '../constants/gameConfig'
import {
  emptyBoard,
  simulateSpin,
  winningCellSet,
  type CascadeStep,
  type Cell,
  type SpinResult,
} from '../engines/superAceEngine'
import type { SuperAceSfx } from './useSuperAceSound'

export type SuperAcePhase =
  | 'idle'
  | 'spinning'
  | 'cascading'
  | 'winPresent'
  | 'superWin'
  | 'bonusBuy'

export type WinTier = 'none' | 'small' | 'medium' | 'super'

type WalletFns = {
  canAfford: (n: number) => boolean
  debit: (n: number) => boolean
  credit: (n: number) => void
  refresh?: () => Promise<void> | void
}

export type SuperAceGameOpts = Partial<WalletFns> & {
  play: (id: SuperAceSfx, volume?: number) => void
  playCombo?: (comboIndex: number) => void
  onMessage?: (msg: string | null) => void
  /** Force local demo wallet only when explicitly requested. */
  demo?: boolean
  demoBalance?: number
  reducedMotion?: boolean
}

function sleep(ms: number) {
  return new Promise<void>((r) => setTimeout(r, ms))
}

export function useSuperAceGame(opts: SuperAceGameOpts) {
  const { play, playCombo, onMessage, reducedMotion } = opts
  /** Live when authenticated. Preview routes removed — demo only if opts.demo === true. */
  const useDemo = opts.demo === true || !isLivePlayer()

  const [demoBal, setDemoBal] = useState(
    () => opts.demoBalance ?? DEMO_BALANCE,
  )

  const canAfford = useCallback(
    (n: number) => {
      if (useDemo) return demoBal >= n
      return opts.canAfford?.(n) ?? false
    },
    [demoBal, opts.canAfford, useDemo],
  )

  const debit = useCallback(
    (n: number) => {
      if (useDemo) {
        if (demoBal < n) return false
        setDemoBal((b) => Math.round((b - n) * 100) / 100)
        return true
      }
      return opts.debit?.(n) ?? false
    },
    [demoBal, opts.debit, useDemo],
  )

  const credit = useCallback(
    (n: number) => {
      if (useDemo) {
        setDemoBal((b) => Math.round((b + n) * 100) / 100)
        return
      }
      opts.credit?.(n)
    },
    [opts.credit, useDemo],
  )

  const balance = useDemo ? demoBal : undefined

  const busy = useRef(false)
  const autoStop = useRef(false)
  const cancelled = useRef(false)

  const [phase, setPhase] = useState<SuperAcePhase>('idle')
  const [betIndex, setBetIndex] = useState(() => {
    const i = BET_AMOUNTS.indexOf(DEFAULT_BET as (typeof BET_AMOUNTS)[number])
    return i >= 0 ? i : 2
  })
  const [board, setBoard] = useState<Cell[]>(() => emptyBoard())
  const [comboIndex, setComboIndex] = useState(0)
  const [lastResult, setLastResult] = useState<SpinResult | null>(null)
  const [cascadeStep, setCascadeStep] = useState<CascadeStep | null>(null)
  const [winningCells, setWinningCells] = useState<Set<number>>(new Set())
  const [lastWin, setLastWin] = useState(0)
  const [displayWin, setDisplayWin] = useState(0)
  const [spinWin, setSpinWin] = useState(0)
  const [turbo, setTurbo] = useState(false)
  const [autoLeft, setAutoLeft] = useState(0)
  const [freeSpinsLeft, setFreeSpinsLeft] = useState(0)
  const [freeSpinTotalWin, setFreeSpinTotalWin] = useState(0)
  const [inFreeSpins, setInFreeSpins] = useState(false)
  const [winTier, setWinTier] = useState<WinTier>('none')
  const [bonusBuyOpen, setBonusBuyOpen] = useState(false)

  const betAmount = BET_AMOUNTS[betIndex]!
  const betRef = useRef(betAmount)
  betRef.current = betAmount
  const turboRef = useRef(turbo)
  turboRef.current = turbo
  const autoRef = useRef(0)
  autoRef.current = autoLeft
  const freeRef = useRef({ inFree: false, left: 0, total: 0 })
  freeRef.current = { inFree: inFreeSpins, left: freeSpinsLeft, total: freeSpinTotalWin }
  const phaseRef = useRef(phase)
  phaseRef.current = phase

  useEffect(() => () => {
    cancelled.current = true
  }, [])
  useEffect(() => preconnectSlot('super-ace'), [])

  const countUp = useCallback(
    async (target: number, ms: number) => {
      if (target <= 0) {
        setDisplayWin(0)
        return
      }
      const steps = reducedMotion ? 6 : Math.max(8, Math.min(28, Math.round(ms / 40)))
      for (let i = 1; i <= steps; i++) {
        if (cancelled.current) return
        setDisplayWin(Math.round(((target * i) / steps) * 100) / 100)
        await sleep(Math.round(ms / steps))
      }
      setDisplayWin(target)
    },
    [reducedMotion],
  )

  const presentCascades = useCallback(
    async (result: SpinResult) => {
      const tHold = turboRef.current ? TURBO_WIN_HOLD_MS : WIN_HOLD_MS
      const tDrop = turboRef.current ? TURBO_CASCADE_MS : CASCADE_DROP_MS
      let running = 0

      for (let i = 0; i < result.cascades.length; i++) {
        if (cancelled.current) return
        const step = result.cascades[i]!
        setCascadeStep(step)
        setBoard(step.board)
        setComboIndex(step.comboIndex)
        setWinningCells(winningCellSet(step.wins))
        setPhase('winPresent')

        running = Math.round((running + step.winAmount) * 100) / 100
        setSpinWin(running)
        void countUp(running, Math.min(900, tHold + 200))

        if (step.goldenToWild.length) play('gold')
        if (step.wins.some((w) => w.symbol === 'wild')) play('wild')
        play('remove')
        play('win')
        playCombo?.(step.comboIndex)

        await sleep(tHold)

        // Golden → wild stays; remove others; drop + refill
        setPhase('cascading')
        setWinningCells(new Set())
        setBoard(step.nextBoard)
        setComboIndex(Math.min(step.comboIndex + 1, COMBO.length - 1))
        play('cascade')
        // staggered card land snaps
        for (let k = 0; k < 3; k++) {
          window.setTimeout(() => play('cardLand'), 40 + k * 55)
        }
        await sleep(tDrop)
      }

      setBoard(result.finalBoard)
      setCascadeStep(null)
      setWinningCells(new Set())
      setComboIndex(0)
    },
    [countUp, play, playCombo],
  )

  const finishSpin = useCallback(
    async (result: SpinResult, free: boolean, liveSettled = false) => {
      setLastResult(result)
      setLastWin(result.totalWin)
      setSpinWin(result.totalWin)

      let tier: WinTier = 'none'
      if (result.totalWin >= betRef.current * SUPER_WIN_MULT) tier = 'super'
      else if (result.totalWin >= betRef.current * 8) tier = 'medium'
      else if (result.totalWin > 0) tier = 'small'
      setWinTier(tier)

      if (result.scatterCount > 0) play('scatter')

      if (result.totalWin > 0) {
        if (!liveSettled) credit(result.totalWin)
        else void opts.refresh?.()
        onMessage?.(
          result.triggerFreeSpins
            ? `Win ${formatMoney(result.totalWin)} · Free spins!`
            : `Win ${formatMoney(result.totalWin)}`,
        )

        if (tier === 'super') {
          setPhase('superWin')
          play('superwin')
          window.setTimeout(() => play('coin'), 200)
          window.setTimeout(() => play('coin'), 700)
          await countUp(
            result.totalWin,
            turboRef.current ? TURBO_SUPER_WIN_MS * 0.7 : SUPER_WIN_MS * 0.65,
          )
          await sleep(turboRef.current ? TURBO_SUPER_WIN_MS * 0.35 : SUPER_WIN_MS * 0.4)
        } else if (tier === 'medium') {
          play('bigwin')
          play('coin')
          await countUp(result.totalWin, 700)
          await sleep(turboRef.current ? 200 : 450)
        } else {
          await countUp(result.totalWin, 400)
          await sleep(turboRef.current ? 120 : 280)
        }
      } else {
        setDisplayWin(0)
        onMessage?.(null)
        if (liveSettled) void opts.refresh?.()
      }

      // Free-spin trigger (demo / preview only — live money settles on the paid spin)
      if (result.triggerFreeSpins && !free && !liveSettled) {
        autoStop.current = true
        setAutoLeft(0)
        autoRef.current = 0
        play('freespins', 0.7)
        setInFreeSpins(true)
        setFreeSpinsLeft(result.freeSpinsAwarded || FREE_SPIN_COUNT)
        setFreeSpinTotalWin(result.totalWin)
        setPhase('idle')
        busy.current = false
        window.setTimeout(() => {
          if (!cancelled.current) void runSpinRef.current({ free: true })
        }, 500)
        return
      }

      if (free && !liveSettled) {
        const left = freeRef.current.left - 1
        const total = freeRef.current.total + result.totalWin
        setFreeSpinsLeft(left)
        setFreeSpinTotalWin(total)
        if (result.triggerFreeSpins) {
          setFreeSpinsLeft(left + result.freeSpinsAwarded)
          play('feature', 0.55)
        }
        if (left <= 0 && !result.triggerFreeSpins) {
          setInFreeSpins(false)
          setFreeSpinsLeft(0)
          setPhase('idle')
          busy.current = false
          return
        }
        setPhase('idle')
        busy.current = false
        window.setTimeout(() => {
          if (!cancelled.current) void runSpinRef.current({ free: true })
        }, 420)
        return
      }

      setPhase('idle')
      busy.current = false

      if (autoRef.current > 0 && !autoStop.current) {
        const nextAuto = Math.max(0, autoRef.current - 1)
        autoRef.current = nextAuto
        setAutoLeft(nextAuto)
        if (nextAuto > 0) {
          window.setTimeout(() => {
            if (autoRef.current > 0 && !autoStop.current) void runSpinRef.current()
          }, 520)
        }
      }
    },
    [countUp, credit, onMessage, opts, play],
  )

  const runSpin = useCallback(
    async (spinOpts?: { free?: boolean; buyBonus?: boolean }) => {
      if (busy.current) return
      const free = spinOpts?.free === true || freeRef.current.inFree
      const buyBonus = spinOpts?.buyBonus === true
      const currentBet = betRef.current
      const cost = buyBonus ? featureBuyCost(currentBet) : currentBet
      const live = !useDemo && isLivePlayer()
      let serverWin: number | undefined

      if (!free) {
        if (!canAfford(cost)) {
          play('error')
          onMessage?.('Insufficient balance')
          setAutoLeft(0)
          return
        }
        if (live) {
          try {
            const settled = await serverSlotSpin('super-ace', cost)
            serverWin = settled?.win ?? 0
            void opts.refresh?.()
          } catch (e: any) {
            play('error')
            onMessage?.(e?.message || 'Spin failed')
            return
          }
        } else if (!debit(cost)) {
          play('error')
          onMessage?.('Bet failed')
          return
        }
      }

      busy.current = true
      setBonusBuyOpen(false)
      setLastResult(null)
      setCascadeStep(null)
      setWinningCells(new Set())
      setLastWin(0)
      setDisplayWin(0)
      setSpinWin(0)
      setWinTier('none')
      setComboIndex(0)
      setPhase('spinning')
      play('spin')
      onMessage?.(null)

      let result = simulateSpin(currentBet, {
        buyBonus: live ? false : buyBonus,
        freeSpin: free && !live,
        boostSpecials: free && !live,
      })
      if (serverWin != null) {
        // The visible board must agree with the authoritative server outcome.
        // Retry only the visual board; wallet settlement remains server-controlled.
        for (
          let attempt = 0;
          attempt < 80 && (result.totalWin > 0) !== (serverWin > 0);
          attempt++
        ) {
          result = simulateSpin(currentBet)
        }
        result.totalWin = serverWin
        result.triggerFreeSpins = false
        result.freeSpinsAwarded = 0
      }

      const spinMs = turboRef.current ? TURBO_SPIN_MS : SPIN_MS
      // column settle snaps while spinning
      const lands = turboRef.current ? 3 : 5
      for (let c = 0; c < lands; c++) {
        window.setTimeout(() => play('cardLand'), Math.round((spinMs * (c + 1)) / (lands + 1)))
      }
      setBoard(result.initialBoard)
      await sleep(spinMs)

      if (result.cascades.length > 0) {
        await presentCascades(result)
      } else {
        setBoard(result.finalBoard)
      }

      await finishSpin(result, free, live && !free)
    },
    [canAfford, debit, finishSpin, onMessage, opts, play, presentCascades, useDemo],
  )

  const runSpinRef = useRef(runSpin)
  runSpinRef.current = runSpin

  const spin = useCallback(() => {
    if (phase !== 'idle' || busy.current || inFreeSpins) return
    void runSpin()
  }, [inFreeSpins, phase, runSpin])

  const betPlus = useCallback(() => {
    if (busy.current || inFreeSpins) return
    play('bet', 0.35)
    setBetIndex((i) => Math.min(BET_AMOUNTS.length - 1, i + 1))
  }, [inFreeSpins, play])

  const betMinus = useCallback(() => {
    if (busy.current || inFreeSpins) return
    play('bet', 0.35)
    setBetIndex((i) => Math.max(0, i - 1))
  }, [inFreeSpins, play])

  const setBetAmount = useCallback(
    (n: number) => {
      if (busy.current || inFreeSpins) return
      const idx = BET_AMOUNTS.indexOf(n as (typeof BET_AMOUNTS)[number])
      if (idx >= 0) {
        setBetIndex(idx)
        play('bet', 0.35)
      }
    },
    [inFreeSpins, play],
  )

  const toggleTurbo = useCallback(() => {
    play('button', 0.35)
    setTurbo((t) => !t)
  }, [play])

  const startAuto = useCallback(
    (count: number) => {
      if (busy.current || inFreeSpins) return
      autoStop.current = false
      autoRef.current = count
      setAutoLeft(count)
      play('button')
      window.setTimeout(() => void runSpin(), 180)
    },
    [inFreeSpins, play, runSpin],
  )

  const stopAuto = useCallback(() => {
    autoStop.current = true
    autoRef.current = 0
    setAutoLeft(0)
    play('button', 0.4)
  }, [play])

  const toggleAuto = useCallback(() => {
    if (autoLeft > 0) stopAuto()
    else startAuto(AUTO_SPIN_OPTIONS[1] ?? 20)
  }, [autoLeft, startAuto, stopAuto])

  const openBonusBuy = useCallback(() => {
    if (busy.current || inFreeSpins) return
    play('button', 0.4)
    setBonusBuyOpen(true)
    setPhase('bonusBuy')
  }, [inFreeSpins, play])

  const closeBonusBuy = useCallback(() => {
    setBonusBuyOpen(false)
    setPhase('idle')
    play('button', 0.3)
  }, [play])

  const buyBonus = useCallback(() => {
    if (busy.current || inFreeSpins) return
    play('feature', 0.6)
    void runSpin({ buyBonus: true })
  }, [inFreeSpins, play, runSpin])

  const controlsLocked =
    busy.current ||
    phase === 'spinning' ||
    phase === 'cascading' ||
    phase === 'winPresent' ||
    phase === 'superWin' ||
    inFreeSpins

  return {
    // state
    phase,
    betAmount,
    betIndex,
    board,
    comboIndex,
    comboMult: COMBO[Math.min(comboIndex, COMBO.length - 1)]!,
    lastResult,
    cascadeStep,
    winningCells,
    lastWin,
    displayWin,
    spinWin,
    turbo,
    autoLeft,
    freeSpinsLeft,
    freeSpinTotalWin,
    inFreeSpins,
    winTier,
    bonusBuyOpen,
    controlsLocked,
    featureCost: featureBuyCost(betAmount),
    balance,
    isDemo: useDemo,
    autoOptions: AUTO_SPIN_OPTIONS,
    betAmounts: BET_AMOUNTS,
    // actions
    spin,
    runSpin,
    betPlus,
    betMinus,
    setBetAmount,
    toggleTurbo,
    toggleAuto,
    startAuto,
    stopAuto,
    openBonusBuy,
    closeBonusBuy,
    buyBonus,
    setTurbo,
  }
}
