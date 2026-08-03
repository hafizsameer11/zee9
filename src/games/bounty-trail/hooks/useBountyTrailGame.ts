import { useCallback, useEffect, useRef, useState } from 'react'
import { roundLossStatus } from '../../lib/roundResult'
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
  type WayWin,
} from '../engines/bountyTrailEngine'
import type { BountySfx } from './useBountyTrailSound'
import {
  isLivePlayer,
  preconnectSlot,
  serverSlotBuyFeature,
  serverSlotSpin,
} from '../../lib/serverSpin'

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
  refresh?: () => Promise<void>
}

type Opts = WalletFns & {
  playSfx: (id: BountySfx, volume?: number) => void
  onMessage?: (msg: string | null) => void
  reducedMotion?: boolean
}

type ServerFrame = {
  grid: Cell[][]
  wayWins: WayWin[]
  lineWin: number
  scatterCount: number
  scatterWin: number
  totalWin: number
  multIndex: number
  appliedMult: number
  triggerFreeSpins: boolean
  freeSpinsAwarded: number
  goldActivated: Array<{ col: number; row: number; mult: number }>
  freeSpins?: ServerFrame[]
  featureTotal?: number
}

function sleep(ms: number) {
  return new Promise<void>((r) => setTimeout(r, ms))
}

function frameToResult(frame: ServerFrame): SpinResult {
  return {
    grid: frame.grid,
    wayWins: frame.wayWins || [],
    lineWin: frame.lineWin || 0,
    scatterCount: frame.scatterCount || 0,
    scatterWin: frame.scatterWin || 0,
    totalWin: frame.totalWin || 0,
    multIndex: frame.multIndex || 0,
    appliedMult: frame.appliedMult || 1,
    triggerFreeSpins: !!frame.triggerFreeSpins,
    freeSpinsAwarded: frame.freeSpinsAwarded || 0,
    goldActivated: frame.goldActivated || [],
  }
}

function gameSlug(): 'wild-bounty' | 'bounty-trail' {
  return 'wild-bounty'
}

export function useBountyTrailGame(opts: Opts) {
  const { canAfford, debit, credit, refresh, playSfx, onMessage, reducedMotion } = opts
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
  const [goldActivating, setGoldActivating] = useState<Set<string>>(new Set())
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
  /** Server-authored free-spin queue waiting to play. */
  const pendingFreeSpins = useRef<ServerFrame[]>([])

  useEffect(() => {
    preconnectSlot(gameSlug())
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

  const openModal = useCallback(
    (m: NonNullable<typeof modal>) => {
      if (busy.current && m !== 'quit' && m !== 'menu') return
      setModal(m)
      setPhase((p) => (p === 'loading' ? p : 'modalOpen'))
      playSfx('button', 0.4)
    },
    [playSfx],
  )

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

  const countUpWin = useCallback(
    async (target: number) => {
      const steps = reducedMotion ? 8 : 24
      for (let i = 1; i <= steps; i++) {
        setDisplayWin(Math.round(((target * i) / steps) * 100) / 100)
        await sleep(reducedMotion ? 16 : 28)
      }
      setDisplayWin(target)
    },
    [reducedMotion],
  )

  const presentWin = useCallback(
    async (result: SpinResult, opts?: { creditLocal?: boolean }) => {
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
        if (opts?.creditLocal) credit(win)
        await sleep(tier === 'big' ? 1400 : tier === 'medium' ? 700 : 380)
        setWinningCells(new Set())
      } else {
        setDisplayWin(0)
        const staked = betRef.current
        setStatusMsg(roundLossStatus(staked))
        onMessage?.(roundLossStatus(staked))
      }
    },
    [countUpWin, credit, onMessage, playSfx, reducedMotion],
  )

  const animateReelsTo = useCallback(
    async (result: SpinResult) => {
      setGrid(result.grid)
      const duration = turboRef.current ? TURBO_SPIN_MS : SPIN_MS
      const stagger = turboRef.current ? TURBO_STOP_STAGGER : REEL_STOP_STAGGER
      await sleep(Math.max(200, duration - stagger * 5))
      setPhase('reelStopping')
      const stops = Array(6).fill(false) as boolean[]
      for (let i = 0; i < 6; i++) {
        await sleep(stagger)
        stops[i] = true
        setStoppingReels([...stops])
        playSfx('stop', 0.25)
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
      if (result.goldActivated.length) {
        playSfx('gold', 0.4)
        const cells = new Set(result.goldActivated.map((g) => `${g.col}:${g.row}`))
        setGoldActivating(cells)
        await sleep(reducedMotion ? 200 : 500)
        setGoldActivating(new Set())
      }
      setPhase('evaluating')
    },
    [playSfx, reducedMotion],
  )

  const playFreeSpinQueue = useCallback(
    async (frames: ServerFrame[], seedTotal: number, authoritativeTotal?: number) => {
      setInFreeSpins(true)
      setFreeSpinsLeft(frames.length)
      setFreeSpinTotalWin(seedTotal)
      let total = seedTotal
      for (let i = 0; i < frames.length; i++) {
        const frame = frames[i]!
        const left = frames.length - i
        setFreeSpinsLeft(left)
        setStatusMsg(`FREE SPIN · ${left}`)
        setSpinning(true)
        setStoppingReels(Array(6).fill(false))
        setPhase('spinning')
        setDisplayWin(0)
        setWinningCells(new Set())
        playSfx('spin', turboRef.current ? 0.35 : 0.55)
        const result = frameToResult(frame)
        await animateReelsTo(result)
        await presentWin(result, { creditLocal: false })
        total = Math.round((total + result.totalWin) * 100) / 100
        setFreeSpinTotalWin(total)
        if (result.triggerFreeSpins) {
          setStatusMsg(`+${result.freeSpinsAwarded} FREE SPINS!`)
          playSfx('feature', 0.55)
          await sleep(600)
        }
      }
      const finalTotal =
        authoritativeTotal != null && authoritativeTotal >= 0 ? authoritativeTotal : total
      setFreeSpinTotalWin(finalTotal)
      setPhase('freeSpinsOutro')
      setStatusMsg(`TOTAL BONUS WIN ${formatMoney(finalTotal)}`)
      playSfx('bigwin', 0.55)
      await sleep(1800)
      setInFreeSpins(false)
      setFreeSpinsLeft(0)
      setMultIndex(0)
      multRef.current = 0
      pendingFreeSpins.current = []
      setPhase('ready')
    },
    [animateReelsTo, playSfx, presentWin],
  )

  const runSpin = useCallback(
    async (opts?: { free?: boolean }) => {
      if (busy.current) return
      // Server-authored free spins are played via playFreeSpinQueue — no local free loop.
      if (opts?.free === true && isLivePlayer()) return

      const free = opts?.free === true || freeRef.current.inFree
      const currentBet = betRef.current
      const live = isLivePlayer()

      if (!free) {
        if (!canAfford(currentBet)) {
          playSfx('error')
          setPhase('insufficientBalance')
          setStatusMsg('INSUFFICIENT BALANCE')
          onMessage?.('Insufficient balance')
          setAutoLeft(0)
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

      let result: SpinResult
      let freeSpinFrames: ServerFrame[] | undefined
      let featureTotal: number | undefined

      try {
        if (live && !free) {
          const settled = await serverSlotSpin(gameSlug(), currentBet)
          if (!settled) throw new Error('Not authenticated')
          const payload = settled.payload as unknown as ServerFrame
          if (!payload?.grid) throw new Error('Invalid spin payload')
          result = frameToResult(payload)
          // Server already settled the full feature total (base + free spins)
          result.totalWin = Number(settled.win ?? payload.featureTotal ?? payload.totalWin ?? 0)
          freeSpinFrames = payload.freeSpins
          featureTotal = payload.featureTotal
          await refresh?.()
        } else {
          // Preview / demo path — local math
          if (!free) {
            if (!debit(currentBet)) {
              playSfx('error')
              onMessage?.('Bet failed')
              busy.current = false
              setSpinning(false)
              return
            }
          }
          const force: ForceMode = readDevForce()
          result = evaluateSpin(currentBet, {
            force,
            freeSpin: free,
            multIndex: free ? multRef.current : 0,
          })
        }
      } catch (e: any) {
        busy.current = false
        setSpinning(false)
        setPhase('ready')
        playSfx('error')
        onMessage?.(e?.message || 'Spin failed')
        return
      }

      await animateReelsTo(result)

      // Present base-spin win then enter server-authored bonus
      if (live && freeSpinFrames?.length) {
        const baseOnly: SpinResult = {
          ...result,
          totalWin: Math.round(((result.lineWin || 0) + (result.scatterWin || 0)) * 100) / 100,
        }
        await presentWin(baseOnly, { creditLocal: false })
      } else {
        await presentWin(result, { creditLocal: !live })
      }

      setHistory((h) =>
        [
          {
            id: `${Date.now()}`,
            bet: currentBet,
            win: live && featureTotal != null ? featureTotal : result.totalWin,
            at: Date.now(),
            note:
              freeSpinFrames?.length || result.triggerFreeSpins
                ? `Free spins +${result.freeSpinsAwarded || freeSpinFrames?.length || 0}`
                : result.totalWin > 0
                  ? `${result.wayWins.length} ways`
                  : 'No win',
          },
          ...h,
        ].slice(0, 40),
      )

      // Live free-spin sequence (server-authored)
      if (live && freeSpinFrames && freeSpinFrames.length > 0) {
        autoStop.current = true
        setAutoLeft(0)
        setPhase('featureTriggered')
        setStatusMsg('FREE SPINS TRIGGERED!')
        playSfx('freespins', 0.7)
        await sleep(900)
        setPhase('freeSpinsIntro')
        await sleep(1000)
        setPhase('freeSpins')
        const seed =
          Math.round(((result.lineWin || 0) + (result.scatterWin || 0)) * 100) / 100
        await playFreeSpinQueue(
          freeSpinFrames,
          seed,
          featureTotal ?? result.totalWin,
        )
        await refresh?.()
        busy.current = false
        return
      }

      // Demo free-spin trigger
      if (result.triggerFreeSpins && !free && !live) {
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
        window.setTimeout(() => {
          void runSpin({ free: true })
        }, 400)
        return
      }

      // Demo free-spin continuation
      if (free && !live) {
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
          setStatusMsg(`TOTAL BONUS WIN ${formatMoney(total)}`)
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

      if (!free) {
        setMultIndex(0)
        multRef.current = 0
      }

      setPhase('ready')
      busy.current = false

      if (autoRef.current > 0 && !autoStop.current) {
        if (result.triggerFreeSpins || freeSpinFrames?.length) {
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
    [
      animateReelsTo,
      canAfford,
      debit,
      onMessage,
      playFreeSpinQueue,
      playSfx,
      presentWin,
      refresh,
    ],
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
    const currentBet = betRef.current
    const cost = featureBuyCost(currentBet)
    const live = isLivePlayer()

    if (!canAfford(cost)) {
      playSfx('error')
      setStatusMsg('INSUFFICIENT BALANCE')
      return
    }

    setModal(null)
    playSfx('feature', 0.65)

    if (live) {
      busy.current = true
      try {
        const settled = await serverSlotBuyFeature(gameSlug(), currentBet)
        if (!settled) throw new Error('Not authenticated')
        const payload = settled.payload as unknown as ServerFrame
        const frames = payload.freeSpins || []
        const featureWin = Number(settled.win ?? payload.featureTotal ?? 0)
        await refresh?.()
        setPhase('freeSpinsIntro')
        setStatusMsg('HIGH NOON FREE SPINS')
        await sleep(1200)
        setPhase('freeSpins')
        if (frames.length === 0) {
          setPhase('ready')
          busy.current = false
          onMessage?.(featureWin > 0 ? `Feature win ${formatMoney(featureWin)}` : 'No bonus win')
          return
        }
        await playFreeSpinQueue(frames, 0, featureWin)
        await refresh?.()
        if (featureWin > 0) onMessage?.(`Feature win ${formatMoney(featureWin)}`)
        busy.current = false
      } catch (e: any) {
        busy.current = false
        setPhase('ready')
        playSfx('error')
        onMessage?.(e?.message || 'Feature buy failed')
      }
      return
    }

    // Demo path
    if (!debit(cost)) {
      playSfx('error')
      return
    }
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
  }, [canAfford, debit, onMessage, playFreeSpinQueue, playSfx, refresh, runSpin])

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
    goldActivating,
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
