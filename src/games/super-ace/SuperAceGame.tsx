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
  DESIGN_H,
  DESIGN_W,
  formatMoney,
} from './constants/gameConfig'
import {
  BAND,
  BUY_BONUS_SIZE,
  BUY_BONUS_X,
  CTRL_BTN,
  LEFT_STRIP_X,
  LEFT_STRIP_Y,
  LOGO_H,
  LOGO_W,
  LOGO_X,
  MACHINE_H,
  SPIN_SIZE,
  STAGE_H,
  STAGE_W,
} from './constants/layoutConfig'
import { preloadSuperAceAssets } from './constants/assetManifest'
import { useSuperAceGame } from './hooks/useSuperAceGame'
import { useSuperAceSound } from './hooks/useSuperAceSound'
import LoadingFlow from './components/LoadingFlow'
import CardBoard from './components/CardBoard'
import { BuyBonusPanel, PaytablePanel, SuperWinOverlay } from './components/Overlays'
import styles from './styles/royalAce.module.css'

const INTRO_KEY = 'zee9-royal-ace-intro-skip'

export default function SuperAceGame({ onMessage }: GameComponentProps) {
  const navigate = useNavigate()
  const viewportRef = useRef<HTMLDivElement>(null)
  const layout = useDesignScale(viewportRef, DESIGN_W, DESIGN_H)
  const { balance, debit, credit, canAfford, refresh } = useWallet()
  const { muted, toggleMute, play, playCombo, unlock, startAmbience } = useSuperAceSound()

  const [loadProgress, setLoadProgress] = useState(4)
  const [assetsReady, setAssetsReady] = useState(false)
  const [loadStage, setLoadStage] = useState<'studio' | 'green' | 'play' | 'done'>('studio')
  const [stripOpen, setStripOpen] = useState(false)
  const [payOpen, setPayOpen] = useState(false)
  const preferSkipIntro = useMemo(() => {
    try {
      return localStorage.getItem(INTRO_KEY) === '1'
    } catch {
      return false
    }
  }, [])

  const api = useMemo(
    () => ({
      canAfford,
      debit,
      credit,
      refresh,
      play,
      playCombo,
      onMessage,
    }),
    [canAfford, credit, debit, onMessage, play, playCombo, refresh],
  )

  const game = useSuperAceGame(api)

  useEffect(() => {
    let cancelled = false
    const studioTimer = window.setTimeout(() => {
      if (!cancelled) setLoadStage('green')
    }, preferSkipIntro ? 400 : 1400)

    void preloadSuperAceAssets((pct) => {
      if (!cancelled) setLoadProgress(pct)
    }).then(() => {
      if (!cancelled) {
        setAssetsReady(true)
        setLoadProgress(100)
        if (preferSkipIntro) {
          setLoadStage('done')
        }
      }
    })
    return () => {
      cancelled = true
      clearTimeout(studioTimer)
    }
  }, [preferSkipIntro])

  useEffect(() => {
    if (preferSkipIntro) return
    if (loadStage === 'green' && assetsReady) {
      const t = window.setTimeout(() => setLoadStage('play'), 500)
      return () => clearTimeout(t)
    }
    return undefined
  }, [preferSkipIntro, loadStage, assetsReady])

  // When skip-intro preferred, keep studio brief then jump to done once ready
  useEffect(() => {
    if (!preferSkipIntro) return
    if (assetsReady) setLoadStage('done')
  }, [preferSkipIntro, assetsReady])

  useEffect(() => {
    if (loadStage === 'done' && assetsReady) {
      unlock()
      startAmbience()
    }
  }, [loadStage, assetsReady, unlock, startAmbience])

  const finishIntro = useCallback(
    (skipNext: boolean) => {
      if (skipNext) {
        try {
          localStorage.setItem(INTRO_KEY, '1')
        } catch {
          /* ignore */
        }
      }
      play('button', 0.5)
      setLoadStage('done')
      unlock()
    },
    [play, unlock],
  )

  const displayBalance = game.balance ?? balance
  const busy =
    game.phase === 'spinning' ||
    game.phase === 'cascading' ||
    game.phase === 'winPresent' ||
    game.phase === 'superWin'

  const cascadeWin = game.cascadeStep?.winAmount ?? (game.phase === 'winPresent' ? game.lastWin : 0)

  return (
    <div className={styles.root}>
      <div className={styles.viewport} ref={viewportRef}>
        <div className={styles.shell} style={getDesignScaleShellStyle(layout)}>
          <div className={styles.stage} style={getDesignCanvasStyle(layout)}>
            <div
              className={styles.wallpaper}
              style={{ backgroundImage: `url(${ASSET.wallpaper})` }}
            />
            <div
              className={styles.felt}
              style={{ backgroundImage: `url(${ASSET.felt})` }}
            />
            <div className={`${styles.edgeGlow} ${styles.edgeGlowTop}`} />
            <div className={`${styles.edgeGlow} ${styles.edgeGlowBot}`} />
            <div className={styles.vignette} />
            <div
              className={styles.woodTop}
              style={{ backgroundImage: `url(${ASSET.woodTop})` }}
            />
            <div
              className={styles.woodBottom}
              style={{ backgroundImage: `url(${ASSET.woodBottom})` }}
            />

            <img
              className={styles.logo}
              src={ASSET.logo}
              alt="Royal Ace"
              style={{ left: LOGO_X, top: BAND.logoY, width: LOGO_W, height: LOGO_H }}
            />

            <button
              type="button"
              className={styles.buyBonus}
              style={{
                left: BUY_BONUS_X,
                top: BAND.buyBonusY,
                width: BUY_BONUS_SIZE,
                height: BUY_BONUS_SIZE,
              }}
              disabled={busy || game.inFreeSpins}
              onClick={() => {
                unlock()
                game.openBonusBuy()
              }}
              aria-label="Buy Bonus"
            >
              <img src={ASSET.buyBonus} alt="Buy Bonus" />
            </button>

            <CardBoard
              board={game.board}
              phase={game.phase}
              winningCells={game.winningCells}
              comboIndex={game.comboIndex}
              cascadeWin={cascadeWin}
              spinning={game.phase === 'spinning'}
            />

            <div
              className={styles.winAbove}
              style={{ top: BAND.boardY + MACHINE_H + 4 }}
            >
              {game.inFreeSpins
                ? `FREE SPINS ${game.freeSpinsLeft}`
                : `WIN ${formatMoney(game.displayWin || game.spinWin)}`}
            </div>

            <div
              className={styles.ctrlRing}
              style={{ top: BAND.ctrlY, height: BAND.ctrlH }}
            >
              <div className={styles.ctrlSide}>
                <button
                  type="button"
                  className={styles.ctrlBtn}
                  style={{ width: CTRL_BTN, height: CTRL_BTN }}
                  onClick={() => {
                    play('button')
                    setPayOpen(true)
                  }}
                  aria-label="Paytable"
                >
                  <img src={ASSET.settings} alt="Settings" />
                </button>
                <div className={styles.meterCol}>
                  <span className={styles.meterLabel}>Bet</span>
                  <span className={styles.meterValue}>{formatMoney(game.betAmount)}</span>
                  <div style={{ display: 'flex', gap: 4 }}>
                    <button
                      type="button"
                      className={styles.ctrlBtn}
                      style={{ width: 28, height: 28 }}
                      disabled={busy}
                      onClick={() => game.betMinus()}
                    >
                      <img src={ASSET.minus} alt="-" />
                    </button>
                    <button
                      type="button"
                      className={styles.ctrlBtn}
                      style={{ width: 28, height: 28 }}
                      disabled={busy}
                      onClick={() => game.betPlus()}
                    >
                      <img src={ASSET.plus} alt="+" />
                    </button>
                  </div>
                </div>
              </div>

              <div className={styles.spinCenter}>
                <button
                  type="button"
                  className={`${styles.spinBtn} ${busy ? styles.spinBtnBusy : ''}`}
                  style={{ width: SPIN_SIZE, height: SPIN_SIZE }}
                  disabled={busy}
                  onClick={() => {
                    unlock()
                    void game.spin()
                  }}
                  aria-label="Spin"
                >
                  <img src={ASSET.spin} alt="Spin" />
                </button>
              </div>

              <div className={`${styles.ctrlSide} ${styles.ctrlSideRight}`}>
                <button
                  type="button"
                  className={`${styles.ctrlBtn} ${game.autoLeft > 0 ? styles.ctrlBtnActive : ''}`}
                  style={{ width: CTRL_BTN, height: CTRL_BTN }}
                  onClick={() => {
                    unlock()
                    game.toggleAuto()
                  }}
                  aria-label="Auto spin"
                >
                  <img src={ASSET.auto} alt="Auto" />
                </button>
                <button
                  type="button"
                  className={`${styles.ctrlBtn} ${game.turbo ? styles.ctrlBtnActive : ''}`}
                  style={{ width: CTRL_BTN, height: CTRL_BTN }}
                  onClick={() => {
                    unlock()
                    game.toggleTurbo()
                  }}
                  aria-label="Turbo"
                >
                  <img src={ASSET.turbo} alt="Turbo" />
                </button>
                <button
                  type="button"
                  className={styles.ctrlBtn}
                  style={{ width: CTRL_BTN, height: CTRL_BTN }}
                  onClick={() => {
                    toggleMute()
                    play('button')
                  }}
                  aria-label="Sound"
                >
                  <img
                    src={ASSET.sound}
                    alt="Sound"
                    style={{ opacity: muted ? 0.4 : 1 }}
                  />
                </button>
              </div>
            </div>

            <div className={styles.balUnder} style={{ top: BAND.ctrlY + BAND.ctrlH - 18 }}>
              Balance {formatMoney(displayBalance)}
              {game.autoLeft > 0 ? ` · Auto ${game.autoLeft}` : ''}
            </div>

            <div
              className={`${styles.leftStrip} ${stripOpen ? '' : styles.leftStripCollapsed}`}
              style={{ left: LEFT_STRIP_X, top: LEFT_STRIP_Y }}
            >
              <div className={styles.stripBtns}>
                <button
                  type="button"
                  className={styles.ctrlBtn}
                  style={{ width: 36, height: 36 }}
                  onClick={() => navigate(-1)}
                  aria-label="Lobby"
                >
                  <img src={ASSET.menu} alt="Menu" />
                </button>
                <button
                  type="button"
                  className={styles.ctrlBtn}
                  style={{ width: 36, height: 36 }}
                  onClick={() => setPayOpen(true)}
                >
                  <img src={ASSET.info} alt="Info" />
                </button>
                <button
                  type="button"
                  className={styles.ctrlBtn}
                  style={{ width: 36, height: 36 }}
                  onClick={toggleMute}
                >
                  <img src={ASSET.sound} alt="Sound" />
                </button>
                <button
                  type="button"
                  className={styles.ctrlBtn}
                  style={{ width: 36, height: 36 }}
                  onClick={() => setPayOpen(true)}
                >
                  <img src={ASSET.settings} alt="Settings" />
                </button>
              </div>
              <button
                type="button"
                className={styles.stripToggle}
                onClick={() => setStripOpen((o) => !o)}
                aria-label="Toggle menu"
              >
                <img src={ASSET.menu} alt="" />
              </button>
            </div>

            {game.inFreeSpins && (
              <div className={styles.freeBadge}>
                FREE SPINS · {game.freeSpinsLeft} left
              </div>
            )}

            <SuperWinOverlay
              show={game.phase === 'superWin'}
              amount={game.displayWin || game.spinWin}
            />

            {game.bonusBuyOpen && (
              <BuyBonusPanel
                bet={game.betAmount}
                onClose={game.closeBonusBuy}
                onBuy={game.buyBonus}
                onBetChange={(dir) => (dir > 0 ? game.betPlus() : game.betMinus())}
              />
            )}

            {payOpen && <PaytablePanel onClose={() => setPayOpen(false)} />}

            {loadStage !== 'done' && (
              <LoadingFlow
                progress={loadProgress}
                ready={assetsReady}
                stage={loadStage}
                onPlay={finishIntro}
              />
            )}
          </div>
        </div>
      </div>
      {/* design size marker for scale */}
      <span style={{ display: 'none' }}>
        {STAGE_W}×{STAGE_H}
      </span>
    </div>
  )
}
