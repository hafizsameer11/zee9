import { useCallback, useEffect, useRef, useState } from 'react'
import {
  AUTO_SPIN_OPTIONS,
  BET_AMOUNTS,
  DEFAULT_BET,
  FREE_SPIN_COUNT,
  MULTIPLIER_TRACK,
  REEL_STOP_STAGGER,
  SPIN_MS,
  STATUS_MESSAGES,
  TURBO_SPIN_MS,
  TURBO_STOP_STAGGER,
  featureBuyCost,
  formatMoney,
} from '../constants/gameConfig'
import {
  emptyGrid,
  evaluateSpin,
  readDevForce,
  type Cell,
  type ForceMode,
  type SpinResult,
} from '../engines/bountyTrailEngine'
import type { BountySfx } from './useBountyTrailSound'
import { isLivePlayer, preconnectSlot, serverSlotSpin } from '../../lib/serverSpin'

export type GamePhase =
  | 'loading'
  | 'ready'
  | 'spinning'
  | 'reelStopping'
  | 'evaluating'
  | 'winPresentation'
  | 'featureTriggered'
  | 'freeSpinsIntro'
  | 'freeSpins'
  | 'freeSpinsOutro'
  | 'insufficientBalance'
  | 'modalOpen'
  | 'paused'

export type HistoryRound = {
  id: string
  bet: number
  win: number
  at: number
  note: string
}

type WalletFns = {
  canAfford: (n: number) => boolean
  debit: (n: number) => boolean
  credit: (n: number) => void
}

type Opts = WalletFns & {
  playSfx: (id: BountySfx, volume?: number) => void
  onMessage?: (msg: string | null) => void
  reducedMotion?: boolean
}

function sleep(ms: number) {
  return new Promise<void>((r) => setTimeout(r, ms))
}

export function useBountyTrailGame(opts: Opts) {
  const { canAfford, debit, credit, playSfx, onMessage, reducedMotion } = opts
  const busy = useRef(false)
  const autoStop = useRef(false)

  const [phase, setPhase] = useState<GamePhase>('loading')
  const [loadProgress, setLoadProgress] = useState(0)
  const [bet, setBet] = useState(DEFAULT_BET)
  const [grid, setGrid] = useState<Cell[][]>(() => emptyGrid())
  const [spinning, setSpinning] = useState(false)
  const [stoppingReels, setStoppingReels] = useState<boolean[]>(() => Array(6).fill(false))
  const [lastResult, setLastResult] = useState<SpinResult | null>(null)
  const [lastWin, setLastWin] = useState(0)
  const [displayWin, setDisplayWin] = useState(0)
  const [turbo, setTurbo] = useState(false)
  const [autoLeft, setAutoLeft] = useState(0)
  const [statusMsg, setStatusMsg] = useState<string>(STATUS_MESSAGES[0]!)
  const [multIndex, setMultIndex] = useState(0)
  const [freeSpinsLeft, setFreeSpinsLeft] = useState(0)
  const [freeSpinTotalWin, setFreeSpinTotalWin] = useState(0)
  const [inFreeSpins, setInFreeSpins] = useState(false)
  const [winTier, setWinTier] = useState<'none' | 'small' | 'medium' | 'big'>('none')
  const [winningCells, setWinningCells] = useState<Set<string>>(new Set())
  const [history, setHistory] = useState<HistoryRound[]>([])
  const [shake, setShake] = useState(0)
  const [modal, setModal] = useState<
    null | 'bet' | 'auto' | 'feature' | 'paytable' | 'rules' | 'history' | 'quit' | 'menu'
  >(null)

  const phaseRef = useRef(phase)
  phaseRef.current = phase
  const betRef = useRef(bet)
  betRef.current = bet
  const turboRef = useRef(turbo)
  turboRef.current = turbo
  const multRef = useRef(multIndex)
  multRef.current = multIndex
  const freeRef = useRef({ inFree: false, left: 0, total: 0 })
  freeRef.current = { inFree: inFreeSpins, left: freeSpinsLeft, total: freeSpinTotalWin }
  const autoRef = useRef(0)
  autoRef.current = autoLeft

  useEffect(() => {
    preconnectSlot(window.location.pathname.includes('wild-bounty') ? 'wild-bounty' : 'bounty-trail')
  }, [])

  useEffect(() => {
    if (phase !== 'ready' || spinning || modal) return
    const t = window.setInterval(() => {
      setStatusMsg((m) => {
        const i = STATUS_MESSAGES.indexOf(m as (typeof STATUS_MESSAGES)[number])
        return STATUS_MESSAGES[(i + 1) % STATUS_MESSAGES.length]!
      })
    }, 4200)
    return () => clearInterval(t)
  }, [phase, spinning, modal])

  const openModal = useCallback((m: NonNullable<typeof modal>) => {
    if (busy.current && m !== 'quit' && m !== 'menu') return
    setModal(m)
    setPhase((p) => (p === 'loading' ? p : 'modalOpen'))
    playSfx('button', 0.4)
  }, [playSfx])

  const closeModal = useCallback(() => {
    setModal(null)
    setPhase((p) => (p === 'loading' ? p : freeRef.current.inFree ? 'freeSpins' : 'ready'))
    playSfx('button', 0.35)
  }, [playSfx])

  const adjustBet = useCallback(
    (dir: 1 | -1) => {
      if (busy.current || spinning || freeRef.current.inFree) return
      const amounts = [...new Set(BET_AMOUNTS)].sort((a, b) => a - b)
      const i = amounts.findIndex((v) => v >= betRef.current)
      const idx = Math.max(0, Math.min(amounts.length - 1, (i === -1 ? amounts.length - 1 : i) + dir))
      setBet(amounts[idx]!)
      playSfx('bet', 0.4)
    },
    [playSfx, spinning],
  )

  const setBetAmount = useCallback(
    (n: number) => {
      if (busy.current || spinning || freeRef.current.inFree) return
      setBet(n)
      playSfx('bet', 0.4)
    },
    [playSfx, spinning],
  )

  const countUpWin = useCallback(async (target: number) => {
    const steps = reducedMotion ? 8 : 24
    for (let i = 1; i <= steps; i++) {
      setDisplayWin(Math.round(((target * i) / steps) * 100) / 100)
      await sleep(reducedMotion ? 16 : 28)
    }
    setDisplayWin(target)
  }, [reducedMotion])

  const presentWin = useCallback(
    async (result: SpinResult) => {
      const win = result.totalWin
      setLastWin(win)
      const cells = new Set<string>()
      result.wayWins.forEach((w) => w.positions.forEach((p) => cells.add(`${p.col}:${p.row}`)))
      setWinningCells(cells)

      let tier: 'none' | 'small' | 'medium' | 'big' = 'none'
      if (win >= betRef.current * 25) tier = 'big'
      else if (win >= betRef.current * 8) tier = 'medium'
      else if (win > 0) tier = 'small'
      setWinTier(tier)

      if (win > 0) {
        setPhase('winPresentation')
        setStatusMsg(`WIN ${formatMoney(win)}`)
        if (tier === 'big') {
          playSfx('bigwin', 0.65)
          if (!reducedMotion) {
            setShake(1)
            await sleep(60)
            setShake(0)
          }
        } else if (tier === 'medium') {
          playSfx('win', 0.5)
        } else {
          playSfx('win', 0.4)
        }
        await countUpWin(win)
        if (!isLivePlayer()) credit(win)
        await sleep(tier === 'big' ? 1400 : tier === 'medium' ? 700 : 380)
        setWinningCells(new Set())
      } else {
        setDisplayWin(0)
        setStatusMsg('GOOD LUCK!')
      }
    },
    [countUpWin, credit, playSfx, reducedMotion],
  )

  const runSpin = useCallback(
    async (opts?: { free?: boolean }) => {
      if (busy.current) return
      const free = opts?.free === true || freeRef.current.inFree
      const currentBet = betRef.current
      let serverWin: number | undefined

      if (!free) {
        if (!canAfford(currentBet)) {
          playSfx('error')
          setPhase('insufficientBalance')
          setStatusMsg('INSUFFICIENT BALANCE')
          onMessage?.('Insufficient balance')
          setAutoLeft(0)
          return
        }
        if (isLivePlayer()) {
          try {
            const slug = window.location.pathname.includes('wild-bounty')
              ? 'wild-bounty'
              : 'bounty-trail'
            const settled = await serverSlotSpin(slug, currentBet)
            serverWin = settled?.win ?? 0
          } catch (e: any) {
            playSfx('error')
            onMessage?.(e?.message || 'Spin failed')
            return
          }
        } else if (!debit(currentBet)) {
          playSfx('error')
          onMessage?.('Bet failed')
          return
        }
      }

      busy.current = true
      setSpinning(true)
      setStoppingReels(Array(6).fill(false))
      setPhase('spinning')
      setLastWin(0)
      setDisplayWin(0)
      setWinningCells(new Set())
      setWinTier('none')
      setLastResult(null)
      setStatusMsg(free ? `FREE SPIN · ${freeRef.current.left}` : 'GOOD LUCK!')
      playSfx('spin', turboRef.current ? 0.35 : 0.55)

      const force: ForceMode =
        serverWin != null ? (serverWin > 0 ? 'small' : 'nowin') : readDevForce()
      const result = evaluateSpin(currentBet, {
        force,
        freeSpin: free,
        multIndex: free ? multRef.current : 0,
      })
      if (serverWin != null) {
        result.totalWin = serverWin
        result.triggerFreeSpins = false
        result.freeSpinsAwarded = 0
        result.scatterCount = 0
        result.scatterWin = 0
      }

      // Reveal final grid while columns are still spinning so stops can land on results.
      setGrid(result.grid)

      const duration = turboRef.current ? TURBO_SPIN_MS : SPIN_MS
      const stagger = turboRef.current ? TURBO_STOP_STAGGER : REEL_STOP_STAGGER

      // Spinning window then sequential stop
      await sleep(Math.max(200, duration - stagger * 5))
      setPhase('reelStopping')
      const stops = Array(6).fill(false) as boolean[]
      for (let i = 0; i < 6; i++) {
        await sleep(stagger)
        stops[i] = true
        setStoppingReels([...stops])
        playSfx('stop', 0.25)
        // Special land anticipation
        const col = result.grid[i]!
        if (col.some((c) => c.id === 'scatter' || c.id === 'wild')) {
          playSfx(col.some((c) => c.id === 'scatter') ? 'scatter' : 'wild', 0.4)
        }
      }

      setSpinning(false)
      setStoppingReels(Array(6).fill(false))
      setLastResult(result)
      setMultIndex(result.multIndex)
      multRef.current = result.multIndex

      if (result.goldActivated.length) playSfx('gold', 0.4)

      setPhase('evaluating')
      await presentWin(result)

      setHistory((h) =>
        [
          {
            id: `${Date.now()}`,
            bet: currentBet,
            win: result.totalWin,
            at: Date.now(),
            note: result.triggerFreeSpins
              ? `Free spins +${result.freeSpinsAwarded}`
              : result.totalWin > 0
                ? `${result.wayWins.length} ways`
                : 'No win',
          },
          ...h,
        ].slice(0, 40),
      )

      // Free spins trigger
      if (result.triggerFreeSpins && !free) {
        autoStop.current = true
        setAutoLeft(0)
        setPhase('featureTriggered')
        setStatusMsg('FREE SPINS TRIGGERED!')
        playSfx('freespins', 0.7)
        await sleep(900)
        setPhase('freeSpinsIntro')
        setInFreeSpins(true)
        setFreeSpinsLeft(result.freeSpinsAwarded || FREE_SPIN_COUNT)
        setFreeSpinTotalWin(result.totalWin)
        await sleep(1400)
        setPhase('freeSpins')
        busy.current = false
        // Kick free spin loop
        window.setTimeout(() => {
          void runSpin({ free: true })
        }, 400)
        return
      }

      if (free) {
        const left = freeRef.current.left - 1
        const total = freeRef.current.total + result.totalWin
        setFreeSpinsLeft(left)
        setFreeSpinTotalWin(total)
        if (result.triggerFreeSpins) {
          const extra = result.freeSpinsAwarded
          setFreeSpinsLeft(left + extra)
          setStatusMsg(`+${extra} FREE SPINS!`)
          playSfx('feature', 0.55)
        }
        if (left <= 0 && !result.triggerFreeSpins) {
          setPhase('freeSpinsOutro')
          setStatusMsg(`TOTAL BONUS WIN ${total.toFixed(2)}`)
          playSfx('bigwin', 0.55)
          await sleep(1800)
          setInFreeSpins(false)
          setFreeSpinsLeft(0)
          setMultIndex(0)
          multRef.current = 0
          setPhase('ready')
          busy.current = false
          return
        }
        busy.current = false
        window.setTimeout(() => {
          void runSpin({ free: true })
        }, 500)
        return
      }

      // Reset base game multiplier after paid spin
      if (!free) {
        setMultIndex(0)
        multRef.current = 0
      }

      setPhase('ready')
      busy.current = false

      // Auto spin continuation
      if (autoRef.current > 0 && !autoStop.current) {
        if (result.triggerFreeSpins) {
          setAutoLeft(0)
          autoRef.current = 0
          return
        }
        const nextAuto = Math.max(0, autoRef.current - 1)
        autoRef.current = nextAuto
        setAutoLeft(nextAuto)
        if (nextAuto > 0) {
          window.setTimeout(() => {
            if (autoRef.current > 0 && !autoStop.current) void runSpin()
          }, 650)
        }
      }
    },
    [canAfford, debit, onMessage, playSfx, presentWin, reducedMotion],
  )

  const startAuto = useCallback(
    (count: number) => {
      if (busy.current || freeRef.current.inFree) return
      autoStop.current = false
      autoRef.current = count
      setAutoLeft(count)
      setModal(null)
      setPhase('ready')
      playSfx('button')
      window.setTimeout(() => void runSpin(), 200)
    },
    [playSfx, runSpin],
  )

  const stopAuto = useCallback(() => {
    autoStop.current = true
    autoRef.current = 0
    setAutoLeft(0)
    playSfx('button', 0.4)
  }, [playSfx])

  const buyFeature = useCallback(async () => {
    if (busy.current || freeRef.current.inFree) return
    if (isLivePlayer()) {
      playSfx('error')
      setStatusMsg('FEATURE BUY TEMPORARILY UNAVAILABLE')
      onMessage?.('Feature Buy is unavailable in live play')
      return
    }
    const cost = featureBuyCost(betRef.current)
    if (!canAfford(cost)) {
      playSfx('error')
      setStatusMsg('INSUFFICIENT BALANCE')
      return
    }
    if (!debit(cost)) {
      playSfx('error')
      return
    }
    setModal(null)
    playSfx('feature', 0.65)
    setPhase('freeSpinsIntro')
    setInFreeSpins(true)
    setFreeSpinsLeft(FREE_SPIN_COUNT)
    setFreeSpinTotalWin(0)
    setMultIndex(0)
    multRef.current = 0
    setStatusMsg('HIGH NOON FREE SPINS')
    await sleep(1200)
    setPhase('freeSpins')
    void runSpin({ free: true })
  }, [canAfford, debit, onMessage, playSfx, runSpin])

  const markReady = useCallback(() => {
    setPhase('ready')
  }, [])

  const controlsLocked =
    spinning ||
    phase === 'spinning' ||
    phase === 'reelStopping' ||
    phase === 'winPresentation' ||
    phase === 'freeSpinsIntro' ||
    phase === 'featureTriggered' ||
    inFreeSpins

  return {
    phase,
    setPhase,
    loadProgress,
    setLoadProgress,
    markReady,
    bet,
    setBetAmount,
    adjustBet,
    grid,
    spinning,
    stoppingReels,
    lastResult,
    lastWin,
    displayWin,
    turbo,
    setTurbo,
    autoLeft,
    startAuto,
    stopAuto,
    autoOptions: AUTO_SPIN_OPTIONS,
    statusMsg,
    multIndex,
    multValue: MULTIPLIER_TRACK[Math.min(multIndex, MULTIPLIER_TRACK.length - 1)]!,
    freeSpinsLeft,
    freeSpinTotalWin,
    inFreeSpins,
    winTier,
    winningCells,
    history,
    shake,
    modal,
    openModal,
    closeModal,
    buyFeature,
    runSpin,
    controlsLocked,
    featureCost: featureBuyCost(bet),
  }
}
