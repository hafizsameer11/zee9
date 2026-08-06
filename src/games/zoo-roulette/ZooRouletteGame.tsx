import { useCallback, useEffect, useRef, useState, type CSSProperties } from 'react'
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
import { useSyncWinHold } from '../../hooks/useWinPresentationHold'
import { useAutoAffordableChip } from '../lib/maxAffordableChip'
import {
  ANIMALS,
  ASSET,
  BOARD,
  CHIP_VALUES,
  DESIGN_H,
  DESIGN_W,
  TIMER,
  TOWER,
  type BetZoneId,
  type ChipValue,
} from './constants/gameConfig'
import { useLiveZooRoulette } from './hooks/useLiveZooRoulette'
import { useGameToast } from './hooks/useGameToast'
import {
  usePageVisible,
  usePrefersReducedMotion,
  usePreloadAssets,
  useZooRouletteSound,
} from './hooks/useZooRouletteSystem'
import SceneBackground from './components/SceneBackground'
import RouletteTrack from './components/RouletteTrack'
import BettingGrid from './components/BettingGrid'
import HistoryTower, { CountdownOrnament } from './components/HistoryTower'
import ControlDeck from './components/ControlDeck'
import {
  HelpPanel,
  InsufficientDialog,
  LoadingScreen,
  PhaseBanner,
  WinnerReveal,
} from './components/Overlays'
import styles from './styles/zooRoulette.module.css'

type ChipStack = {
  id: string
  zone: BetZoneId
  value: number
  x: number
  y: number
  mine?: boolean
}

export default function ZooRouletteGame({ onMessage }: GameComponentProps) {
  const navigate = useNavigate()
  const viewportRef = useRef<HTMLDivElement>(null)
  const canvasRef = useRef<HTMLDivElement>(null)
  const flyLayerRef = useRef<HTMLDivElement>(null)
  const layout = useDesignScale(viewportRef, DESIGN_W, DESIGN_H)
  const { balance, canAfford, refresh } = useWallet()
  const reducedMotion = usePrefersReducedMotion()
  const pageVisible = usePageVisible()
  const { muted, toggle, play } = useZooRouletteSound()
  const { ready, progress, slow } = usePreloadAssets()
  const [helpOpen, setHelpOpen] = useState(false)
  const [chipStacks, setChipStacks] = useState<ChipStack[]>([])
  const [pools, setPools] = useState<Map<BetZoneId, number>>(() => new Map())
  const [dismissInsufficient, setDismissInsufficient] = useState(false)
  const stackSeq = useRef(0)
  const lastBotSfx = useRef(0)
  const mountedOk = useRef(true)
  const toast = useGameToast(onMessage)

  const game = useLiveZooRoulette({
    enabled: true,
    assetsReady: ready,
    assetProgress: progress,
    reducedMotion,
    canAfford,
    playSfx: play,
    onToast: toast,
    onWalletChange: () => void refresh(),
  })

  const { requestLeave, LeaveModal } = useGameLeaveGuard(navigate, {
    hasActiveBet: game.stake > 0,
    stakeAmount: game.stake,
  })

  useSyncWinHold(
    'zoo-roulette',
    game.settledPayout ?? 0,
    ['CLOSING', 'SPINNING', 'RESULT'].includes(game.state),
  )

  useAutoAffordableChip(balance, CHIP_VALUES, game.setSelectedChip)

  useEffect(() => {
    if (game.insufficient) setDismissInsufficient(false)
  }, [game.insufficient])

  useEffect(() => {
    mountedOk.current = true
    return () => {
      mountedOk.current = false
    }
  }, [])

  useEffect(() => {
    if (game.state === 'NEW_ROUND' || game.state === 'BETTING') {
      if (game.state === 'NEW_ROUND') {
        setChipStacks([])
        setPools(new Map())
      }
    }
  }, [game.state])

  useEffect(() => {
    const next = new Map<BetZoneId, number>()
    for (const zone of game.bettableZones) {
      const total = game.cellTotals[zone] ?? 0
      if (total > 0) next.set(zone, total)
    }
    setPools(next)
  }, [game.bettableZones, game.cellTotals, game.roundId])

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

  const pushStack = useCallback((zone: BetZoneId, value: number, mine = false) => {
    stackSeq.current += 1
    const id = `${zone}-${stackSeq.current}`
    setChipStacks((prev) => {
      const next = [
        ...prev,
        {
          id,
          zone,
          value,
          x: 16 + Math.random() * 56,
          y: 30 + Math.random() * 44,
          mine,
        },
      ]
      return next.length > 52 ? next.slice(next.length - 52) : next
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
      const size = opts?.size ?? (soft ? 24 : 36)
      const half = size / 2
      const stamp = performance.now()
      if (!soft || stamp - lastBotSfx.current > 90) {
        lastBotSfx.current = stamp
        if (!soft) {
          play('whoosh')
          play('chip')
        } else {
          sound.play('whoosh', { volume: 0.12 })
          sound.play('chip', { volume: 0.16 })
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
      const lift = soft ? 18 : 32
      const duration = soft ? 230 : 290
      let finished = false
      const finish = () => {
        if (finished) return
        finished = true
        img.remove()
        if (mountedOk.current) onDone()
      }
      const animation = img.animate(
        [
          { transform: 'translate3d(0,0,0) rotate(-16deg) scale(1)', offset: 0 },
          {
            transform: `translate3d(${dx * 0.55}px, ${dy * 0.38 - lift}px, 0) rotate(108deg) scale(1.08)`,
            offset: 0.55,
          },
          { transform: `translate3d(${dx}px, ${dy}px, 0) rotate(198deg) scale(.9)`, offset: 1 },
        ],
        { duration, easing: 'cubic-bezier(.2,.8,.25,1)', fill: 'forwards' },
      )
      animation.onfinish = finish
      animation.oncancel = finish
      window.setTimeout(finish, duration + 90)
    },
    [reducedMotion, pageVisible, play],
  )

  useEffect(() => {
    const bet = game.publicBet
    if (!bet || !canvasRef.current || !pageVisible) return
    const cellEl = canvasRef.current.querySelector(`[data-bet="${bet.zone}"]`) as HTMLElement | null
    if (!cellEl) return
    const edge = Math.floor(Math.random() * 4)
    const from =
      edge === 0
        ? { x: Math.random() * DESIGN_W, y: -20 }
        : edge === 1
          ? { x: DESIGN_W + 20, y: Math.random() * DESIGN_H * 0.7 }
          : edge === 2
            ? { x: Math.random() * DESIGN_W, y: DESIGN_H + 20 }
            : { x: -20, y: Math.random() * DESIGN_H * 0.7 }
    const to = toCanvasPoint(cellEl.getBoundingClientRect())
    const chip = CHIP_VALUES.reduce((best, value) =>
      Math.abs(value - bet.amount) < Math.abs(best - bet.amount) ? value : best,
    )
    spawnFly(
      ASSET.chip(chip, true),
      from,
      to,
      () => pushStack(bet.zone, bet.amount, false),
      { soft: true, size: 20 },
    )
  }, [game.publicBet, pageVisible, spawnFly, toCanvasPoint, pushStack])

  const onPlace = useCallback(
    (zone: BetZoneId) => {
      sound.unlock()
      const value = game.selectedChip
      void Promise.resolve(game.placeBet(zone, value)).then((ok) => {
        if (!ok) return
        if (reducedMotion || !canvasRef.current) {
          pushStack(zone, value, true)
          return
        }
        const chipEl = canvasRef.current.querySelector(`[data-chip="${value}"]`) as HTMLElement | null
        const cellEl = canvasRef.current.querySelector(`[data-bet="${zone}"]`) as HTMLElement | null
        const from = chipEl
          ? toCanvasPoint(chipEl.getBoundingClientRect())
          : { x: DESIGN_W * 0.5, y: DESIGN_H - 20 }
        if (!cellEl) {
          pushStack(zone, value, true)
          return
        }
        const cell = cellEl.getBoundingClientRect()
        const to = toCanvasPoint(cell)
        to.x += (Math.random() - 0.5) * 18
        to.y += (Math.random() - 0.5) * 14
        spawnFly(ASSET.chip(value, true), from, to, () => pushStack(zone, value, true), {
          soft: false,
          size: 34,
        })
      })
    },
    [game, reducedMotion, spawnFly, toCanvasPoint, pushStack],
  )

  const shiftChip = useCallback(
    (dir: -1 | 1) => {
      const idx = CHIP_VALUES.indexOf(game.selectedChip)
      const next = CHIP_VALUES[(idx + dir + CHIP_VALUES.length) % CHIP_VALUES.length]!
      play('chipSelect')
      game.setSelectedChip(next)
    },
    [game, play],
  )

  const showOutcome =
    game.state === 'RESULT' || game.state === 'PAYOUT' || game.state === 'RESETTING'
  const trail =
    game.state === 'SPINNING' ? (game.countdown <= 0 ? 3 : 2) : game.state === 'RESULT' ? 1 : 0

  const boardStyle: CSSProperties = {
    left: BOARD.x,
    top: BOARD.y,
    width: BOARD.w,
    height: BOARD.h,
    borderWidth: `${BOARD.bezel.t}px ${BOARD.bezel.r}px ${BOARD.bezel.b}px ${BOARD.bezel.l}px`,
  }

  const wellStyle: CSSProperties = {
    position: 'absolute',
    left: BOARD.tileW,
    top: BOARD.tileH,
    width: BOARD.wellW,
    height: BOARD.wellH,
  }

  if (game.state === 'LOADING') {
    return (
      <div ref={viewportRef} className={styles.viewport}>
        <div style={getDesignScaleShellStyle(layout)}>
          <div className={styles.shell} style={getDesignCanvasStyle(layout)}>
            <LoadingScreen progress={game.loadProgress} slow={slow} />
          </div>
        </div>
      </div>
    )
  }

  return (
    <div ref={viewportRef} className={styles.viewport}>
      <div style={getDesignScaleShellStyle(layout)}>
        <div ref={canvasRef} className={styles.shell} style={getDesignCanvasStyle(layout)}>
          <SceneBackground paused={!pageVisible} />

          <header className={styles.topBar}>
            <button
              type="button"
              className={styles.iconBtn}
              aria-label="Back"
              onClick={() => {
                play('click')
                requestLeave()
              }}
            >
              <img src={ASSET.ui('ico-back')} alt="" draggable={false} />
            </button>
            <div className={styles.topRight}>
              <button
                type="button"
                className={styles.addBtn}
                onClick={() => {
                  play('click')
                  navigate('/pay/deposit')
                }}
              >
                <img src={ASSET.ui('ico-plus')} alt="" draggable={false} />
                ADD
              </button>
              <button
                type="button"
                className={`${styles.iconBtn} ${muted ? styles.mutedOverlay : ''}`}
                aria-label={muted ? 'Unmute' : 'Mute'}
                onClick={toggle}
              >
                <img src={ASSET.ui('ico-sound')} alt="" draggable={false} />
              </button>
              <button
                type="button"
                className={styles.iconBtn}
                aria-label="Help"
                onClick={() => {
                  play('click')
                  setHelpOpen(true)
                }}
              >
                <img src={ASSET.ui('ico-help')} alt="" draggable={false} />
              </button>
            </div>
          </header>

          <CountdownOrnament
            countdown={game.state === 'SPINNING' || game.state === 'CLOSING' ? 0 : game.countdown}
            warning={game.warning}
            spinning={game.state === 'SPINNING'}
            statusText={
              game.state === 'BETTING'
                ? 'BETTING'
                : game.state === 'SPINNING'
                  ? 'RUNNING'
                  : game.state === 'CLOSING'
                    ? 'CLOSED'
                    : game.winner
                      ? ANIMALS.find((a) => a.id === game.winner)?.name ?? 'RESULT'
                      : 'WAIT'
            }
            style={{
              position: 'absolute',
              left: BOARD.x + BOARD.w / 2 - TIMER.w / 2,
              top: BOARD.y - 6,
              width: TIMER.w,
              height: TIMER.h,
              zIndex: 12,
            }}
          />

          <div className={styles.board} style={boardStyle}>
            <div className={styles.boardInner}>
              <RouletteTrack
                activeSlot={game.activeSlot}
                winningSlot={game.winningSlot}
                trail={trail}
              />
              <div style={wellStyle}>
                <BettingGrid
                  bettingOpen={game.bettingOpen}
                  bets={game.bets}
                  pools={pools}
                  stacks={chipStacks}
                  winner={game.winner}
                  showOutcome={showOutcome}
                  onPlace={onPlace}
                />
              </div>
            </div>
          </div>

          <HistoryTower
            history={game.history}
            style={{ left: TOWER.x, top: TOWER.y, width: TOWER.w, height: TOWER.h }}
          />

          <ControlDeck
            balance={balance}
            playerName="Player"
            selectedChip={game.selectedChip}
            canRebet={game.hasLastRound}
            bettingOpen={game.bettingOpen}
            onSelectChip={(v: ChipValue) => {
              play('chipSelect')
              game.setSelectedChip(v)
            }}
            onRebet={() => game.rebet()}
            onShift={shiftChip}
          />

          <div ref={flyLayerRef} className={styles.flyLayer} aria-hidden />

          <PhaseBanner kind="start" show={game.state === 'NEW_ROUND'} />
          <PhaseBanner kind="stop" show={game.state === 'CLOSING'} />

          <WinnerReveal
            animal={game.winner}
            show={game.state === 'RESULT' || game.state === 'PAYOUT'}
            reducedMotion={reducedMotion}
          />

          {game.state === 'PAYOUT' && game.payout > 0 && (
            <div className={styles.winLabel}>+{game.payout.toLocaleString()}</div>
          )}

          {game.winningSlot != null && (game.state === 'RESULT' || game.state === 'PAYOUT') && (
            <img
              className={styles.shock}
              src={ASSET.fx('shock')}
              alt=""
              draggable={false}
              style={{
                left: BOARD.x + BOARD.w / 2 - 80,
                top: BOARD.y + BOARD.h / 2 - 80,
              }}
            />
          )}

          <div className={styles.roundId}>#{game.roundId}</div>

          <InsufficientDialog
            show={game.insufficient && !dismissInsufficient}
            onClose={() => setDismissInsufficient(false)}
          />
          <HelpPanel open={helpOpen} onClose={() => setHelpOpen(false)} />
        </div>
      </div>
      {LeaveModal}
    </div>
  )
}
