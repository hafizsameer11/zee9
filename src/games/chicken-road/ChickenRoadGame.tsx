import { useCallback, useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useWallet } from '../../context/WalletContext'
import type { GameComponentProps } from '../types'
import {
  getDesignCanvasStyle,
  getDesignScaleShellStyle,
  useDesignScale,
} from '../hooks/useDesignScale'
import { useGameLeaveGuard } from '../hooks/useGameLeaveGuard'
import { useWinPresentationHold } from '../../hooks/useWinPresentationHold'
import { DESIGN_H, DESIGN_W, SCENE_H } from './constants/gameConfig'
import { useChickenRoadGame } from './hooks/useChickenRoadGame'
import { useChickenRoadSound } from './hooks/useChickenRoadSound'
import TopBar from './components/TopBar'
import ControlBar from './components/ControlBar'
import GameCanvas, { type SceneHandle } from './components/GameCanvas'
import {
  HowToPlay,
  LoadingScreen,
  LossOverlay,
  SideMenu,
  WinOverlay,
} from './components/Overlays'
import { playStepSuccessUi } from './animations/timelines'
import type { StepResult } from './services/chickenRoadGameService'
import styles from './styles/chickenRoad.module.css'

export default function ChickenRoadGame({ onMessage }: GameComponentProps) {
  const navigate = useNavigate()
  const viewportRef = useRef<HTMLDivElement>(null)
  const uiRef = useRef<HTMLDivElement>(null)
  const sceneHandle = useRef<SceneHandle | null>(null)
  const layout = useDesignScale(viewportRef, DESIGN_W, DESIGN_H)
  const { balance, debit, credit, canAfford } = useWallet()
  const { muted, musicOn, toggleMute, toggleMusic, play } = useChickenRoadSound()
  const [howtoOpen, setHowtoOpen] = useState(false)
  const [menuOpen, setMenuOpen] = useState(false)
  const [reducedMotion, setReducedMotion] = useState(false)
  /** Pixi scene finished boot — keep loader up until this is true. */
  const [sceneReady, setSceneReady] = useState(false)

  useEffect(() => {
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)')
    const apply = () => setReducedMotion(mq.matches)
    apply()
    mq.addEventListener?.('change', apply)
    return () => mq.removeEventListener?.('change', apply)
  }, [])

  const gameRef = useRef<ReturnType<typeof useChickenRoadGame> | null>(null)

  const onStepAnimate = useCallback(
    async (result: StepResult) => {
      await sceneHandle.current?.playStepResult(result)
      playStepSuccessUi(uiRef.current, reducedMotion)
    },
    [reducedMotion],
  )

  const onCollisionAnimate = useCallback(async (result: StepResult) => {
    await sceneHandle.current?.playStepResult(result)
  }, [])

  const onCelebrate = useCallback(async () => {
    await sceneHandle.current?.celebrate()
  }, [])

  const onResetScene = useCallback(() => {
    const g = gameRef.current
    if (!g) return
    sceneHandle.current?.resetRound({
      difficulty: g.difficulty,
      laneCount: g.laneCount,
      multipliers: g.multipliers.length
        ? g.multipliers
        : g.difficultyConfig.multipliers,
    })
  }, [])

  const { holdWin, releaseWinHold } = useWinPresentationHold('chicken-road')

  const game = useChickenRoadGame({
    canAfford,
    debit,
    credit,
    onMessage,
    playSfx: play,
    onStepAnimate,
    onCollisionAnimate,
    onCelebrate,
    onResetScene,
    holdWin,
    releaseWinHold,
    // Stay in LOADING until Pixi road is painted (not just image cache warm).
    assetsReady: sceneReady,
  })
  gameRef.current = game

  // Warn if Pixi is unusually slow — do not force-hide the loader (avoids blank green).
  useEffect(() => {
    if (sceneReady) return
    const id = window.setTimeout(() => {
      onMessage?.('Still building the road…')
    }, 12000)
    return () => window.clearTimeout(id)
  }, [sceneReady, onMessage])

  useEffect(() => {
    sceneHandle.current?.setTrafficPaused(
      game.state === 'LOADING' ||
        game.state === 'CASHING_OUT' ||
        game.state === 'WIN' ||
        game.state === 'LOSS' ||
        game.state === 'COLLISION',
    )
  }, [game.state])

  useEffect(() => {
    if (game.roundId) return
    if (game.state !== 'READY' && game.state !== 'BETTING') return
    sceneHandle.current?.resetRound({
      difficulty: game.difficulty,
      laneCount: game.laneCount,
      multipliers: game.multipliers.length
        ? game.multipliers
        : game.difficultyConfig.multipliers,
    })
  }, [
    game.roundId,
    game.state,
    game.difficulty,
    game.laneCount,
    game.multipliers,
    game.difficultyConfig.multipliers,
  ])

  useEffect(() => {
    if (!game.roundId) return
    sceneHandle.current?.resetRound({
      difficulty: game.difficulty,
      laneCount: game.laneCount,
      multipliers: game.multipliers,
    })
  }, [game.roundId])

  // Keep Pixi chicken/camera aligned with round progress (e.g. after reconnect).
  useEffect(() => {
    if (!game.roundId) return
    if (game.state !== 'WAITING_FOR_MOVE') return
    sceneHandle.current?.syncToStep(game.currentStep)
  }, [game.roundId, game.currentStep, game.state])

  const onSceneReady = useCallback((handle: SceneHandle) => {
    sceneHandle.current = handle
    setSceneReady(true)
    const g = gameRef.current
    if (!g) return
    handle.resetRound({
      difficulty: g.difficulty,
      laneCount: g.laneCount,
      multipliers: g.multipliers.length ? g.multipliers : g.difficultyConfig.multipliers,
    })
  }, [])

  const toggleFullscreen = useCallback(() => {
    const el = viewportRef.current
    if (!el) return
    try {
      if (!document.fullscreenElement) void el.requestFullscreen?.()
      else void document.exitFullscreen?.()
    } catch {
      /* ignore */
    }
    play('button')
  }, [play])

  const { requestLeave, LeaveModal } = useGameLeaveGuard(navigate, {
    hasActiveBet: game.roundActive,
    stakeAmount: game.betAmount,
    canCashOut: game.canCashOut,
    cashOutAmount: game.potentialPayout,
    onCashOut: async () => {
      if (game.canCashOut) await game.cashOutNow()
    },
  })

  const onBack = useCallback(() => {
    play('button')
    requestLeave()
  }, [play, requestLeave])

  // Loader covers chrome until images + Pixi scene are both ready.
  const showLoading = game.state === 'LOADING' || !sceneReady
  const loadProgress = sceneReady
    ? 100
    : Math.min(game.loadProgress, game.assetsReady ? 94 : game.loadProgress)
  const loadSubtitle = !game.assetsReady
    ? 'Preparing road…'
    : !sceneReady
      ? 'Building lanes…'
      : 'Ready'
  const showWin = game.state === 'WIN' && game.lastPayout > 0
  const showLoss = game.state === 'LOSS'

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.repeat) return
      if (e.code === 'Space' || e.key === 'ArrowRight') {
        e.preventDefault()
        if (game.canMove) void game.moveForward()
        else if (game.canStart) void game.startGame()
      } else if (e.key === 'c' || e.key === 'C') {
        if (game.canCashOut) void game.cashOutNow()
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [game])

  return (
    <div ref={viewportRef} className={styles.viewport}>
      <div style={getDesignScaleShellStyle(layout)}>
        <div ref={uiRef} className={styles.shell} style={getDesignCanvasStyle(layout)}>
          <div className={styles.atmosphere} aria-hidden />
          <div className={styles.vignette} aria-hidden />

          <TopBar
            balance={balance}
            onlineCount={game.onlineCount}
            tickerItems={game.tickerItems}
            onHowTo={() => {
              play('menuOpen')
              setHowtoOpen(true)
            }}
            onMenu={() => {
              play('menuOpen')
              setMenuOpen(true)
            }}
            onFullscreen={toggleFullscreen}
            onBack={onBack}
          />

          <GameCanvas
            width={DESIGN_W}
            height={SCENE_H}
            difficulty={game.difficulty}
            laneCount={game.laneCount}
            multipliers={
              game.multipliers.length
                ? game.multipliers
                : game.difficultyConfig.multipliers
            }
            onReady={onSceneReady}
          />

          <ControlBar
            betAmount={game.betAmount}
            balance={balance}
            difficulty={game.difficulty}
            canEditBet={game.canEditBet}
            canStart={game.canStart}
            canMove={game.canMove}
            canCashOut={game.canCashOut}
            potentialPayout={game.potentialPayout}
            roundActive={game.roundActive}
            onBetChange={game.setBetAmount}
            onDecrease={() => game.adjustBet(-1, balance)}
            onIncrease={() => game.adjustBet(1, balance)}
            onDifficulty={game.setDifficulty}
            onPlay={() => {
              play('button')
              void game.startGame()
            }}
            onMove={() => {
              play('button')
              void game.moveForward()
            }}
            onCashOut={() => {
              play('button')
              void game.cashOutNow()
            }}
          />

          <WinOverlay
            show={showWin}
            amount={game.lastPayout}
            multiplier={game.currentMult}
            reducedMotion={reducedMotion}
            onContinue={() => game.resetToBetting()}
          />
          <LossOverlay
            show={showLoss && !showWin}
            reducedMotion={reducedMotion}
            betAmount={game.betAmount}
            laneReached={game.failedStep ?? undefined}
            onRestart={() => game.resetToBetting()}
          />

          <HowToPlay
            open={howtoOpen}
            onClose={() => {
              play('menuClose')
              setHowtoOpen(false)
            }}
          />
          {LeaveModal}
          <SideMenu
            open={menuOpen}
            muted={muted}
            musicOn={musicOn}
            onlineCount={game.onlineCount}
            onClose={() => {
              play('menuClose')
              setMenuOpen(false)
            }}
            onToggleMute={toggleMute}
            onToggleMusic={toggleMusic}
            onHowTo={() => setHowtoOpen(true)}
          />

          {showLoading && (
            <LoadingScreen progress={loadProgress} subtitle={loadSubtitle} />
          )}
        </div>
      </div>
    </div>
  )
}
