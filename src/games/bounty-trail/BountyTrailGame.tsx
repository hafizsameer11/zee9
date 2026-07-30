import { useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useWallet } from '../../context/WalletContext'
import type { GameComponentProps } from '../types'
import {
  getDesignCanvasStyle,
  getDesignScaleShellStyle,
  useDesignScale,
} from '../hooks/useDesignScale'
import Zee9LoadingScreen from '../../components/Zee9LoadingScreen'
import {
  ASSET,
  BET_AMOUNTS,
  DESIGN_H,
  DESIGN_W,
  MULTIPLIER_TRACK,
  formatMoney,
} from './constants/gameConfig'
import {
  BAND,
  CTRL_BTN,
  FEATURE_H,
  FEATURE_W,
  FEATURE_X,
  FEATURE_Y,
  MACHINE_X,
  SPIN_SIZE,
  STAGE_H,
  isDebugLayout,
} from './constants/layoutConfig'
import { preloadBountyAssets } from './constants/assetManifest'
import { useBountyTrailGame } from './hooks/useBountyTrailGame'
import { useBountyTrailSound } from './hooks/useBountyTrailSound'
import ReelMachine from './components/ReelMachine'
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

function DustLayer({ reduced }: { reduced: boolean }) {
  const bits = useMemo(
    () =>
      Array.from({ length: reduced ? 6 : 18 }, (_, i) => ({
        id: i,
        left: `${(i * 17 + 5) % 100}%`,
        delay: `${(i % 9) * 0.55}s`,
        dur: `${6 + (i % 5)}s`,
        size: 3 + (i % 4),
      })),
    [reduced],
  )
  return (
    <div className={styles.dustLayer} aria-hidden>
      {bits.map((b) => (
        <span
          key={b.id}
          className={styles.dust}
          style={{
            left: b.left,
            bottom: `${12 + (b.id % 50)}%`,
            animationDelay: b.delay,
            animationDuration: b.dur,
            width: b.size,
            height: b.size,
          }}
        />
      ))}
      <span className={styles.smoke} style={{ left: '6%', top: '18%' }} />
      <span className={styles.smoke} style={{ right: '4%', top: '30%', animationDelay: '2.2s' }} />
    </div>
  )
}

function CoinBurst({ active, heavy }: { active: boolean; heavy?: boolean }) {
  const coins = useMemo(
    () =>
      Array.from({ length: heavy ? 12 : 0 }, (_, i) => ({
        id: i,
        left: `${20 + (i * 6) % 60}%`,
        delay: `${(i % 6) * 0.04}s`,
        dx: `${-30 + (i % 9) * 8}px`,
      })),
    [heavy],
  )
  if (!active || !heavy) return null
  return (
    <div className={styles.coinBurst} aria-hidden>
      {coins.map((c) => (
        <span
          key={c.id}
          className={styles.coin}
          style={{ left: c.left, top: '40%', animationDelay: c.delay, ['--dx' as string]: c.dx }}
        />
      ))}
    </div>
  )
}

export default function BountyTrailGame({ onMessage }: GameComponentProps) {
  const navigate = useNavigate()
  const viewportRef = useRef<HTMLDivElement>(null)
  const layout = useDesignScale(viewportRef, DESIGN_W, DESIGN_H)
  const { balance, debit, credit, canAfford } = useWallet()
  const { muted, toggleMute, play, unlock } = useBountyTrailSound()
  const [reducedMotion, setReducedMotion] = useState(false)
  /** Loader covers stage from first paint — gameplay hidden until ready. */
  const [readyGate, setReadyGate] = useState(false)
  const [loadProgress, setLoadProgress] = useState(4)

  useEffect(() => {
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)')
    const apply = () => setReducedMotion(mq.matches)
    apply()
    mq.addEventListener?.('change', apply)
    return () => mq.removeEventListener?.('change', apply)
  }, [])

  const game = useBountyTrailGame({
    canAfford,
    debit,
    credit,
    playSfx: play,
    onMessage,
    reducedMotion,
  })

  useEffect(() => {
    let cancelled = false
    void preloadBountyAssets((loaded, total) => {
      if (cancelled) return
      setLoadProgress(Math.max(4, Math.round((loaded / total) * 100)))
      game.setLoadProgress(Math.max(4, Math.round((loaded / total) * 100)))
    }).then(() => {
      if (cancelled) return
      setLoadProgress(100)
      game.setLoadProgress(100)
      window.setTimeout(() => {
        if (cancelled) return
        setReadyGate(true)
        game.markReady()
      }, 380)
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

  const showLoader = !readyGate
  const showBigWin = game.winTier === 'big' && game.phase === 'winPresentation'
  const showFreeIntro = game.phase === 'freeSpinsIntro' || game.phase === 'featureTriggered'
  const dbg = isDebugLayout() ? styles.debugBlock : ''

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

  const cssVars = {
    ['--bt-bg' as string]: `url('${ASSET.bg}'), url('${ASSET.bgFallback}')`,
    ['--bt-loader' as string]: `url('${ASSET.loadingHero}'), url('${ASSET.loadingHeroFallback}')`,
  }

  const multVisible = (() => {
    const all = MULTIPLIER_TRACK
    const i = game.multIndex
    const start = Math.max(0, Math.min(i - 2, all.length - 5))
    return { start, items: all.slice(start, start + 5) }
  })()

  return (
    <div className={`${styles.root} ${reducedMotion ? styles.reduced : ''}`} style={cssVars}>
      <div className={styles.aura} aria-hidden />
      <div ref={viewportRef} className={styles.viewport}>
        <div className={styles.shell} style={getDesignScaleShellStyle(layout)}>
          <div
            className={`${styles.stage} ${game.shake ? styles.shake : ''}`}
            style={getDesignCanvasStyle(layout)}
          >
            {/* Opaque loader first — gameplay only after readyGate */}
            {showLoader && (
              <Zee9LoadingScreen
                progress={loadProgress}
                title="Bounty Trail"
                subtitle="Loading reels…"
              />
            )}

            {readyGate && (
              <div className={styles.sceneIn}>
                <div className={styles.bg} aria-hidden />
                <div className={styles.vignette} aria-hidden />
                <div className={styles.grain} aria-hidden />
                <DustLayer reduced={reducedMotion} />
                <div
                  className={styles.foreground}
                  style={{ top: BAND.foreY, height: STAGE_H - BAND.foreY }}
                  aria-hidden
                />

                <div
                  className={`${styles.band} ${styles.topBar} ${dbg}`}
                  style={{ top: BAND.menuY, height: BAND.menuH }}
                >
                  <div className={styles.topBarLeft}>
                    <button
                      type="button"
                      className={styles.lobbyBtn}
                      onClick={() => {
                        play('button', 0.35)
                        navigate('/home')
                      }}
                      aria-label="Back to lobby"
                    >
                      <img src={ASSET.icons.lobby} alt="" draggable={false} />
                      Lobby
                    </button>
                  </div>
                  <div className={styles.topBarRight}>
                    <button
                      type="button"
                      className={styles.iconBtn}
                      onClick={() => {
                        toggleMute()
                        play('button', 0.3)
                      }}
                      aria-label="Sound"
                    >
                      <img src={muted ? ASSET.icons.soundOff : ASSET.icons.sound} alt="" draggable={false} />
                    </button>
                    <button
                      type="button"
                      className={styles.iconBtn}
                      onClick={() => game.openModal('menu')}
                      aria-label="Open settings"
                    >
                      <img src={ASSET.icons.menu} alt="" draggable={false} />
                    </button>
                  </div>
                </div>

                <div
                  className={`${styles.band} ${styles.logoWrap} ${dbg}`}
                  style={{ top: BAND.logoY, height: BAND.logoH }}
                >
                  <img className={styles.logo} src={ASSET.logo} alt="Bounty Trail: High Noon" draggable={false} />
                </div>

                <div
                  className={`${styles.band} ${styles.multWrap} ${dbg}`}
                  style={{ top: BAND.multY, height: BAND.multH }}
                  aria-label={`Multiplier x${game.multValue}`}
                >
                  <img className={styles.multBoardImg} src={ASSET.multiplierBoard} alt="" draggable={false} />
                  <div className={styles.multTrack}>
                    {multVisible.items.map((m, vi) => {
                      const abs = multVisible.start + vi
                      return (
                        <span
                          key={m}
                          className={`${styles.multChip} ${abs === game.multIndex ? styles.multChipOn : ''}`}
                        >
                          x{m}
                        </span>
                      )
                    })}
                  </div>
                </div>

                <div
                  className={`${styles.band} ${styles.reelBand} ${dbg}`}
                  style={{ top: BAND.reelY, height: undefined }}
                >
                  <div style={{ marginLeft: MACHINE_X }}>
                    <ReelMachine
                      grid={game.grid}
                      spinning={game.spinning}
                      stoppingReels={game.stoppingReels}
                      winningCells={game.winningCells}
                      turbo={game.turbo}
                    />
                  </div>
                </div>

                <button
                  type="button"
                  className={styles.featureBuy}
                  style={{ left: FEATURE_X, top: FEATURE_Y, width: FEATURE_W, height: FEATURE_H }}
                  disabled={game.controlsLocked}
                  onClick={() => game.openModal('feature')}
                  aria-label="Feature Buy"
                >
                  <img src={ASSET.featureBuy} alt="Feature Buy" draggable={false} />
                </button>

                <div
                  className={`${styles.band} ${styles.statusWrap} ${dbg}`}
                  style={{ top: BAND.statusY, height: BAND.statusH }}
                >
                  <img className={styles.statusImg} src={ASSET.statusBoard} alt="" draggable={false} />
                  <div key={game.statusMsg} className={styles.statusText}>
                    {game.inFreeSpins
                      ? `FREE SPINS ${game.freeSpinsLeft} · BONUS ${formatMoney(game.freeSpinTotalWin)}`
                      : game.autoLeft > 0
                        ? `AUTO ${game.autoLeft} · ${game.statusMsg}`
                        : game.statusMsg}
                  </div>
                </div>

                <div
                  className={`${styles.band} ${styles.balanceRow} ${dbg}`}
                  style={{ top: BAND.balY, height: BAND.balH }}
                >
                  <div className={styles.balPanel}>
                    <img src={ASSET.icons.wallet} alt="" />
                    <div className={styles.balMeta}>
                      <span className={styles.balLabel}>Balance</span>
                      <span className={styles.balValue}>{formatMoney(balance)}</span>
                    </div>
                  </div>
                  <button
                    type="button"
                    className={`${styles.balPanel} ${styles.balPanelClickable}`}
                    onClick={() => !game.controlsLocked && game.openModal('bet')}
                  >
                    <img src={ASSET.icons.bet} alt="" />
                    <div className={styles.balMeta}>
                      <span className={styles.balLabel}>Bet</span>
                      <span className={styles.balValue}>{formatMoney(game.bet)}</span>
                    </div>
                  </button>
                  <div className={styles.balPanel}>
                    <img src={ASSET.icons.win} alt="" />
                    <div className={styles.balMeta}>
                      <span className={styles.balLabel}>Win</span>
                      <span className={styles.balValue}>{formatMoney(game.displayWin)}</span>
                    </div>
                  </div>
                </div>

                <div
                  className={`${styles.band} ${styles.controlDeck} ${dbg}`}
                  style={{ top: BAND.deckY, height: BAND.deckH }}
                  aria-hidden
                >
                  <img src={ASSET.controlDeck} alt="" draggable={false} />
                </div>

                <div
                  className={`${styles.band} ${styles.controls} ${dbg}`}
                  style={{ top: BAND.ctrlY, height: BAND.ctrlH }}
                >
                  <button
                    type="button"
                    className={styles.ctrlBtn}
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
                    className={styles.betPill}
                    disabled={game.controlsLocked}
                    onClick={() => game.openModal('bet')}
                  >
                    {formatMoney(game.bet)}
                  </button>

                  <button
                    type="button"
                    className={`${styles.spinBtn} ${game.spinning ? styles.spinBtnOn : ''}`}
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
                      style={{ width: CTRL_BTN + 6 }}
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
                </div>

                <CoinBurst
                  active={game.winTier === 'big' && game.phase === 'winPresentation'}
                  heavy
                />
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
                    <img src={ASSET.freeSpins} alt="High Noon Free Spins" draggable={false} />
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
                  <QuitModal onClose={game.closeModal} onConfirm={() => navigate('/home')} />
                )}
                {game.modal === 'menu' && (
                  <UtilityMenu
                    muted={muted}
                    onToggleSound={() => {
                      toggleMute()
                      play('button', 0.3)
                    }}
                    onLobby={() => navigate('/home')}
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
    </div>
  )
}
