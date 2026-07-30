import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useWallet } from '../../context/WalletContext'
import type { GameComponentProps } from '../types'
import {
  getDesignCanvasStyle,
  getDesignScaleShellStyle,
  useDesignScale,
} from '../hooks/useDesignScale'
import {
  ASSET,
  BET_POPUP_AMOUNTS,
  DESIGN_H,
  DESIGN_W,
  formatMoney,
} from './constants/gameConfig'
import { preloadFortuneGems2Assets } from './constants/assetManifest'
import { useFortuneGems2Game } from './hooks/useFortuneGems2Game'
import { useFortuneGems2Sound } from './hooks/useFortuneGems2Sound'
import LoadingScreen from './components/LoadingScreen'
import InfoPanel from './components/InfoPanel'
import { LuckyWheel, ReelGrid, SpecialPanel } from './components/MachineParts'
import styles from './styles/fortuneGems2.module.css'

const INTRO_KEY = 'zee9-fortune-gems-2-intro-skip'

export default function FortuneGems2Game({ onMessage }: GameComponentProps) {
  const navigate = useNavigate()
  const viewportRef = useRef<HTMLDivElement>(null)
  const layout = useDesignScale(viewportRef, DESIGN_W, DESIGN_H)
  const { balance, debit, credit, canAfford, refresh } = useWallet()
  const { muted, toggleMute, play, unlock } = useFortuneGems2Sound()

  const [loadProgress, setLoadProgress] = useState(4)
  const [assetsReady, setAssetsReady] = useState(false)
  const preferSkipIntro = useMemo(() => {
    try {
      return localStorage.getItem(INTRO_KEY) === '1'
    } catch {
      return false
    }
  }, [])
  const [showLoader, setShowLoader] = useState(true)
  const [infoOpen, setInfoOpen] = useState(false)
  const [betPickerOpen, setBetPickerOpen] = useState(false)
  const api = useMemo(
    () => ({
      canAfford,
      debit,
      credit,
      refresh,
      play,
      onMessage,
    }),
    [canAfford, credit, debit, onMessage, play, refresh],
  )

  const game = useFortuneGems2Game(api)

  useEffect(() => {
    let cancelled = false
    const started = performance.now()
    void preloadFortuneGems2Assets((pct) => {
      if (!cancelled) setLoadProgress(Math.max(4, pct))
    }).then(async () => {
      // Keep loader visible briefly so progress feels real
      const wait = Math.max(0, 700 - (performance.now() - started))
      if (wait) await new Promise((r) => setTimeout(r, wait))
      if (!cancelled) {
        setAssetsReady(true)
        setLoadProgress(100)
      }
    })
    return () => {
      cancelled = true
    }
  }, [])

  useEffect(() => {
    if (!showLoader && assetsReady) unlock()
  }, [showLoader, assetsReady, unlock])

  const finishLoader = useCallback(
    (skipNext: boolean) => {
      if (!assetsReady) return
      if (skipNext) {
        try {
          localStorage.setItem(INTRO_KEY, '1')
        } catch {
          /* ignore */
        }
      }
      setShowLoader(false)
      unlock()
      play('button', 0.4)
    },
    [assetsReady, play, unlock],
  )

  const dust = useMemo(
    () =>
      Array.from({ length: 14 }, (_, i) => ({
        id: i,
        left: `${(i * 13 + 7) % 100}%`,
        delay: `${(i % 8) * 0.7}s`,
        dur: `${5 + (i % 5)}s`,
      })),
    [],
  )

  const spinning = game.phase === 'spinning'
  const specialSpinning = game.phase === 'specialSpin' || game.phase === 'spinning'
  const dimScene = game.phase === 'wheelSpin'
  const showWinOverlay = game.phase === 'presenting' && game.result && game.result.payout > 0
  const bigWin = Boolean(
    game.result &&
      game.result.payout > 0 &&
      (game.result.fullBoard || game.result.wheelTriggered || game.result.payout >= game.betAmount * 10),
  )

  // Hard gate: never render gameplay until critical assets finished
  if (!assetsReady || showLoader) {
    return (
      <div className={styles.root} ref={viewportRef}>
        <div style={getDesignScaleShellStyle(layout)}>
          <div className={styles.canvas} style={getDesignCanvasStyle(layout)}>
            <LoadingScreen
              progress={loadProgress}
              ready={assetsReady}
              autoEnter={preferSkipIntro}
              onContinue={finishLoader}
            />
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className={styles.root} ref={viewportRef} onPointerDown={unlock}>
      <div style={getDesignScaleShellStyle(layout)}>
        <div
          className={`${styles.canvas} ${dimScene ? styles.dimScene : ''} ${bigWin && game.phase === 'presenting' ? styles.shake : ''}`}
          style={getDesignCanvasStyle(layout)}
        >
          <div className={styles.bg} style={{ backgroundImage: `url(${ASSET.bgPlay})` }} />
          <div className={styles.rays} />
          <div className={styles.dust} aria-hidden>
            {dust.map((d) => (
              <span
                key={d.id}
                style={{
                  left: d.left,
                  bottom: '8%',
                  animationDelay: d.delay,
                  animationDuration: d.dur,
                }}
              />
            ))}
          </div>
          <div className={styles.leavesL} style={{ backgroundImage: `url(${ASSET.leavesL})` }} />
          <div className={styles.leavesR} style={{ backgroundImage: `url(${ASSET.leavesR})` }} />

          <header className={styles.header}>
            <button
              type="button"
              className={styles.iconBtn}
              aria-label="Home"
              onClick={() => {
                play('button')
                navigate('/')
              }}
            >
              <img src={ASSET.settings} alt="" />
            </button>
            <img className={styles.logo} src={ASSET.logo} alt="Fortune Gems 2" />
            <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
              <div className={styles.volatility}>
                {[1, 1, 1, 0, 0].map((on, i) => (
                  <img key={i} src={on ? ASSET.chiliOn : ASSET.chiliOff} alt="" />
                ))}
              </div>
              <button
                type="button"
                className={styles.iconBtn}
                aria-label={muted ? 'Unmute' : 'Mute'}
                onClick={() => {
                  toggleMute()
                  play('button')
                }}
              >
                <img src={muted ? ASSET.soundOff : ASSET.sound} alt="" />
              </button>
              <button
                type="button"
                className={styles.iconBtn}
                aria-label="Info"
                onClick={() => {
                  play('button')
                  setInfoOpen(true)
                }}
              >
                <img src={ASSET.info} alt="" />
              </button>
            </div>
          </header>

          <div className={styles.machine}>
            <LuckyWheel
              angle={game.wheelAngle}
              spinning={game.wheelSpinning}
              turbo={game.turbo}
              cruising={game.phase === 'spinning' || game.phase === 'specialSpin'}
            />

            <div
              className={styles.cabinet}
              style={{ backgroundImage: `url(${ASSET.cabinet})` }}
            >
              <div className={styles.banner} style={{ backgroundImage: `url(${ASSET.banner})` }}>
                <span className={styles.bannerText} key={game.banner}>
                  {game.banner}
                </span>
              </div>
              <ReelGrid
                grid={game.grid}
                strips={game.strips}
                spinning={spinning}
                stoppingReels={game.stoppingReels}
                winCells={game.winCells}
                dimNonWins={game.phase === 'presenting' && game.winCells.size > 0}
              />
              <SpecialPanel
                special={game.special}
                strip={game.specialStrip}
                spinning={specialSpinning && game.phase !== 'wheelSpin' && game.phase !== 'presenting' && game.phase !== 'idle'}
                stopping={game.specialStopping}
                highlight={
                  game.phase === 'presenting' &&
                  !!game.result &&
                  game.result.payout > 0
                }
              />
            </div>
          </div>

          {showWinOverlay && (
            <div className={styles.overlay}>
              <div className={styles.winBurst}>
                <img
                  src={game.result?.wheelTriggered || game.result?.fullBoard ? ASSET.bonusBanner : ASSET.winBanner}
                  alt=""
                />
                <div className={styles.winAmount}>{formatMoney(game.displayWin)}</div>
              </div>
            </div>
          )}

          {bigWin && game.phase === 'presenting' && (
            <div className={styles.coins} aria-hidden>
              {Array.from({ length: 14 }, (_, i) => (
                <span
                  key={i}
                  style={{
                    left: `${10 + (i * 6) % 80}%`,
                    top: `${8 + (i % 5) * 4}%`,
                    animationDelay: `${i * 0.05}s`,
                    backgroundImage: `url(${ASSET.coin})`,
                  }}
                />
              ))}
            </div>
          )}

          <button
            type="button"
            className={`${styles.extraBet} ${game.extraBet ? styles.extraBetOn : ''}`}
            disabled={game.busy}
            onClick={game.toggleExtraBet}
            aria-pressed={game.extraBet}
          >
            <span className={styles.extraBetLabel}>Extra Bet</span>
            <span className={styles.extraBetSwitch}>
              <span>{game.extraBet ? 'ON' : 'OFF'}</span>
              <i />
            </span>
          </button>

          {betPickerOpen && (
            <>
              <button
                type="button"
                className={styles.betDismiss}
                aria-label="Close bet selector"
                onClick={() => setBetPickerOpen(false)}
              />
              <div className={styles.betPicker} role="dialog" aria-label="Select bet amount">
                {BET_POPUP_AMOUNTS.map((amount) => (
                  <button
                    type="button"
                    key={amount}
                    className={game.baseBetAmount === amount ? styles.betChoiceActive : ''}
                    onClick={() => {
                      game.selectBet(amount)
                      setBetPickerOpen(false)
                    }}
                  >
                    {formatMoney(amount)}
                  </button>
                ))}
              </div>
            </>
          )}

          <footer className={styles.controls} style={{ backgroundImage: `url(${ASSET.controlBar})` }}>
            <div className={styles.ctrlLeft}>
              <button
                type="button"
                className={styles.tinyBtn}
                aria-label="Info"
                onClick={() => {
                  play('button')
                  setInfoOpen(true)
                }}
              >
                <img src={ASSET.info} alt="" />
              </button>
              <button
                type="button"
                className={styles.tinyBtn}
                aria-label={muted ? 'Unmute' : 'Mute'}
                onClick={toggleMute}
              >
                <img src={muted ? ASSET.soundOff : ASSET.sound} alt="" />
              </button>
            </div>

            <div className={styles.stats}>
              <div className={styles.stat}>
                <span className={styles.statLabel}>BALANCE</span>
                <span className={styles.statValue}>{formatMoney(balance)}</span>
              </div>
              <div className={styles.stat}>
                <span className={styles.statLabel}>BET</span>
                <div className={styles.betRow}>
                  <button type="button" className={styles.betBtn} onClick={game.betMinus} disabled={game.busy}>
                    <img src={ASSET.minus} alt="−" />
                  </button>
                  <button
                    type="button"
                    className={styles.betPickerBtn}
                    disabled={game.busy}
                    aria-label="Choose bet amount"
                    aria-expanded={betPickerOpen}
                    onClick={() => {
                      play('button', 0.35)
                      setBetPickerOpen((open) => !open)
                    }}
                  >
                    <img className={styles.betCoin} src={ASSET.coin} alt="" />
                    <span className={styles.statValue}>{formatMoney(game.betAmount)}</span>
                  </button>
                  <button type="button" className={styles.betBtn} onClick={game.betPlus} disabled={game.busy}>
                    <img src={ASSET.plus} alt="+" />
                  </button>
                </div>
              </div>
              <div className={styles.stat}>
                <span className={styles.statLabel}>WIN</span>
                <span className={`${styles.statValue} ${styles.win}`}>{formatMoney(game.displayWin || game.lastWin)}</span>
              </div>
            </div>

            <div className={styles.ctrlRight}>
              <button
                type="button"
                className={`${styles.tinyBtn} ${game.turbo ? styles.on : ''}`}
                aria-label="Turbo"
                onClick={game.toggleTurbo}
              >
                <img src={game.turbo ? ASSET.turboOn : ASSET.turbo} alt="" />
              </button>
              <button
                type="button"
                className={`${styles.tinyBtn} ${game.auto ? styles.on : ''}`}
                aria-label="Auto spin"
                onClick={game.toggleAuto}
                style={{ position: 'relative' }}
              >
                <img src={game.auto ? ASSET.autoOn : ASSET.auto} alt="" />
                {game.auto && <span className={styles.autoBadge}>{game.autoLeft}</span>}
              </button>
              <button
                type="button"
                className={styles.spinBtn}
                aria-label="Spin"
                disabled={game.busy}
                onClick={() => {
                  unlock()
                  game.spin()
                }}
              >
                <img src={ASSET.spin} alt="SPIN" />
              </button>
            </div>
          </footer>

          <InfoPanel open={infoOpen} onClose={() => setInfoOpen(false)} />
        </div>
      </div>
    </div>
  )
}
