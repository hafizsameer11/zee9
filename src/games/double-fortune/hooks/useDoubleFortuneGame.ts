import { useCallback, useEffect, useRef, useState } from 'react'
import { roundLossStatus } from '../../lib/roundResult'
import {
  AUTO_SPIN_OPTIONS,
  BET_AMOUNTS,
  DEFAULT_BET,
  FREE_SPIN_COUNT,
  REEL_STOP_STAGGER,
  SPIN_MS,
  STATUS_MESSAGES,
  TURBO_SPIN_MS,
  TURBO_STOP_STAGGER,
  formatMoney,
} from '../constants/gameConfig'
import {
  applyServerSpinResult,
  emptyGrid,
  evaluateSpin,
  readDevForce,
  type Cell,
  type ForceMode,
  type SpinResult,
} from '../engines/doubleFortuneEngine'
import type { DfSfx } from './useDoubleFortuneSound'
import { isLivePlayer, preconnectSlot, serverSlotSpin } from '../../lib/serverSpin'

export type GamePhase =
  | 'studio'
  | 'loading'
  | 'getStarted'
  | 'ready'
  | 'spinning'
  | 'reelStopping'
  | 'winPresentation'
  | 'featureTriggered'
  | 'freeSpinsIntro'
  | 'freeSpins'
  | 'freeSpinsOutro'
  | 'insufficientBalance'
  | 'modalOpen'

type WalletFns = {
  canAfford: (n: number) => boolean
  debit: (n: number) => boolean
  credit: (n: number) => void
  refresh?: () => void
}

type Opts = WalletFns & {
  playSfx: (id: DfSfx, volume?: number) => void
  onMessage?: (msg: string | null) => void
  reducedMotion?: boolean
  demo?: boolean
}

function sleep(ms: number) {
  return new Promise<void>((r) => setTimeout(r, ms))
}

export function useDoubleFortuneGame(opts: Opts) {
  const { canAfford, debit, credit, refresh, playSfx, onMessage, reducedMotion, demo } = opts
  const busy = useRef(false)
  const autoStop = useRef(false)

  const [phase, setPhase] = useState<GamePhase>('studio')
  const [loadProgress, setLoadProgress] = useState(0)
  const [bet, setBet] = useState(DEFAULT_BET)
  const [grid, setGrid] = useState<Cell[][]>(() => emptyGrid())
  const [gridB, setGridB] = useState<Cell[][] | null>(null)
  const [spinning, setSpinning] = useState(false)
  const [stoppingReels, setStoppingReels] = useState<boolean[]>(() => Array(5).fill(false))
  const [lastResult, setLastResult] = useState<SpinResult | null>(null)
  const [lastWin, setLastWin] = useState(0)
  const [displayWin, setDisplayWin] = useState(0)
  const [turbo, setTurbo] = useState(false)
  const [turboToast, setTurboToast] = useState(false)
  const [autoLeft, setAutoLeft] = useState(0)
  const [statusMsg, setStatusMsg] = useState<string>(STATUS_MESSAGES[0]!)
  const [freeSpinsLeft, setFreeSpinsLeft] = useState(0)
  const [freeSpinTotalWin, setFreeSpinTotalWin] = useState(0)
  const [inFreeSpins, setInFreeSpins] = useState(false)
  const [winTier, setWinTier] = useState<'none' | 'small' | 'medium' | 'big'>('none')
  const [winningCells, setWinningCells] = useState<Set<string>>(new Set())
  const [winReaction, setWinReaction] = useState<'none' | 'small' | 'medium' | 'large'>('none')
  const [curtain, setCurtain] = useState(0)
  const [modal, setModal] = useState<null | 'bet' | 'auto' | 'paytable' | 'menu'>(null)

  const phaseRef = useRef(phase)
  phaseRef.current = phase
  const betRef = useRef(bet)
  betRef.current = bet
  const turboRef = useRef(turbo)
  turboRef.current = turbo
  const freeRef = useRef({ inFree: false, left: 0, total: 0 })
  freeRef.current = { inFree: inFreeSpins, left: freeSpinsLeft, total: freeSpinTotalWin }
  const autoRef = useRef(0)
  autoRef.current = autoLeft

  useEffect(() => preconnectSlot('double-fortune'), [])

  useEffect(() => {
    if (phase !== 'ready' || spinning || modal) return
    const t = window.setInterval(() => {
      setStatusMsg((m) => {
        const i = STATUS_MESSAGES.indexOf(m as (typeof STATUS_MESSAGES)[number])
        return STATUS_MESSAGES[(i + 1) % STATUS_MESSAGES.length]!
      })
    }, 4500)
    return () => clearInterval(t)
  }, [phase, spinning, modal])

  const openModal = useCallback(
    (m: NonNullable<typeof modal>) => {
      if (busy.current && m !== 'menu') return
      setModal(m)
      setPhase((p) => (p === 'studio' || p === 'loading' || p === 'getStarted' ? p : 'modalOpen'))
      playSfx('button', 0.4)
    },
    [playSfx],
  )

  const closeModal = useCallback(() => {
    setModal(null)
    setPhase((p) =>
      p === 'studio' || p === 'loading' || p === 'getStarted'
        ? p
        : freeRef.current.inFree
          ? 'freeSpins'
          : 'ready',
    )
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

  const toggleTurbo = useCallback(() => {
    setTurbo((t) => {
      const next = !t
      if (next) {
        setTurboToast(true)
        playSfx('turbo', 0.5)
        window.setTimeout(() => setTurboToast(false), 1600)
      } else playSfx('button', 0.35)
      return next
    })
  }, [playSfx])

  const countUpWin = useCallback(
    async (target: number) => {
      const steps = reducedMotion ? 8 : 22
      for (let i = 1; i <= steps; i++) {
        setDisplayWin(Math.round(((target * i) / steps) * 100) / 100)
        await sleep(reducedMotion ? 16 : 28)
      }
      setDisplayWin(target)
    },
    [reducedMotion],
  )

  const presentWin = useCallback(
    async (result: SpinResult) => {
      const win = result.totalWin
      setLastWin(win)
      const cells = new Set<string>()
      result.lineWins.forEach((w) =>
        w.positions.forEach((p) => cells.add(`${p.col}:${p.row}${result.gridB ? ':a' : ''}`)),
      )
      // mark board A cells
      result.lineWins.forEach((w) => w.positions.forEach((p) => cells.add(`${p.col}:${p.row}`)))
      setWinningCells(cells)

      let tier: 'none' | 'small' | 'medium' | 'big' = 'none'
      if (win >= betRef.current * 20) tier = 'big'
      else if (win >= betRef.current * 6) tier = 'medium'
      else if (win > 0) tier = 'small'
      setWinTier(tier)
      setWinReaction(tier === 'big' ? 'large' : tier === 'medium' ? 'medium' : tier === 'small' ? 'small' : 'none')

      if (win > 0) {
        setPhase('winPresentation')
        setStatusMsg(`WIN ${formatMoney(win)}`)
        playSfx(tier === 'big' ? 'bigwin' : 'win', tier === 'big' ? 0.7 : 0.45)
        if (tier === 'big') playSfx('coin', 0.4)
        await countUpWin(win)
        if (!isLivePlayer()) credit(win)
        await sleep(tier === 'big' ? 1500 : tier === 'medium' ? 750 : 400)
        setWinningCells(new Set())
        setWinReaction('none')
      } else {
        setDisplayWin(0)
        setStatusMsg(roundLossStatus(betRef.current))
        onMessage?.(roundLossStatus(betRef.current))
      }
    },
    [countUpWin, credit, onMessage, playSfx],
  )

  const runSpin = useCallback(
    async (spinOpts?: { free?: boolean }) => {
      if (busy.current) return
      const free = spinOpts?.free === true || freeRef.current.inFree
      const currentBet = betRef.current
      const useDemo = demo || !isLivePlayer()
      let serverWin: number | undefined
      let serverGrid: unknown = null

      if (!free) {
        if (!canAfford(currentBet)) {
          setPhase('insufficientBalance')
          setStatusMsg('INSUFFICIENT BALANCE')
          onMessage?.('Insufficient balance')
          setAutoLeft(0)
          return
        }
        if (!useDemo && isLivePlayer()) {
          try {
            const settled = await serverSlotSpin('double-fortune', currentBet)
            serverWin = settled?.win ?? 0
            serverGrid = settled?.payload?.grid ?? null
            void refresh?.()
          } catch (e: any) {
            onMessage?.(e?.message || 'Spin failed')
            return
          }
        } else if (!debit(currentBet)) {
          onMessage?.('Bet failed')
          return
        }
      }

      busy.current = true
      setSpinning(true)
      setStoppingReels(Array(5).fill(false))
      setPhase('spinning')
      setLastWin(0)
      setDisplayWin(0)
      setWinningCells(new Set())
      setWinTier('none')
      setLastResult(null)
      setStatusMsg(free ? `FREE SPIN · ${freeRef.current.left} LEFT` : 'GOOD LUCK!')
      playSfx('spin', turboRef.current ? 0.35 : 0.55)

      const force: ForceMode = readDevForce()
      const result =
        serverWin != null
          ? applyServerSpinResult(currentBet, serverWin, serverGrid as any)
          : evaluateSpin(currentBet, { force, freeSpin: free })

      setGrid(result.grid)
      setGridB(result.gridB)

      const duration = turboRef.current ? TURBO_SPIN_MS : SPIN_MS
      const stagger = turboRef.current ? TURBO_STOP_STAGGER : REEL_STOP_STAGGER

      await sleep(Math.max(180, duration - stagger * 4))
      setPhase('reelStopping')
      const stops = Array(5).fill(false) as boolean[]
      for (let i = 0; i < 5; i++) {
        await sleep(stagger)
        stops[i] = true
        setStoppingReels([...stops])
        playSfx('reelstop', 0.28)
        const col = result.grid[i]!
        if (col.some((c) => c.id === 'scatter')) playSfx('scatter', 0.45)
        else if (col.some((c) => c.id === 'wild')) playSfx('wild', 0.4)
      }

      setSpinning(false)
      setStoppingReels(Array(5).fill(false))
      setLastResult(result)

      await presentWin(result)

      if (result.triggerFreeSpins && !free) {
        autoStop.current = true
        setAutoLeft(0)
        setPhase('featureTriggered')
        setStatusMsg('8 FREE SPINS!')
        playSfx('freespin', 0.75)
        playSfx('chime', 0.5)
        setCurtain(1)
        playSfx('curtain', 0.5)
        await sleep(900)
        setPhase('freeSpinsIntro')
        setInFreeSpins(true)
        setFreeSpinsLeft(result.freeSpinsAwarded || FREE_SPIN_COUNT)
        setFreeSpinTotalWin(result.totalWin)
        setStatusMsg('DOUBLE SET OF REELS · X8')
        await sleep(700)
        setCurtain(0)
        await sleep(600)
        setPhase('freeSpins')
        busy.current = false
        window.setTimeout(() => void runSpin({ free: true }), 450)
        return
      }

      if (free) {
        const left = freeRef.current.left - 1
        const total = freeRef.current.total + result.totalWin
        setFreeSpinsLeft(left)
        setFreeSpinTotalWin(total)
        if (left <= 0) {
          setPhase('freeSpinsOutro')
          setStatusMsg(`TOTAL BONUS WIN ${formatMoney(total)}`)
          playSfx('bigwin', 0.55)
          setCurtain(1)
          await sleep(1200)
          setCurtain(0)
          setInFreeSpins(false)
          setFreeSpinsLeft(0)
          setGridB(null)
          setPhase('ready')
          busy.current = false
          return
        }
        busy.current = false
        window.setTimeout(() => void runSpin({ free: true }), 480)
        return
      }

      setPhase('ready')
      busy.current = false

      if (autoRef.current > 0 && !autoStop.current) {
        const nextAuto = Math.max(0, autoRef.current - 1)
        autoRef.current = nextAuto
        setAutoLeft(nextAuto)
        if (nextAuto > 0) {
          window.setTimeout(() => {
            if (autoRef.current > 0 && !autoStop.current) void runSpin()
          }, 600)
        }
      }
    },
    [canAfford, credit, debit, demo, onMessage, playSfx, presentWin, refresh],
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

  const enterGame = useCallback(() => {
    setPhase('ready')
    playSfx('chime', 0.45)
  }, [playSfx])

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
    enterGame,
    bet,
    setBetAmount,
    adjustBet,
    grid,
    gridB,
    spinning,
    stoppingReels,
    lastResult,
    lastWin,
    displayWin,
    turbo,
    toggleTurbo,
    turboToast,
    autoLeft,
    startAuto,
    stopAuto,
    autoOptions: AUTO_SPIN_OPTIONS,
    statusMsg,
    freeSpinsLeft,
    freeSpinTotalWin,
    inFreeSpins,
    winTier,
    winningCells,
    winReaction,
    curtain,
    modal,
    openModal,
    closeModal,
    runSpin,
    controlsLocked,
  }
}
