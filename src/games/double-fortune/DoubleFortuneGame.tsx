import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useWallet } from '../../context/WalletContext'
import type { GameComponentProps } from '../types'
import {
  getDesignCanvasStyle,
  getDesignScaleShellStyle,
  useDesignScale,
} from '../hooks/useDesignScale'
import { ASSET, DESIGN_H, DESIGN_W, formatMoney } from './constants/gameConfig'
import { BAND, CTRL_BTN, SPIN_SIZE } from './constants/layoutConfig'
import { preloadDoubleFortuneAssets } from './constants/assetManifest'
import { useDoubleFortuneGame } from './hooks/useDoubleFortuneGame'
import { useDoubleFortuneSound } from './hooks/useDoubleFortuneSound'
import ReelMachine from './components/ReelMachine'
import LoadingFlow from './components/LoadingFlow'
import { AutoSpinSheet, BetOptionsSheet } from './components/Panels'
import styles from './styles/doubleFortune.module.css'

function DustLayer() {
  const bits = useMemo(
    () =>
      Array.from({ length: 14 }, (_, i) => ({
        id: i,
        left: `${(i * 17 + 5) % 100}%`,
        delay: `${(i % 9) * 0.55}s`,
        dur: `${6 + (i % 5)}s`,
        size: 3 + (i % 4),
      })),
    [],
  )
  return (
    <div className={styles.dustLayer} aria-hidden>
      {bits.map((b) => (
        <span
          key={b.id}
          className={styles.dust}
          style={{
            left: b.left,
            bottom: `${10 + (b.id % 40)}%`,
            animationDelay: b.delay,
            animationDuration: b.dur,
            width: b.size,
            height: b.size,
          }}
        />
      ))}
    </div>
  )
}

function CoinBurst({ active }: { active: boolean }) {
  const coins = useMemo(
    () =>
      Array.from({ length: active ? 14 : 0 }, (_, i) => ({
        id: i,
        left: `${12 + (i * 6) % 76}%`,
        delay: `${(i % 7) * 0.05}s`,
        src: i % 2 === 0 ? ASSET.coin : ASSET.petal,
      })),
    [active],
  )
  if (!active) return null
  return (
    <div className={styles.coinBurst} aria-hidden>
      {coins.map((c) => (
        <span
          key={c.id}
          className={styles.coin}
          style={{
            left: c.left,
            top: '28%',
            animationDelay: c.delay,
            backgroundImage: `url(${c.src})`,
          }}
        />
      ))}
    </div>
  )
}

export default function DoubleFortuneGame({ onMessage }: GameComponentProps) {
  const navigate = useNavigate()
  const viewportRef = useRef<HTMLDivElement>(null)
  const layout = useDesignScale(viewportRef, DESIGN_W, DESIGN_H)
  const { balance, debit, credit, canAfford, refresh } = useWallet()
  const { muted, toggleMute, play, unlock, startAmbience } = useDoubleFortuneSound()
  const [demoBal, setDemoBal] = useState<number | null>(null)
  const [spinPressed, setSpinPressed] = useState(false)
  const bootRef = useRef(false)
  const isPreview =
    typeof window !== 'undefined' && window.location.pathname.includes('/preview/')
  const liveBalance = isPreview || demoBal != null ? (demoBal ?? 5000) : balance

  const walletApi = useMemo(
    () => ({
      canAfford: (n: number) =>
        isPreview || demoBal != null ? (demoBal ?? 5000) >= n : canAfford(n),
      debit: (n: number) => {
        if (isPreview || demoBal != null) {
          setDemoBal((b) => Math.max(0, (b ?? 5000) - n))
          return true
        }
        return debit(n)
      },
      credit: (n: number) => {
        if (isPreview || demoBal != null) {
          setDemoBal((b) => (b ?? 5000) + n)
          return
        }
        credit(n)
      },
      refresh,
      demo: isPreview,
    }),
    [canAfford, credit, debit, demoBal, isPreview, refresh],
  )

  const g = useDoubleFortuneGame({
    ...walletApi,
    playSfx: play,
    onMessage,
  })

  useEffect(() => {
    if (bootRef.current) return
    bootRef.current = true
    let cancelled = false
    ;(async () => {
      g.setPhase('studio')
      await new Promise((r) => setTimeout(r, 1100))
      if (cancelled) return
      g.setPhase('loading')
      await preloadDoubleFortuneAssets((pct) => {
        if (!cancelled) g.setLoadProgress(pct)
      })
      if (cancelled) return
      g.setLoadProgress(100)
      await new Promise((r) => setTimeout(r, 400))
      if (cancelled) return
      try {
        if (localStorage.getItem('zee9-df-intro-skip') === '1') {
          g.enterGame()
          startAmbience()
          return
        }
      } catch {
        /* ignore */
      }
      g.setPhase('getStarted')
    })()
    return () => {
      cancelled = true
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const onGetStarted = useCallback(() => {
    unlock()
    startAmbience()
    try {
      localStorage.setItem('zee9-df-intro-skip', '1')
    } catch {
      /* ignore */
    }
    g.enterGame()
  }, [g, startAmbience, unlock])

  const onSpin = useCallback(() => {
    unlock()
    setSpinPressed(true)
    window.setTimeout(() => setSpinPressed(false), 400)
    void g.runSpin()
  }, [g, unlock])

  const showIntro = g.phase === 'studio' || g.phase === 'loading' || g.phase === 'getStarted'
  const playing = !showIntro

  const coupleClass =
    g.winReaction === 'large'
      ? styles.reactLarge
      : g.winReaction === 'medium'
        ? styles.reactMedium
        : g.winReaction === 'small'
          ? styles.reactSmall
          : ''

  return (
    <div className={styles.root}>
      <div className={styles.viewport} ref={viewportRef}>
        <div className={styles.shell} style={getDesignScaleShellStyle(layout)}>
          <div className={styles.stage} style={getDesignCanvasStyle(layout)}>
            {showIntro && (
              <LoadingFlow
                stage={g.phase as 'studio' | 'loading' | 'getStarted'}
                progress={g.loadProgress}
                onGetStarted={onGetStarted}
              />
            )}

            {playing && (
              <>
                <img
                  className={styles.bg}
                  src={ASSET.stage}
                  onError={(e) => {
                    ;(e.target as HTMLImageElement).src = ASSET.stageFallback
                  }}
                  alt=""
                  draggable={false}
                />
                <DustLayer />
                <div className={g.curtain ? styles.curtainClose : undefined}>
                  <img
                    className={`${styles.curtain} ${styles.curtainL}`}
                    src={ASSET.curtainL}
                    alt=""
                    draggable={false}
                  />
                  <img
                    className={`${styles.curtain} ${styles.curtainR}`}
                    src={ASSET.curtainR}
                    alt=""
                    draggable={false}
                  />
                </div>
                <img
                  className={`${styles.lantern} ${styles.lanternL}`}
                  src={ASSET.lantern}
                  alt=""
                  draggable={false}
                />
                <img
                  className={`${styles.lantern} ${styles.lanternR}`}
                  src={ASSET.lantern}
                  alt=""
                  draggable={false}
                />

                <button
                  type="button"
                  className={styles.lobbyBtn}
                  onClick={() => navigate(-1)}
                  aria-label="Lobby"
                >
                  <img src={ASSET.lobby} alt="" draggable={false} />
                </button>

                <div className={`${styles.coupleWrap} ${coupleClass}`}>
                  <img className={styles.couple} src={ASSET.couple} alt="" draggable={false} />
                </div>

                <div className={styles.banner} style={{ top: BAND.bannerY, height: BAND.bannerH }}>
                  <img className={styles.bannerImg} src={ASSET.banner} alt="" draggable={false} />
                  <span
                    className={`${styles.bannerText} ${g.statusMsg.length > 28 ? styles.scroll : ''}`}
                  >
                    {g.statusMsg}
                  </span>
                </div>

                {g.inFreeSpins && (
                  <>
                    <div className={styles.fsCounter}>
                      FS
                      <br />
                      {g.freeSpinsLeft}
                    </div>
                    <div className={styles.fsBadge}>
                      <img src={ASSET.x8} alt="x8" draggable={false} />
                    </div>
                  </>
                )}

                <div
                  className={`${styles.reelArea} ${g.winningCells.size ? styles.dimWins : ''}`}
                  style={{ top: BAND.reelY }}
                >
                  {g.inFreeSpins && g.gridB ? (
                    <div className={styles.dualReels}>
                      <ReelMachine
                        grid={g.grid}
                        spinning={g.spinning}
                        stoppingReels={g.stoppingReels}
                        winningCells={g.winningCells}
                        turbo={g.turbo}
                        compact
                        boardKey="a"
                      />
                      <ReelMachine
                        grid={g.gridB}
                        spinning={g.spinning}
                        stoppingReels={g.stoppingReels}
                        winningCells={g.winningCells}
                        turbo={g.turbo}
                        compact
                        boardKey="b"
                      />
                    </div>
                  ) : (
                    <ReelMachine
                      grid={g.grid}
                      spinning={g.spinning}
                      stoppingReels={g.stoppingReels}
                      winningCells={g.winningCells}
                      turbo={g.turbo}
                    />
                  )}
                </div>

                <div className={styles.infoStrip} style={{ top: BAND.infoY }}>
                  <img className={styles.infoBg} src={ASSET.infoStrip} alt="" draggable={false} />
                  <span className={styles.infoVal}>{formatMoney(liveBalance)}</span>
                  <span className={styles.infoCenter}>Z9</span>
                  <span className={styles.infoVal}>
                    {formatMoney(g.displayWin > 0 ? g.displayWin : g.bet)}
                  </span>
                </div>

                <div className={styles.deck} style={{ top: BAND.deckY, height: BAND.deckH }}>
                  <img className={styles.deckImg} src={ASSET.controlDeck} alt="" draggable={false} />
                </div>

                <div className={styles.controls} style={{ top: BAND.ctrlY, height: BAND.ctrlH }}>
                  <button
                    type="button"
                    className={`${styles.ctrlBtn} ${g.turbo ? styles.ctrlBtnActive : ''}`}
                    style={{ width: CTRL_BTN, height: CTRL_BTN }}
                    onClick={g.toggleTurbo}
                    aria-label="Turbo"
                  >
                    <img src={ASSET.turbo} alt="" draggable={false} />
                  </button>
                  <button
                    type="button"
                    className={styles.ctrlBtn}
                    style={{ width: CTRL_BTN, height: CTRL_BTN }}
                    onClick={() => g.adjustBet(-1)}
                    disabled={g.controlsLocked}
                    aria-label="Decrease bet"
                  >
                    <img src={ASSET.minus} alt="" draggable={false} />
                  </button>
                  <button
                    type="button"
                    className={`${styles.spinBtn} ${spinPressed ? styles.spinPressed : ''}`}
                    style={{ width: SPIN_SIZE, height: SPIN_SIZE }}
                    onClick={() => {
                      if (g.autoLeft > 0) g.stopAuto()
                      else onSpin()
                    }}
                    disabled={g.controlsLocked && g.autoLeft === 0}
                    aria-label="Spin"
                  >
                    <img src={ASSET.spin} alt="" draggable={false} />
                  </button>
                  <button
                    type="button"
                    className={styles.ctrlBtn}
                    style={{ width: CTRL_BTN, height: CTRL_BTN }}
                    onClick={() => g.openModal('bet')}
                    disabled={g.controlsLocked}
                    aria-label="Bet options"
                  >
                    <img src={ASSET.plus} alt="" draggable={false} />
                  </button>
                  <button
                    type="button"
                    className={styles.ctrlBtn}
                    style={{ width: CTRL_BTN, height: CTRL_BTN }}
                    onClick={() => (g.autoLeft > 0 ? g.stopAuto() : g.openModal('auto'))}
                    aria-label="Auto spin"
                  >
                    <img src={ASSET.auto} alt="" draggable={false} />
                  </button>
                </div>

                {g.turboToast && <div className={styles.toast}>Turbo Spin Enabled</div>}

                {g.winTier === 'big' && (
                  <div className={styles.winBanner}>
                    <img src={ASSET.megaWin} alt="Mega Win" draggable={false} />
                  </div>
                )}
                {g.winTier === 'medium' && (
                  <div className={styles.winBanner}>
                    <img src={ASSET.bigWin} alt="Big Win" draggable={false} />
                  </div>
                )}
                {g.displayWin > 0 && g.phase === 'winPresentation' && (
                  <div className={styles.winAmount}>{formatMoney(g.displayWin)}</div>
                )}
                {(g.phase === 'freeSpinsIntro' || g.phase === 'featureTriggered') && (
                  <div className={styles.winBanner}>
                    <img src={ASSET.freeSpins} alt="Free Spins" draggable={false} />
                  </div>
                )}

                <CoinBurst active={g.winTier === 'big'} />

                <BetOptionsSheet
                  open={g.modal === 'bet'}
                  bet={g.bet}
                  onClose={g.closeModal}
                  onConfirm={(n) => {
                    g.setBetAmount(n)
                    g.closeModal()
                  }}
                />
                <AutoSpinSheet
                  open={g.modal === 'auto'}
                  options={g.autoOptions}
                  onClose={g.closeModal}
                  onStart={g.startAuto}
                />

                <button
                  type="button"
                  className={styles.ctrlBtn}
                  style={{
                    position: 'absolute',
                    right: 10,
                    bottom: 16,
                    width: 36,
                    height: 36,
                    zIndex: 15,
                    opacity: muted ? 0.45 : 1,
                  }}
                  onClick={toggleMute}
                  aria-label="Sound"
                >
                  <img src={ASSET.sound} alt="" draggable={false} />
                </button>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
