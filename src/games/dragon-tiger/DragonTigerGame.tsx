import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useWallet } from '../../context/WalletContext'
import { sound } from '../../lib/sound'
import type { GameComponentProps } from '../types'
import {
  getDesignCanvasStyle,
  getDesignScaleShellStyle,
  useDesignScale,
} from '../hooks/useDesignScale'
import {
  ASSET,
  CHIP_VALUES,
  DESIGN_H,
  DESIGN_W,
  type BetSelection,
  type ChipValue,
} from './constants/gameConfig'
import BettingTable from './components/BettingTable'
import DragonTigerHeader from './components/DragonTigerHeader'
import GameFooter from './components/GameFooter'
import SceneBackground from './components/SceneBackground'
import SidePlayers, { DEMO_LEFT, DEMO_RIGHT } from './components/SidePlayers'
import TrendModal from './components/TrendModal'
import {
  ClosedNotice,
  GameLoadingScreen,
  StopBettingBanner,
  VictoryOverlay,
  WinnerStage,
} from './components/Overlays'
import { useDragonTigerGame } from './hooks/useDragonTigerGame'
import {
  usePageVisible,
  usePreloadAssets,
  usePrefersReducedMotion,
  useDragonTigerSound,
} from './hooks/useDragonTigerSound'
import type { ZoneAggregate } from './utils/payoutCalculator'
import styles from './styles/dragonTiger.module.css'

type ChipStack = { id: string; value: number; x: number; y: number; mine?: boolean }

export default function DragonTigerGame({ onMessage }: GameComponentProps) {
  const navigate = useNavigate()
  const viewportRef = useRef<HTMLDivElement>(null)
  const canvasRef = useRef<HTMLDivElement>(null)
  const flyLayerRef = useRef<HTMLDivElement>(null)
  const layout = useDesignScale(viewportRef, DESIGN_W, DESIGN_H)
  const { balance, debit, credit, canAfford, refresh } = useWallet()
  const reducedMotion = usePrefersReducedMotion()
  const pageVisible = usePageVisible()
  const { muted, toggle, play } = useDragonTigerSound()
  const { ready, progress } = usePreloadAssets()
  const [trendOpen, setTrendOpen] = useState(false)
  const [helpOpen, setHelpOpen] = useState(false)
  const [botByZone, setBotByZone] = useState<Map<BetSelection, ZoneAggregate>>(() => new Map())
  const [chipStacks, setChipStacks] = useState<ChipStack[]>([])
  const [pool, setPool] = useState({ dragon: 0, tiger: 0, tie: 0 })
  const lastBotSfx = useRef(0)
  const stackSeq = useRef(0)

  const game = useDragonTigerGame({
    canAfford,
    debit,
    credit,
    assetsReady: ready,
    assetProgress: progress,
    reducedMotion,
    onMessage,
    playSfx: play,
    onWalletChange: () => {
      void refresh()
    },
  })

  const showOutcome =
    game.state === 'SHOWING_WINNER' || game.state === 'PAYOUT' || game.state === 'RESETTING'

  // Clear table chips when betting closes or a new round starts.
  useEffect(() => {
    if (!game.bettingOpen) {
      setChipStacks([])
      setBotByZone(new Map())
    }
  }, [game.bettingOpen, game.roundId])

  // Live: pool from server zone totals. Demo: soft fake pools.
  useEffect(() => {
    if (game.live) {
      setPool({
        dragon: game.zoneTotals.dragon || 0,
        tiger: game.zoneTotals.tiger || 0,
        tie: game.zoneTotals.tie || 0,
      })
      return
    }
    if (game.state === 'BETTING_OPEN') {
      setBotByZone(new Map())
      setChipStacks([])
      setPool({
        dragon: 3500 + Math.floor(Math.random() * 4000),
        tiger: 4000 + Math.floor(Math.random() * 5000),
        tie: 400 + Math.floor(Math.random() * 900),
      })
    }
  }, [game.live, game.zoneTotals, game.state])

  const trendPct = useMemo(() => {
    const slice = game.history.slice(0, 20)
    const d = slice.filter((h) => h === 'dragon').length
    const t = slice.filter((h) => h === 'tiger').length
    const n = Math.max(1, d + t)
    return {
      dragon: Math.round((d / n) * 100),
      tiger: Math.round((t / n) * 100),
    }
  }, [game.history])

  const toCanvasPoint = useCallback(
    (rect: DOMRect) => {
      const board = canvasRef.current?.getBoundingClientRect()
      const scale = layout.scale || 1
      if (!board) return { x: DESIGN_W / 2, y: DESIGN_H / 2 }
      return {
        x: (rect.left + rect.width / 2 - board.left) / scale,
        y: (rect.top + rect.height / 2 - board.top) / scale,
      }
    },
    [layout.scale],
  )

  const pushStack = useCallback((selection: BetSelection, value: number, mine = false) => {
    stackSeq.current += 1
    const id = `${selection}-${stackSeq.current}`
    setChipStacks((prev) => {
      const next = [
        ...prev,
        {
          id,
          value,
          x: 20 + Math.random() * 60,
          y: 20 + Math.random() * 55,
          mine,
        },
      ]
      return next.length > 30 ? next.slice(next.length - 30) : next
    })
  }, [])

  const spawnFly = useCallback(
    (
      src: string,
      from: { x: number; y: number },
      to: { x: number; y: number },
      onDone: () => void,
      opts?: { soft?: boolean; size?: number },
    ) => {
      const layer = flyLayerRef.current
      if (!layer || reducedMotion || !pageVisible) {
        onDone()
        return
      }
      const soft = opts?.soft ?? false
      const size = opts?.size ?? (soft ? 28 : 36)
      const half = size / 2
      const now = performance.now()
      if (!soft || now - lastBotSfx.current > 90) {
        lastBotSfx.current = now
        if (!soft) {
          play('whoosh')
          play('chip')
        } else {
          sound.play('whoosh', { volume: 0.14 })
          sound.play('chip', { volume: 0.22 })
        }
      }
      const img = document.createElement('img')
      img.src = src
      img.alt = ''
      img.draggable = false
      img.decoding = 'async'
      img.className = styles.flyChip
      img.style.width = `${size}px`
      img.style.height = `${size}px`
      img.style.left = `${from.x - half}px`
      img.style.top = `${from.y - half}px`
      layer.appendChild(img)

      const dx = to.x - from.x
      const dy = to.y - from.y
      const lift = soft ? 18 : 28
      const duration = soft ? 190 : 230
      let finished = false
      const finish = () => {
        if (finished) return
        finished = true
        img.remove()
        if (mountedOk.current) onDone()
      }
      const animation = img.animate(
        [
          { transform: 'translate3d(0, 0, 0) rotate(-20deg) scale(1)', offset: 0 },
          {
            transform: `translate3d(${dx * 0.58}px, ${dy * 0.4 - lift}px, 0) rotate(105deg) scale(1.06)`,
            offset: 0.55,
          },
          { transform: `translate3d(${dx}px, ${dy}px, 0) rotate(190deg) scale(.9)`, offset: 1 },
        ],
        { duration, easing: 'cubic-bezier(.2,.8,.25,1)', fill: 'forwards' },
      )
      animation.onfinish = finish
      animation.oncancel = finish
      window.setTimeout(finish, duration + 80)
    },
    [reducedMotion, pageVisible, play],
  )

  const mountedOk = useRef(true)
  useEffect(() => {
    mountedOk.current = true
    return () => {
      mountedOk.current = false
    }
  }, [])

  const landBotChip = useCallback(
    (selection: BetSelection, denom: ChipValue) => {
      setBotByZone((prev) => {
        const next = new Map(prev)
        const cur = next.get(selection)
        if (cur) next.set(selection, { ...cur, amount: cur.amount + denom, lastChip: denom })
        else next.set(selection, { selection, amount: denom, lastChip: denom })
        return next
      })
      setPool((p) => ({ ...p, [selection]: p[selection] + denom }))
      pushStack(selection, denom, false)
    },
    [pushStack],
  )

  // Simulated remote player chips during betting (demo only — live uses real zone totals)
  useEffect(() => {
    if (game.live || !game.bettingOpen || !ready || !pageVisible) return
    let cancelled = false
    let inFlight = 0
    const timers: number[] = []
    const queue: Array<() => void> = []
    const sidePlayers = [...DEMO_LEFT, ...DEMO_RIGHT]
    const zones: BetSelection[] = ['dragon', 'tiger', 'dragon', 'tiger', 'tie']

    const pump = () => {
      while (!cancelled && inFlight < 1 && queue.length) {
        const job = queue.shift()!
        inFlight += 1
        job()
      }
    }

    const enqueue = () => {
      if (cancelled || !canvasRef.current) return
      const player = sidePlayers[Math.floor(Math.random() * sidePlayers.length)]!
      const denom = CHIP_VALUES[Math.floor(Math.random() * CHIP_VALUES.length)]!
      const selection = zones[Math.floor(Math.random() * zones.length)]!
      const originEl = canvasRef.current.querySelector(
        `[data-side-player="${player.id}"]`,
      ) as HTMLElement | null
      const cellEl = canvasRef.current.querySelector(`[data-bet="${selection}"]`) as HTMLElement | null
      if (!originEl || !cellEl) return
      const from = toCanvasPoint(originEl.getBoundingClientRect())
      const cell = cellEl.getBoundingClientRect()
      const to = toCanvasPoint(cell)
      to.x += (Math.random() - 0.5) * Math.min(36, cell.width * 0.35)
      to.y += (Math.random() - 0.5) * Math.min(28, cell.height * 0.3)

      queue.push(() => {
        spawnFly(
          ASSET.chip(denom, true),
          from,
          to,
          () => {
            if (!cancelled) landBotChip(selection, denom)
            inFlight = Math.max(0, inFlight - 1)
            pump()
          },
          { soft: true, size: 24 },
        )
      })
      pump()
    }

    const burst = (count: number, stagger: number) => {
      for (let i = 0; i < count; i++) timers.push(window.setTimeout(enqueue, i * stagger))
    }
    burst(2, 180)
    const interval = window.setInterval(() => {
      if (Math.random() > 0.45) burst(1, 0)
    }, 1150)
    timers.push(interval)

    return () => {
      cancelled = true
      for (const t of timers) window.clearTimeout(t)
      window.clearInterval(interval)
    }
  }, [game.live, game.bettingOpen, ready, pageVisible, spawnFly, toCanvasPoint, landBotChip])

  const onPlace = useCallback(
    (selection: BetSelection) => {
      sound.unlock()
      onMessage?.(null)
      const ok = game.placeBet(selection, game.selectedChip)
      if (!ok) return
      if (reducedMotion || !canvasRef.current) {
        pushStack(selection, game.selectedChip, true)
        return
      }
      const chipEl = canvasRef.current.querySelector(
        `[data-chip="${game.selectedChip}"]`,
      ) as HTMLElement | null
      const cellEl = canvasRef.current.querySelector(`[data-bet="${selection}"]`) as HTMLElement | null
      const from = chipEl
        ? toCanvasPoint(chipEl.getBoundingClientRect())
        : { x: DESIGN_W * 0.45, y: DESIGN_H * 0.92 }
      if (!cellEl) {
        pushStack(selection, game.selectedChip, true)
        return
      }
      const cell = cellEl.getBoundingClientRect()
      const to = toCanvasPoint(cell)
      to.x += (Math.random() - 0.5) * 18
      to.y += (Math.random() - 0.5) * 14
      const value = game.selectedChip
      spawnFly(ASSET.chip(value, true), from, to, () => pushStack(selection, value, true), {
        soft: false,
        size: 36,
      })
    },
    [game, reducedMotion, spawnFly, toCanvasPoint, pushStack, onMessage],
  )

  const isLoading = game.state === 'LOADING'

  return (
    <div ref={viewportRef} className={styles.viewport}>
      <div style={getDesignScaleShellStyle(layout)}>
        <div ref={canvasRef} className={styles.shell} style={getDesignCanvasStyle(layout)}>
          {isLoading ? (
            <GameLoadingScreen progress={game.loadProgress} />
          ) : (
            <>
          <SceneBackground paused={!pageVisible} />

          <DragonTigerHeader
            countdown={game.countdown}
            bettingOpen={game.bettingOpen}
            statusText={game.statusText}
            history={game.history}
            dragonCard={game.dragonCard}
            tigerCard={game.tigerCard}
            dragonRevealed={game.dragonRevealed}
            tigerRevealed={game.tigerRevealed}
            dealingPhase={game.dealingPhase}
            winner={game.winner}
            muted={muted}
            reducedMotion={reducedMotion}
            onBack={() => {
              sound.playClick()
              navigate('/home')
            }}
            onToggleSound={toggle}
            onTrend={() => {
              sound.playClick()
              setTrendOpen(true)
            }}
            onHelp={() => {
              sound.playClick()
              setHelpOpen(true)
            }}
          />

          <SidePlayers />

          <div className={styles.stage}>
            <BettingTable
              byZone={game.byZone}
              botByZone={botByZone}
              chipStacks={chipStacks}
              disabled={!game.bettingOpen}
              winner={game.winner}
              showOutcome={showOutcome}
              poolDragon={pool.dragon + (game.byZone.get('dragon')?.amount ?? 0)}
              poolTiger={pool.tiger + (game.byZone.get('tiger')?.amount ?? 0)}
              poolTie={pool.tie + (game.byZone.get('tie')?.amount ?? 0)}
              trendPct={trendPct}
              lockedSide={game.lockedSide}
              onPlace={onPlace}
            />
          </div>

          <div className={styles.roundId}>{game.roundId}</div>

          <GameFooter
            balance={balance}
            stake={game.stake}
            bettingOpen={game.bettingOpen}
            hasBets={game.bets.length > 0}
            canRebet={game.hasLastRound}
            selectedChip={game.selectedChip}
            onSelectChip={(v) => {
              play('chipSelect')
              game.setSelectedChip(v)
            }}
            onUndo={() => game.undo()}
            onClear={() => game.clear()}
            onRebet={() => game.rebet()}
            onDouble={() => game.doubleBets()}
          />

          <div ref={flyLayerRef} className={styles.flyLayer} aria-hidden />

          <StopBettingBanner show={game.showStopBanner} />
          <ClosedNotice show={game.closedNotice} />
          <WinnerStage
            winner={game.winner}
            show={game.state === 'SHOWING_WINNER' || game.state === 'PAYOUT'}
            reducedMotion={reducedMotion}
          />
          <VictoryOverlay show={game.showVictory} amount={game.lastPayout} />

          <TrendModal open={trendOpen} history={game.trend} onClose={() => setTrendOpen(false)} />

          {helpOpen && (
            <div className={styles.helpPanel} onClick={() => setHelpOpen(false)} role="presentation">
              <div className={styles.helpCard} onClick={(e) => e.stopPropagation()} role="dialog">
                <h3>HOW TO PLAY</h3>
                <p>
                  Select a chip and tap Dragon, Tie, or Tiger — one side per round only. Higher card
                  wins (Ace low, King high). Suits do not matter. Equal ranks are Tie. Dragon/Tiger
                  pay x2 total return; Tie pays x9. Betting closes when the timer ends.
                </p>
              </div>
            </div>
          )}
            </>
          )}
        </div>
      </div>
    </div>
  )
}
