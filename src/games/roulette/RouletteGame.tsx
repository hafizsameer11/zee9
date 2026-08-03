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
import { useGameLeaveGuard } from '../hooks/useGameLeaveGuard'
import { ASSET, CHIP_VALUES, type ChipValue } from './constants/rouletteConfig'
import { GameFooter, GameHeader } from './components/GameChrome'
import RouletteLoadingScreen, { WinningOverlay } from './components/RouletteLoadingScreen'
import RouletteTable from './components/RouletteTable'
import RouletteWheel from './components/RouletteWheel'
import SidePlayers, { DEMO_LEFT, DEMO_RIGHT, type SidePlayer } from './components/SidePlayers'
import { useRouletteGame } from './hooks/useRouletteGame'
import { usePreloadAssets, usePrefersReducedMotion, useRouletteSound } from './hooks/useRouletteSound'
import type { CellAggregate } from './utils/payoutCalculator'
import styles from './styles/roulette.module.css'

const DESIGN_W = 850
const DESIGN_H = 480

function nearestChip(amount: number): ChipValue {
  let best: ChipValue = CHIP_VALUES[0]!
  for (const v of CHIP_VALUES) {
    if (Math.abs(v - amount) < Math.abs(best - amount)) best = v
  }
  return best
}

function seatsToSidePlayers(seats: Array<{ id: string; name: string; seat?: string; avatar: number; balance: number }>): {
  left: SidePlayer[]
  right: SidePlayer[]
} {
  if (!seats.length) return { left: DEMO_LEFT, right: DEMO_RIGHT }
  const mapped: SidePlayer[] = seats.slice(0, 6).map((s, i) => ({
    id: s.seat || s.id,
    name: s.name,
    balance: Math.round(s.balance),
    avatar: s.avatar || ((i % 6) + 1),
    badge: i === 0 ? 'winner' : i === 1 ? 'lucky' : undefined,
  }))
  while (mapped.length < 6) {
    const fill = [...DEMO_LEFT, ...DEMO_RIGHT][mapped.length]!
    mapped.push({ ...fill, id: `pad-${mapped.length}` })
  }
  return { left: mapped.slice(0, 3), right: mapped.slice(3, 6) }
}

export default function RouletteGame({ onMessage }: GameComponentProps) {
  const navigate = useNavigate()
  const viewportRef = useRef<HTMLDivElement>(null)
  const canvasRef = useRef<HTMLDivElement>(null)
  const flyLayerRef = useRef<HTMLDivElement>(null)
  const layout = useDesignScale(viewportRef, DESIGN_W, DESIGN_H)
  const { balance, canAfford, refresh } = useWallet()
  const reducedMotion = usePrefersReducedMotion()
  const { muted, toggle, play } = useRouletteSound()
  const { ready, progress } = usePreloadAssets()
  const [helpOpen, setHelpOpen] = useState(false)
  const [settingsOpen, setSettingsOpen] = useState(false)
  const [botByCell, setBotByCell] = useState<Map<string, CellAggregate>>(() => new Map())
  const lastBotSfx = useRef(0)
  const seenBetIds = useRef(new Set<string>())

  const landBotChip = useCallback((cellKey: string, denom: ChipValue) => {
    setBotByCell((prev) => {
      const next = new Map(prev)
      const cur = next.get(cellKey)
      if (cur) next.set(cellKey, { ...cur, amount: cur.amount + denom, lastChip: denom })
      else next.set(cellKey, { cellKey, amount: denom, lastChip: denom })
      return next
    })
  }, [])

  const toCanvasPoint = useCallback(
    (rect: DOMRect) => {
      const board = canvasRef.current?.getBoundingClientRect()
      const scale = layout.scale || 1
      if (!board) return { x: 425, y: 240 }
      return {
        x: (rect.left + rect.width / 2 - board.left) / scale,
        y: (rect.top + rect.height / 2 - board.top) / scale,
      }
    },
    [layout.scale],
  )

  const spawnFly = useCallback(
    (
      src: string,
      from: { x: number; y: number },
      to: { x: number; y: number },
      onDone: () => void,
      opts?: { soft?: boolean; size?: number },
    ) => {
      const layer = flyLayerRef.current
      if (!layer || reducedMotion) {
        onDone()
        return
      }
      const soft = opts?.soft ?? false
      const size = opts?.size ?? (soft ? 24 : 30)
      const half = size / 2
      const now = performance.now()
      if (!soft || now - lastBotSfx.current > 110) {
        lastBotSfx.current = now
        sound.play('whoosh', { volume: soft ? 0.16 : 0.26 })
        sound.play('chip', { volume: soft ? 0.2 : 0.32 })
      }
      const img = document.createElement('img')
      img.src = src
      img.alt = ''
      img.draggable = false
      img.className = styles.flyChip
      img.style.width = `${size}px`
      img.style.height = `${size}px`
      img.style.left = `${from.x - half}px`
      img.style.top = `${from.y - half}px`
      layer.appendChild(img)

      const duration = soft ? 420 + Math.random() * 160 : 520
      const start = performance.now()
      const midX = (from.x + to.x) / 2 + (from.y - to.y) * (soft ? 0.12 : 0.2)
      const midY = Math.min(from.y, to.y) - (soft ? 28 : 44) - Math.random() * 24

      const step = (tNow: number) => {
        const t = Math.min(1, (tNow - start) / duration)
        const e = 1 - (1 - t) ** (soft ? 2.4 : 2.85)
        const omt = 1 - e
        const x = omt * omt * from.x + 2 * omt * e * midX + e * e * to.x
        const y = omt * omt * from.y + 2 * omt * e * midY + e * e * to.y
        const rot = e * (soft ? 180 : 220) - 30
        const bounce = t > 0.82 ? Math.sin(((t - 0.82) / 0.18) * Math.PI) * 0.14 : 0
        const scale = 1.12 - e * 0.32 + bounce
        img.style.left = `${x - half}px`
        img.style.top = `${y - half}px`
        img.style.transform = `rotate(${rot}deg) scale(${scale})`
        if (t < 1) requestAnimationFrame(step)
        else {
          img.remove()
          onDone()
        }
      }
      requestAnimationFrame(step)
    },
    [reducedMotion],
  )

  const onPublicBet = useCallback(
    (bet: { id: string; betKey: string; amount: number; seat?: string }) => {
      if (seenBetIds.current.has(bet.id)) return
      seenBetIds.current.add(bet.id)
      const denom = nearestChip(bet.amount)
      const key = bet.betKey

      if (!canvasRef.current || reducedMotion) {
        landBotChip(key, denom)
        return
      }

      const seatId = bet.seat
      const originEl =
        (seatId &&
          (canvasRef.current.querySelector(`[data-side-player="${seatId}"]`) as HTMLElement | null)) ||
        (canvasRef.current.querySelector('[data-side-player]') as HTMLElement | null)
      const cellEl = canvasRef.current.querySelector(`[data-bet="${key}"]`) as HTMLElement | null
      if (!cellEl) {
        landBotChip(key, denom)
        return
      }
      const from = originEl
        ? toCanvasPoint(originEl.getBoundingClientRect())
        : { x: 40, y: 200 }
      const cell = cellEl.getBoundingClientRect()
      const to = toCanvasPoint(cell)
      to.x += (Math.random() - 0.5) * Math.min(28, cell.width * 0.35)
      to.y += (Math.random() - 0.5) * Math.min(22, cell.height * 0.3)
      spawnFly(ASSET.chip(denom, true), from, to, () => landBotChip(key, denom), {
        soft: true,
        size: 22,
      })
    },
    [landBotChip, reducedMotion, spawnFly, toCanvasPoint],
  )

  const game = useRouletteGame({
    canAfford,
    assetsReady: ready,
    assetProgress: progress,
    reducedMotion,
    onMessage,
    playSfx: play,
    onWalletChange: () => void refresh(),
    onPublicBet,
  })

  const side = useMemo(() => seatsToSidePlayers(game.seats), [game.seats])

  // Sync other players' stacks from server totals (exclude own bets)
  useEffect(() => {
    if (!game.bettingOpen) return
    const totals = game.cellTotals
    if (!totals || !Object.keys(totals).length) return
    setBotByCell((prev) => {
      const next = new Map(prev)
      for (const [key, amount] of Object.entries(totals)) {
        const mine = game.byCell.get(key)?.amount ?? 0
        const others = Math.max(0, Math.round((amount - mine) * 100) / 100)
        if (others <= 0) {
          if (!seenBetIds.current.size) next.delete(key)
          continue
        }
        const cur = next.get(key)
        if (!cur || others > cur.amount) {
          next.set(key, { cellKey: key, amount: others, lastChip: nearestChip(others) })
        }
      }
      return next
    })
  }, [game.cellTotals, game.bettingOpen, game.byCell])

  useEffect(() => {
    if (game.state === 'BETTING_OPEN') {
      setBotByCell(new Map())
      seenBetIds.current.clear()
    }
  }, [game.state])

  const statusKind = useMemo(() => {
    if (game.state === 'BETTING_CLOSING') return 'closing' as const
    if (game.state === 'SPINNING') return 'spin' as const
    if (game.state === 'PAYOUT' && game.lastPayout > 0) return 'win' as const
    return 'default' as const
  }, [game.state, game.lastPayout])

  const showOutcome = game.state === 'RESULT' || game.state === 'PAYOUT'

  const { requestLeave, LeaveModal } = useGameLeaveGuard(navigate, {
    hasActiveBet: game.bets.length > 0,
    stakeAmount: game.stake,
  })

  const onPlace = useCallback(
    async (input: {
      type: import('./constants/rouletteConfig').BetType
      selection: import('./constants/rouletteConfig').BetSelection
      cellKey: string
    }) => {
      sound.unlock()
      const chip = game.selectedChip
      const ok = await game.placeBet({ ...input, chipValue: chip })
      if (!ok) return
      if (reducedMotion || !canvasRef.current) return
      const chipEl = canvasRef.current.querySelector(`[data-chip="${chip}"]`) as HTMLElement | null
      const cellEl = canvasRef.current.querySelector(
        `[data-bet="${input.cellKey}"]`,
      ) as HTMLElement | null
      const from = chipEl
        ? toCanvasPoint(chipEl.getBoundingClientRect())
        : { x: DESIGN_W * 0.45, y: DESIGN_H * 0.92 }
      if (!cellEl) return
      const cell = cellEl.getBoundingClientRect()
      const to = toCanvasPoint(cell)
      to.x += (Math.random() - 0.5) * 16
      to.y += (Math.random() - 0.5) * 12
      spawnFly(ASSET.chip(chip, true), from, to, () => {}, { soft: false, size: 28 })
    },
    [game, reducedMotion, spawnFly, toCanvasPoint],
  )

  return (
    <div ref={viewportRef} className={styles.viewport}>
      <div style={getDesignScaleShellStyle(layout)}>
        <div ref={canvasRef} className={styles.shell} style={getDesignCanvasStyle(layout)}>
          {game.state === 'LOADING' && <RouletteLoadingScreen progress={game.loadProgress} />}

          <div className={styles.spotlight} aria-hidden />
          <div className={styles.vignette} aria-hidden />
          <div className={styles.globalShine} aria-hidden />

          <GameHeader
            status={game.statusText}
            statusKind={statusKind}
            countdown={
              game.state === 'BETTING_OPEN' || game.state === 'BETTING_CLOSING' ? game.countdown : 0
            }
            history={game.history}
            muted={muted}
            onBack={() => {
              sound.playClick()
              requestLeave()
            }}
            onToggleSound={toggle}
            onHelp={() => {
              sound.playClick()
              setHelpOpen((v) => !v)
              setSettingsOpen(false)
            }}
            onSettings={() => {
              sound.playClick()
              setSettingsOpen((v) => !v)
              setHelpOpen(false)
            }}
          />

          <SidePlayers left={side.left} right={side.right} />

          <div className={styles.stage}>
            <div className={styles.wheelPane}>
              <RouletteWheel
                size={292}
                rotorDeg={game.visual.rotorDeg}
                ballDeg={game.visual.ballDeg}
                winningNumber={showOutcome ? game.winningNumber : null}
                spinning={game.visual.spinning}
              />
            </div>
            <div className={styles.tablePane}>
              <RouletteTable
                byCell={game.byCell}
                botByCell={botByCell}
                disabled={!game.bettingOpen}
                winningNumber={game.winningNumber}
                showOutcome={showOutcome}
                onPlace={onPlace}
              />
            </div>
          </div>

          <GameFooter
            balance={balance}
            stake={game.stake}
            potential={game.potential}
            bettingOpen={game.bettingOpen}
            hasBets={game.bets.length > 0}
            canRebet={game.hasLastRound}
            selectedChip={game.selectedChip}
            onSelectChip={(v) => {
              sound.playClick()
              game.setSelectedChip(v)
            }}
            onUndo={() => void game.undo()}
            onClear={() => void game.clear()}
            onRebet={() => void game.rebet()}
            onDouble={() => void game.doubleBets()}
          />

          <div ref={flyLayerRef} className={styles.flyLayer} aria-hidden />

          <WinningOverlay
            number={game.winningNumber}
            payout={game.lastPayout}
            show={game.state === 'PAYOUT' || game.state === 'RESULT'}
          />

          {helpOpen && (
            <div
              className={styles.winOverlay}
              style={{ pointerEvents: 'auto', background: 'rgba(0,0,0,0.55)' }}
              onClick={() => setHelpOpen(false)}
              role="dialog"
            >
              <div
                className={styles.winBadge}
                style={{ maxWidth: 320, textAlign: 'left' }}
                onClick={(e) => e.stopPropagation()}
              >
                <div className={styles.winLabel}>How to play</div>
                <p style={{ fontSize: 12, lineHeight: 1.45, color: '#eee', margin: '8px 0 0' }}>
                  Live multiplayer table — all seats share the same countdown and result. Select a
                  chip and tap the board. Straight pays 35:1 (+stake). Even-money 1:1. Dozens/columns
                  2:1.
                  {game.playersOnline > 1 ? ` Players online: ${game.playersOnline}.` : ''}
                </p>
              </div>
            </div>
          )}

          {settingsOpen && (
            <div
              className={styles.winOverlay}
              style={{ pointerEvents: 'auto', background: 'rgba(0,0,0,0.55)' }}
              onClick={() => setSettingsOpen(false)}
              role="dialog"
            >
              <div
                className={styles.winBadge}
                style={{ maxWidth: 280, textAlign: 'left' }}
                onClick={(e) => e.stopPropagation()}
              >
                <div className={styles.winLabel}>Settings</div>
                <button
                  type="button"
                  style={{
                    marginTop: 12,
                    width: '100%',
                    padding: '10px 12px',
                    borderRadius: 8,
                    border: '1px solid rgba(255,255,255,0.2)',
                    background: 'rgba(0,0,0,0.35)',
                    color: '#eee',
                    fontWeight: 700,
                    cursor: 'pointer',
                  }}
                  onClick={() => {
                    toggle()
                    sound.playClick()
                  }}
                >
                  Sound: {muted ? 'Off' : 'On'}
                </button>
                <button
                  type="button"
                  style={{
                    marginTop: 8,
                    width: '100%',
                    padding: '10px 12px',
                    borderRadius: 8,
                    border: 'none',
                    background: 'transparent',
                    color: '#bbb',
                    cursor: 'pointer',
                  }}
                  onClick={() => setSettingsOpen(false)}
                >
                  Close
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
      {LeaveModal}
    </div>
  )
}
