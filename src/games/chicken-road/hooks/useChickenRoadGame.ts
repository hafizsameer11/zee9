import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import {
  COLLISION_ANIM_MS,
  DIFFICULTIES,
  LOSS_HOLD_MS,
  MAX_BET,
  MIN_BET,
  MOVE_ANIM_MS,
  QUICK_BETS,
  RESET_HOLD_MS,
  STEP_SUCCESS_HOLD_MS,
  WIN_HOLD_MS,
  clampBet,
  stepBet,
  type ChickenRoadGameState,
  type DifficultyId,
  type VehicleKind,
} from '../constants/gameConfig'
import { ALL_ASSETS, BOOT_ASSETS } from '../constants/assetManifest'
import {
  cashOut as serviceCashOut,
  requestNextStep,
  startRound as serviceStartRound,
  type StepResult,
} from '../services/chickenRoadGameService'

type WalletFns = {
  canAfford: (n: number) => boolean
  debit: (n: number) => boolean
  credit: (n: number) => void
}

type Opts = WalletFns & {
  assetsReady?: boolean
  onMessage?: (msg: string | null) => void
  playSfx?: (id: string) => void
  onStepAnimate?: (result: StepResult) => Promise<void>
  onCollisionAnimate?: (result: StepResult) => Promise<void>
  onCelebrate?: () => Promise<void>
  onResetScene?: () => void
}

function preloadList(urls: readonly string[], onProgress?: (pct: number) => void) {
  const unique = [...new Set(urls)]
  return new Promise<void>((resolve) => {
    if (unique.length === 0) {
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

const IDLE_STATES: ChickenRoadGameState[] = ['READY', 'BETTING']
const ACTIVE_ROUND: ChickenRoadGameState[] = [
  'ROUND_STARTING',
  'WAITING_FOR_MOVE',
  'CHICKEN_MOVING',
  'LANE_CHECKING',
  'STEP_SUCCESS',
  'CASHING_OUT',
  'COLLISION',
]

export function useChickenRoadGame({
  canAfford,
  debit,
  credit,
  assetsReady: assetsReadyExt,
  onMessage,
  playSfx,
  onStepAnimate,
  onCollisionAnimate,
  onCelebrate,
  onResetScene,
}: Opts) {
  const [state, setState] = useState<ChickenRoadGameState>('LOADING')
  const [loadProgress, setLoadProgress] = useState(0)
  const [assetsReady, setAssetsReady] = useState(false)
  const [betAmount, setBetAmountState] = useState(MIN_BET)
  const [difficulty, setDifficultyState] = useState<DifficultyId>('medium')
  const [roundId, setRoundId] = useState<string | null>(null)
  const [multipliers, setMultipliers] = useState<number[]>([])
  const [laneCount, setLaneCount] = useState(DIFFICULTIES.medium.laneCount)
  const [currentStep, setCurrentStep] = useState(0)
  const [currentMult, setCurrentMult] = useState(0)
  const [potentialPayout, setPotentialPayout] = useState(0)
  const [lastPayout, setLastPayout] = useState(0)
  const [lastVehicle, setLastVehicle] = useState<VehicleKind | null>(null)
  const [failedStep, setFailedStep] = useState<number | null>(null)
  const [statusText, setStatusText] = useState('Loading')
  const [error, setError] = useState<string | null>(null)
  const [onlineCount] = useState(() => 180 + Math.floor(Math.random() * 420))
  const [tickerItems] = useState(() =>
    Array.from({ length: 8 }, (_, i) => ({
      id: `t-${i}`,
      name: ['Nova', 'Rex', 'Jade', 'Kai', 'Mira', 'Ash', 'Luna', 'Vex'][i]!,
      amount: [42, 120, 85, 260, 55, 310, 74, 190][i]!,
    })),
  )

  const mountedRef = useRef(true)
  const stateRef = useRef(state)
  stateRef.current = state
  const busyRef = useRef(false)
  const timeoutRefs = useRef<number[]>([])
  const playSfxRef = useRef(playSfx)
  playSfxRef.current = playSfx
  const onMessageRef = useRef(onMessage)
  onMessageRef.current = onMessage
  const creditRef = useRef(credit)
  creditRef.current = credit
  const animStepRef = useRef(onStepAnimate)
  animStepRef.current = onStepAnimate
  const animColRef = useRef(onCollisionAnimate)
  animColRef.current = onCollisionAnimate
  const celebrateRef = useRef(onCelebrate)
  celebrateRef.current = onCelebrate
  const resetSceneRef = useRef(onResetScene)
  resetSceneRef.current = onResetScene

  const later = useCallback((fn: () => void, ms: number) => {
    const id = window.setTimeout(() => {
      if (mountedRef.current) fn()
    }, ms)
    timeoutRefs.current.push(id)
  }, [])

  const clearTimers = useCallback(() => {
    for (const id of timeoutRefs.current) window.clearTimeout(id)
    timeoutRefs.current = []
  }, [])

  useEffect(() => {
    mountedRef.current = true
    return () => {
      mountedRef.current = false
      clearTimers()
    }
  }, [clearTimers])

  // Boot preload
  useEffect(() => {
    let cancelled = false
    const safety = window.setTimeout(() => {
      if (!cancelled) {
        setLoadProgress(100)
        setAssetsReady(true)
      }
    }, 14000)

    void (async () => {
      await preloadList(BOOT_ASSETS, (pct) => {
        if (!cancelled) setLoadProgress(Math.min(40, Math.round(pct * 0.4)))
      })
      await preloadList(ALL_ASSETS, (pct) => {
        if (!cancelled) setLoadProgress(40 + Math.round(pct * 0.6))
      })
      if (!cancelled) {
        setLoadProgress(100)
        setAssetsReady(true)
      }
    })()

    return () => {
      cancelled = true
      window.clearTimeout(safety)
    }
  }, [])

  useEffect(() => {
    if (state !== 'LOADING') return
    if (!assetsReady) return
    if (assetsReadyExt === false) return
    setState('READY')
    setStatusText('Place your bet')
  }, [assetsReady, assetsReadyExt, state])

  const roundActive = ACTIVE_ROUND.includes(state)
  const canEditBet = IDLE_STATES.includes(state) || state === 'RESETTING'

  const setBetAmount = useCallback(
    (v: number) => {
      if (!canEditBet) return
      setBetAmountState(clampBet(v))
      playSfxRef.current?.('betChange')
    },
    [canEditBet],
  )

  const adjustBet = useCallback(
    (delta: number, balance = Infinity) => {
      if (!canEditBet) return
      setBetAmountState((b) => {
        const next = stepBet(b, delta > 0 ? 1 : -1)
        return clampBet(Math.min(next, balance), balance)
      })
      playSfxRef.current?.('betChange')
    },
    [canEditBet],
  )

  const setMinBet = useCallback(() => {
    if (!canEditBet) return
    setBetAmountState(MIN_BET)
    playSfxRef.current?.('betChange')
  }, [canEditBet])

  const setMaxBet = useCallback(
    (balance: number) => {
      if (!canEditBet) return
      setBetAmountState(clampBet(Math.min(MAX_BET, balance), balance))
      playSfxRef.current?.('betChange')
    },
    [canEditBet],
  )

  const setDifficulty = useCallback(
    (id: DifficultyId) => {
      if (!canEditBet) return
      if (!DIFFICULTIES[id]) return
      setDifficultyState(id)
      setLaneCount(DIFFICULTIES[id].laneCount)
      setMultipliers([...DIFFICULTIES[id].multipliers])
      playSfxRef.current?.('difficulty')
    },
    [canEditBet],
  )

  const resetToBetting = useCallback(() => {
    clearTimers()
    busyRef.current = false
    setState('RESETTING')
    setStatusText('Resetting')
    resetSceneRef.current?.()
    later(() => {
      setRoundId(null)
      setCurrentStep(0)
      setCurrentMult(0)
      setPotentialPayout(0)
      setLastVehicle(null)
      setFailedStep(null)
      setError(null)
      setMultipliers([...DIFFICULTIES[difficulty].multipliers])
      setLaneCount(DIFFICULTIES[difficulty].laneCount)
      setState('BETTING')
      setStatusText('Place your bet')
    }, RESET_HOLD_MS)
  }, [clearTimers, difficulty, later])

  const startGame = useCallback(async () => {
    if (busyRef.current) return
    const s = stateRef.current
    if (s !== 'READY' && s !== 'BETTING' && s !== 'WIN' && s !== 'LOSS') return
    if (roundActive && s !== 'WIN' && s !== 'LOSS') return

    const amount = clampBet(betAmount)
    if (amount < MIN_BET) {
      onMessageRef.current?.('Bet too low')
      return
    }
    if (!canAfford(amount)) {
      playSfxRef.current?.('warning')
      onMessageRef.current?.('Insufficient balance')
      setError('Insufficient balance')
      return
    }

    busyRef.current = true
    setError(null)
    setState('ROUND_STARTING')
    setStatusText('Starting')
    setFailedStep(null)
    setLastPayout(0)
    setCurrentStep(0)
    setCurrentMult(0)
    setPotentialPayout(0)
    playSfxRef.current?.('roundStart')

    if (!debit(amount)) {
      busyRef.current = false
      setState('BETTING')
      setStatusText('Place your bet')
      onMessageRef.current?.('Insufficient balance')
      return
    }

    try {
      const round = await serviceStartRound({ betAmount: amount, difficulty })
      if (!mountedRef.current) return
      setRoundId(round.roundId)
      setMultipliers(round.multipliers)
      setLaneCount(round.laneCount)
      setBetAmountState(round.betAmount)
      setState('WAITING_FOR_MOVE')
      setStatusText('Cross the road')
      busyRef.current = false
    } catch (e) {
      creditRef.current(amount)
      busyRef.current = false
      setState('BETTING')
      setStatusText('Place your bet')
      const msg = e instanceof Error ? e.message : 'Failed to start'
      setError(msg)
      onMessageRef.current?.(msg)
    }
  }, [betAmount, canAfford, debit, difficulty, roundActive])

  const moveForward = useCallback(async () => {
    if (busyRef.current) return
    if (stateRef.current !== 'WAITING_FOR_MOVE' && stateRef.current !== 'STEP_SUCCESS') return
    if (!roundId) return
    if (currentStep >= laneCount) return

    busyRef.current = true
    setState('CHICKEN_MOVING')
    setStatusText('Crossing')
    playSfxRef.current?.('chickenJump')

    try {
      const result = await requestNextStep({ roundId, currentStep })
      if (!mountedRef.current) return

      setState('LANE_CHECKING')
      setLastVehicle(result.vehicleKind ?? null)

      if (result.collided || !result.safe) {
        setFailedStep(result.stepIndex)
        setCurrentMult(0)
        setPotentialPayout(0)
        playSfxRef.current?.('warning')
        setState('COLLISION')
        setStatusText('Hit!')
        await animColRef.current?.(result)
        if (!mountedRef.current) return
        playSfxRef.current?.('collision')
        playSfxRef.current?.('feather')
        playSfxRef.current?.('loss')
        later(() => {
          setState('LOSS')
          setStatusText('Round lost')
          busyRef.current = false
          later(() => resetToBetting(), LOSS_HOLD_MS)
        }, Math.max(80, COLLISION_ANIM_MS - MOVE_ANIM_MS))
        return
      }

      await animStepRef.current?.(result)
      if (!mountedRef.current) return

      playSfxRef.current?.('chickenLand')
      playSfxRef.current?.('stepSuccess')
      playSfxRef.current?.('multiplier')

      setCurrentStep(result.stepIndex + 1)
      setCurrentMult(result.multiplier)
      setPotentialPayout(result.payout)
      setState('STEP_SUCCESS')
      setStatusText(result.completed ? 'Destination!' : 'Safe')

      if (result.completed) {
        later(async () => {
          setState('CASHING_OUT')
          setStatusText('Collecting')
          playSfxRef.current?.('cashout')
          try {
            const out = await serviceCashOut({ roundId })
            if (!mountedRef.current) return
            if (out.success && out.payout > 0) {
              creditRef.current(out.payout)
              setLastPayout(out.payout)
              setCurrentMult(out.multiplier)
            }
            await celebrateRef.current?.()
            playSfxRef.current?.('win')
            playSfxRef.current?.('coin')
            setState('WIN')
            setStatusText('You win')
            busyRef.current = false
            later(() => resetToBetting(), WIN_HOLD_MS)
          } catch {
            busyRef.current = false
            resetToBetting()
          }
        }, STEP_SUCCESS_HOLD_MS)
      } else {
        later(() => {
          setState('WAITING_FOR_MOVE')
          setStatusText('Cross the road')
          busyRef.current = false
        }, STEP_SUCCESS_HOLD_MS)
      }
    } catch (e) {
      busyRef.current = false
      setState('WAITING_FOR_MOVE')
      setStatusText('Cross the road')
      const raw = e instanceof Error ? e.message : 'Move failed'
      const msg = /connection closed|not connected|request timeout/i.test(raw)
        ? 'Reconnecting… tap Move again'
        : raw
      setError(msg)
      onMessageRef.current?.(msg)
    }
  }, [currentStep, laneCount, later, resetToBetting, roundId])

  const cashOutNow = useCallback(async () => {
    if (busyRef.current) return
    const s = stateRef.current
    if (s === 'COLLISION' || s === 'LOSS' || s === 'CASHING_OUT' || s === 'WIN') return
    if (s !== 'WAITING_FOR_MOVE' && s !== 'STEP_SUCCESS') return
    if (!roundId || currentStep <= 0) return

    busyRef.current = true
    setState('CASHING_OUT')
    setStatusText('Cashing out')
    playSfxRef.current?.('cashout')

    try {
      const out = await serviceCashOut({ roundId })
      if (!mountedRef.current) return
      if (!out.success) {
        busyRef.current = false
        setState('WAITING_FOR_MOVE')
        return
      }
      if (out.payout > 0) creditRef.current(out.payout)
      setLastPayout(out.payout)
      setCurrentMult(out.multiplier)
      setPotentialPayout(out.payout)
      await celebrateRef.current?.()
      playSfxRef.current?.('win')
      playSfxRef.current?.('coin')
      setState('WIN')
      setStatusText('Cashed out')
      busyRef.current = false
      later(() => resetToBetting(), WIN_HOLD_MS)
    } catch (e) {
      busyRef.current = false
      setState('WAITING_FOR_MOVE')
      const msg = e instanceof Error ? e.message : 'Cash out failed'
      setError(msg)
      onMessageRef.current?.(msg)
    }
  }, [currentStep, later, resetToBetting, roundId])

  const cfg = DIFFICULTIES[difficulty]

  const nextMult = useMemo(() => {
    if (currentStep >= multipliers.length) return 0
    return multipliers[currentStep] ?? 0
  }, [currentStep, multipliers])

  return {
    state,
    loadProgress,
    assetsReady,
    betAmount,
    setBetAmount,
    adjustBet,
    setMinBet,
    setMaxBet,
    quickBets: QUICK_BETS,
    difficulty,
    setDifficulty,
    difficultyConfig: cfg,
    roundId,
    multipliers,
    laneCount,
    currentStep,
    currentMult,
    nextMult,
    potentialPayout,
    lastPayout,
    lastVehicle,
    failedStep,
    statusText,
    error,
    onlineCount,
    tickerItems,
    roundActive,
    canEditBet,
    canStart: !roundActive && !busyRef.current && (state === 'READY' || state === 'BETTING'),
    canMove:
      !busyRef.current &&
      (state === 'WAITING_FOR_MOVE' || state === 'STEP_SUCCESS') &&
      currentStep < laneCount,
    canCashOut:
      !busyRef.current &&
      currentStep > 0 &&
      (state === 'WAITING_FOR_MOVE' || state === 'STEP_SUCCESS'),
    startGame,
    moveForward,
    cashOutNow,
    resetToBetting,
  }
}

export type ChickenRoadGameApi = ReturnType<typeof useChickenRoadGame>
