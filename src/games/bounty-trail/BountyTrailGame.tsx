import { useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useWallet } from '../../context/WalletContext'
import type { GameComponentProps } from '../types'
import {
  getDesignCanvasStyle,
  getDesignScaleShellStyle,
  useDesignScale,
} from '../hooks/useDesignScale'
import { useGameLeaveGuard } from '../hooks/useGameLeaveGuard'
import { useLiveSlotWinPresentation } from '../../hooks/useLiveSlotWinPresentation'
import Zee9LoadingScreen from '../../components/Zee9LoadingScreen'
import { ASSET, BET_AMOUNTS, DESIGN_H, DESIGN_W, formatMoney } from './constants/gameConfig'
import {
  BACK_SIZE,
  BACK_X,
  BACK_Y,
  BAL_H,
  BAL_Y,
  CTRL_BTN,
  CTRL_H,
  CTRL_Y,
  FEATURE_H,
  FEATURE_W,
  FEATURE_X,
  FEATURE_Y,
  MULT_H,
  MULT_Y,
  SPIN_SIZE,
  WIN_H,
  WIN_Y,
  isDebugLayout,
} from './constants/layoutConfig'
import { preloadBountyBoot, preloadBountyAssets } from './constants/assetManifest'
import { useBountyTrailGame } from './hooks/useBountyTrailGame'
import { useBountyTrailSound } from './hooks/useBountyTrailSound'
import ReelMachine from './components/ReelMachine'
import MultiplierTrack from './components/MultiplierTrack'
import { CoinBurst, MultGlow, SparkBurst } from './components/WinEffects'
import BetOptionsSheet from './components/BetOptionsSheet'
import AutoSpinSheet from './components/AutoSpinSheet'
import {
  FeatureBuyModal,
  HistoryModal,
  PaytableModal,
  QuitModal,
  RulesModal,
  UtilityMenu,
} from './components/Panels'
import styles from './styles/stage.module.css'

export default function BountyTrailGame({ gameId, onMessage }: GameComponentProps) {
  const navigate = useNavigate()
  const viewportRef = useRef<HTMLDivElement>(null)
  const layout = useDesignScale(viewportRef, DESIGN_W, DESIGN_H)
  const { balance, debit, credit, canAfford } = useWallet()
  const { muted, toggleMute, play, unlock } = useBountyTrailSound()
  const [reducedMotion, setReducedMotion] = useState(false)
  const [readyGate, setReadyGate] = useState(false)
  const [loadProgress, setLoadProgress] = useState(4)

  useEffect(() => {
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)')
    const apply = () => setReducedMotion(mq.matches)
    apply()
    mq.addEventListener?.('change', apply)
    return () => mq.removeEventListener?.('change', apply)
  }, [])

  const liveWin = useLiveSlotWinPresentation(gameId === 'bounty-trail' ? 'bounty-trail' : 'wild-bounty')

  const game = useBountyTrailGame({
    canAfford,
    debit,
    credit,
    refresh: liveWin.refresh,
    playSfx: play,
    onMessage,
    reducedMotion,
    beginLiveWin: liveWin.beginLiveWin,
    endLiveWin: liveWin.endLiveWin,
    gameId,
  })

  const { requestLeave, LeaveModal } = useGameLeaveGuard(navigate, {
    hasActiveBet: game.spinning || game.inFreeSpins,
    stakeAmount: game.bet,
  })

  useEffect(() => {
    let cancelled = false
    void preloadBountyBoot((loaded, total) => {
      if (cancelled) return
      const p = Math.max(4, Math.round((loaded / total) * 100))
      setLoadProgress(p)
      game.setLoadProgress(p)
    }).then(() => {
      if (cancelled) return
      setLoadProgress(100)
      game.setLoadProgress(100)
      setReadyGate(true)
      game.markReady()
      void preloadBountyAssets()
    })
    unlock()
    return () => {
      cancelled = true
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const maxBet = useMemo(() => {
    const sorted = [...new Set(BET_AMOUNTS)].sort((a, b) => a - b)
    return sorted[sorted.length - 1]!
  }, [])

  const dbg = isDebugLayout() ? styles.debugBlock : ''
  const showBigWin = game.winTier === 'big' && game.phase === 'winPresentation'
  const showFreeIntro = game.phase === 'freeSpinsIntro' || game.phase === 'featureTriggered'
  const showWinPanel = game.displayWin > 0 && game.phase === 'winPresentation'

  const winText = showWinPanel
    ? `TOTAL WIN ${formatMoney(game.displayWin)}`
    : game.inFreeSpins
      ? `FREE SPINS ${game.freeSpinsLeft} · ${formatMoney(game.freeSpinTotalWin)}`
      : game.autoLeft > 0
        ? `AUTO ${game.autoLeft} · ${game.statusMsg}`
        : game.statusMsg

  const cssVars = {
    ['--bt-scene' as string]: `url('${ASSET.scene}')`,
  }

  const toggleFullscreen = () => {
    const el = viewportRef.current
    if (!el) return
    try {
      if (!document.fullscreenElement) void el.requestFullscreen?.()
      else void document.exitFullscreen?.()
    } catch {
      /* ignore */
    }
    play('button')
  }

  return (
    <div className={`${styles.root} ${reducedMotion ? styles.reduced : ''}`} style={cssVars}>
      <div ref={viewportRef} className={styles.viewport}>
        <div className={styles.shell} style={getDesignScaleShellStyle(layout)}>
          <div
            className={`${styles.stage} ${game.shake ? styles.shake : ''}`}
            style={getDesignCanvasStyle(layout)}
          >
            {!readyGate && (
              <Zee9LoadingScreen
                progress={loadProgress}
                title="Wild Bounty"
                subtitle="Loading showdown…"
              />
            )}

            {readyGate && (
              <div className={styles.sceneIn}>
                {/* Full illustrated gameplay scene */}
                <div className={styles.sceneBg} aria-hidden />

                <button
                  type="button"
                  className={styles.backBtn}
                  style={{ left: BACK_X, top: BACK_Y, width: BACK_SIZE, height: BACK_SIZE }}
                  onClick={() => {
                    play('button', 0.35)
                    requestLeave()
                  }}
                  aria-label="Back to lobby"
                >
                  <img src={ASSET.icons.lobby} alt="" draggable={false} />
                </button>

                {/* Multiplier highlights over baked sign */}
                <div
                  className={`${styles.multLayer} ${dbg}`}
                  style={{ top: MULT_Y, height: MULT_H }}
                  aria-label={`Multiplier x${game.multValue}`}
                >
                  <MultiplierTrack multIndex={game.multIndex} reducedMotion={reducedMotion} />
                  <MultGlow active={showWinPanel} />
                </div>

                {/* Reels in the dark window */}
                <ReelMachine
                  grid={game.grid}
                  spinning={game.spinning}
                  stoppingReels={game.stoppingReels}
                  winningCells={game.winningCells}
                  goldActivating={game.goldActivating}
                  turbo={game.turbo}
                />

                {/* Feature buy hit area over baked plaque */}
                <button
                  type="button"
                  className={`${styles.featureHit} ${dbg}`}
                  style={{ left: FEATURE_X, top: FEATURE_Y, width: FEATURE_W, height: FEATURE_H }}
                  disabled={game.controlsLocked}
                  onClick={() => game.openModal('feature')}
                  aria-label="Feature Buy"
                />

                {/* Win / status text on felt strip */}
                <div
                  className={`${styles.winText} ${showWinPanel ? styles.winTextActive : ''} ${dbg}`}
                  style={{ top: WIN_Y, height: WIN_H }}
                >
                  <div className={styles.winPanel}>
                    <span key={winText}>{winText}</span>
                  </div>
                </div>

                {/* Balance HUD on table */}
                <div
                  className={`${styles.balanceRow} ${dbg}`}
                  style={{ top: BAL_Y, height: BAL_H }}
                >
                  <div className={styles.balItem}>
                    <img src={ASSET.icons.wallet} alt="" draggable={false} />
                    <div className={styles.balMeta}>
                      <span className={styles.balLabel}>Balance</span>
                      <span className={styles.balVal}>{formatMoney(balance)}</span>
                    </div>
                  </div>
                  <button
                    type="button"
                    className={styles.balItem}
                    disabled={game.controlsLocked}
                    onClick={() => game.openModal('bet')}
                  >
                    <img src={ASSET.icons.bet} alt="" draggable={false} />
                    <div className={styles.balMeta}>
                      <span className={styles.balLabel}>Bet</span>
                      <span className={styles.balVal}>{formatMoney(game.bet)}</span>
                    </div>
                  </button>
                  <div className={styles.balItem}>
                    <img src={ASSET.icons.win} alt="" draggable={false} />
                    <div className={styles.balMeta}>
                      <span className={styles.balLabel}>Win</span>
                      <span className={styles.balVal}>{formatMoney(game.displayWin)}</span>
                    </div>
                  </div>
                </div>

                {/* Controls on green felt */}
                <div
                  className={`${styles.controls} ${dbg}`}
                  style={{ top: CTRL_Y, height: CTRL_H }}
                >
                  <button
                    type="button"
                    className={`${styles.ctrlBtn} ${game.turbo ? styles.ctrlOn : ''}`}
                    style={{ width: CTRL_BTN }}
                    onClick={() => {
                      game.setTurbo((t) => !t)
                      play('button', 0.35)
                    }}
                    aria-label="Turbo"
                  >
                    <img src={ASSET.turbo} alt="" draggable={false} />
                  </button>

                  <button
                    type="button"
                    className={styles.ctrlBtn}
                    style={{ width: CTRL_BTN }}
                    disabled={game.controlsLocked}
                    onClick={() => game.adjustBet(-1)}
                    aria-label="Decrease bet"
                  >
                    <img src={ASSET.minus} alt="" draggable={false} />
                  </button>

                  <button
                    type="button"
                    className={`${styles.spinBtn} ${game.spinning ? styles.spinOn : ''}`}
                    style={{ width: SPIN_SIZE, height: SPIN_SIZE }}
                    disabled={game.spinning || game.phase === 'freeSpinsIntro'}
                    onClick={() => {
                      unlock()
                      if (game.autoLeft > 0) game.stopAuto()
                      else void game.runSpin()
                    }}
                    aria-label={game.autoLeft > 0 ? 'Stop auto spin' : 'Spin'}
                  >
                    <img src={ASSET.spin} alt="" draggable={false} />
                  </button>

                  <button
                    type="button"
                    className={styles.ctrlBtn}
                    style={{ width: CTRL_BTN }}
                    disabled={game.controlsLocked}
                    onClick={() => game.adjustBet(1)}
                    aria-label="Increase bet"
                  >
                    <img src={ASSET.plus} alt="" draggable={false} />
                  </button>

                  <div className={styles.autoWrap}>
                    <button
                      type="button"
                      className={styles.ctrlBtn}
                      style={{ width: CTRL_BTN }}
                      disabled={game.inFreeSpins}
                      onClick={() => {
                        if (game.autoLeft > 0) game.stopAuto()
                        else game.openModal('auto')
                      }}
                      aria-label="Auto spin"
                    >
                      <img src={ASSET.auto} alt="" draggable={false} />
                    </button>
                    {game.autoLeft > 0 && <span className={styles.autoBadge}>{game.autoLeft}</span>}
                  </div>

                  <button
                    type="button"
                    className={styles.menuBtn}
                    onClick={() => game.openModal('menu')}
                    aria-label="Menu"
                  >
                    <img src={ASSET.icons.menu} alt="" draggable={false} />
                  </button>
                </div>

                <CoinBurst active={game.phase === 'winPresentation'} tier={game.winTier} />
                <SparkBurst active={showBigWin} />
                {game.winTier !== 'none' && game.phase === 'winPresentation' && (
                  <div className={styles.winFlash} aria-hidden />
                )}

                {showBigWin && (
                  <div className={styles.winOverlay}>
                    <img src={ASSET.bigWin} alt="" draggable={false} />
                    <div className={styles.winAmount}>{formatMoney(game.displayWin)}</div>
                  </div>
                )}

                {showFreeIntro && (
                  <div className={styles.freeIntro}>
                    <img src={ASSET.freeSpins} alt="Free Spins" draggable={false} />
                  </div>
                )}

                {game.modal === 'bet' && (
                  <BetOptionsSheet
                    bet={game.bet}
                    balance={balance}
                    onConfirm={game.setBetAmount}
                    onClose={game.closeModal}
                    onMax={() => game.setBetAmount(maxBet)}
                  />
                )}
                {game.modal === 'auto' && (
                  <AutoSpinSheet onStart={game.startAuto} onClose={game.closeModal} />
                )}
                {game.modal === 'feature' && (
                  <FeatureBuyModal
                    bet={game.bet}
                    balance={balance}
                    onBuy={() => void game.buyFeature()}
                    onClose={game.closeModal}
                  />
                )}
                {game.modal === 'paytable' && <PaytableModal onClose={game.closeModal} />}
                {game.modal === 'rules' && <RulesModal onClose={game.closeModal} />}
                {game.modal === 'history' && (
                  <HistoryModal rounds={game.history} onClose={game.closeModal} />
                )}
                {game.modal === 'quit' && (
                  <QuitModal onClose={game.closeModal} onConfirm={requestLeave} />
                )}
                {game.modal === 'menu' && (
                  <UtilityMenu
                    muted={muted}
                    onToggleSound={() => {
                      toggleMute()
                      play('button', 0.3)
                    }}
                    onLobby={requestLeave}
                    onPaytable={() => game.openModal('paytable')}
                    onRules={() => game.openModal('rules')}
                    onHistory={() => game.openModal('history')}
                    onQuit={() => game.openModal('quit')}
                    onFullscreen={toggleFullscreen}
                    onClose={game.closeModal}
                  />
                )}
              </div>
            )}
          </div>
        </div>
      </div>
      {LeaveModal}
    </div>
  )
}
