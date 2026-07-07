import type { RefObject } from 'react'
import { getDesignCanvasStyle, getDesignScaleShellStyle, type DesignLayout } from '../hooks/useDesignScale'
import { buildCrashCurvePaths, multiplierToCrashProgress, CRASH_VIEW_H, CRASH_VIEW_W } from '../engines/crashCurve'
import { CRASH_ASSETS, historyPanelFor } from './crashAssets'
import {
  BackChevronIcon,
  CartWagonIcon,
  ChartTrendIcon,
  CrashRocketIcon,
  MenuDiamondsIcon,
  PokerChipIcon,
  PromoPinIcon,
  SocialGroupIcon,
  SpeakerVentIcon,
} from './crashClassicGfx'
import styles from './crashGame.module.css'

export type CrashHistoryEntry = {
  roundId: number
  mult: number
}

export type CrashPhase = 'waiting' | 'flying' | 'crashed' | 'cashed'

export type CrashDesignUIProps = {
  viewportRef: RefObject<HTMLDivElement | null>
  layout: DesignLayout
  rootClassName: string
  canvasClassName: string
  bankroll: number
  balance: number
  betAmount: number
  mult: number
  phase: Phase
  countdown: number
  history: CrashHistoryEntry[]
  roundNo: number
  autoBet: boolean
  autoEscape: boolean
  gameType: 'classic' | 'trenball'
  betPlaced: boolean
  showWelcome: boolean
  onWelcomeChoice: (training: boolean) => void
  onAutoBetToggle: () => void
  onAutoEscapeToggle: () => void
  onGameTypeToggle: () => void
  onBetMinus: () => void
  onBetPlus: () => void
  onBet: () => void
  onCashOut: () => void
  onHome: () => void
}

type Phase = CrashPhase

function formatBankroll(n: number) {
  return Math.floor(n).toString().padStart(8, '0')
}

function formatBet(n: number) {
  if (n < 100) return (n / 100).toFixed(2)
  return n.toLocaleString('en-PK', { maximumFractionDigits: 0 })
}

function formatCompact(n: number) {
  return n.toLocaleString('en-PK', { maximumFractionDigits: 0 })
}

function FlipClock({ value }: { value: string }) {
  return (
    <div className={styles.flipClock}>
      {value.split('').map((d, i) => (
        <span key={`${i}-${d}`} className={styles.flipDigit}>
          {d}
        </span>
      ))}
    </div>
  )
}

function ToggleSwitch({
  vertical,
  on,
  onClick,
  className,
}: {
  vertical?: boolean
  on: boolean
  onClick: () => void
  className?: string
}) {
  const knobClass = vertical
    ? on
      ? styles.toggleKnobBottom
      : styles.toggleKnobTop
    : on
      ? styles.toggleKnobTop
      : styles.toggleKnobBottom

  return (
    <button
      type="button"
      className={`${styles.toggleSwitch} ${vertical ? '' : styles.hToggle} ${className ?? ''}`}
      onClick={onClick}
      aria-pressed={on}
    >
      <div className={styles.toggleTrack}>
        <span className={`${styles.toggleKnob} ${knobClass}`} />
        <span className={`${styles.toggleLed} ${on ? styles.toggleLedOn : styles.toggleLedOff}`} style={vertical ? { top: 10, right: -8, bottom: 'auto' } : { top: '50%', left: -8, right: 'auto', transform: 'translateY(-50%)' }} />
        <span className={`${styles.toggleLed} ${on ? styles.toggleLedOff : styles.toggleLedOn}`} style={vertical ? { bottom: 10, right: -8, top: 'auto' } : { top: '50%', right: -8, left: 'auto', transform: 'translateY(-50%)' }} />
      </div>
    </button>
  )
}

export default function CrashDesignUI({
  viewportRef,
  layout,
  rootClassName,
  canvasClassName,
  bankroll,
  balance,
  betAmount,
  mult,
  phase,
  countdown,
  history,
  autoBet,
  autoEscape,
  gameType,
  betPlaced,
  showWelcome,
  onWelcomeChoice,
  onAutoBetToggle,
  onAutoEscapeToggle,
  onGameTypeToggle,
  onBetMinus,
  onBetPlus,
  onBet,
  onCashOut,
  onHome,
}: CrashDesignUIProps) {
  const progress = phase === 'flying' || phase === 'crashed' ? multiplierToCrashProgress(mult) : 0
  const showProgress = phase === 'flying' || phase === 'crashed' ? Math.max(progress, phase === 'flying' ? 0.03 : 0) : 0
  const curve = buildCrashCurvePaths(showProgress)
  const showCurve = (phase === 'flying' || phase === 'crashed') && showProgress > 0
  const cashOutAmt = Math.round(betAmount * mult)

  const centerText =
    phase === 'waiting'
      ? `New Round Starts in ${countdown.toFixed(2)} S`
      : phase === 'flying'
        ? null
        : phase === 'cashed'
          ? 'Cashed Out!'
          : 'Crashed!'

  const multClass =
    phase === 'flying'
      ? styles.multFlying
      : phase === 'crashed'
        ? styles.multCrashed
        : phase === 'cashed'
          ? styles.multCashed
          : styles.multWaiting

  return (
    <div className={rootClassName} ref={viewportRef}>
      <div style={getDesignScaleShellStyle(layout)}>
        <div className={canvasClassName} style={getDesignCanvasStyle(layout)}>
          <div className={styles.panelBg} aria-hidden />

          <header className={styles.topBar}>
            <div className={styles.topLeft}>
              <button type="button" className={styles.backBtn} onClick={onHome} aria-label="Back">
                <BackChevronIcon />
              </button>
              <div className={styles.promoBadge}>
                <PromoPinIcon className={styles.promoIcon} />
                <span>Play Game</span>
                <strong>Rs{betAmount}</strong>
              </div>
            </div>

            <div className={styles.topCenter}>
              <span className={styles.bankrollLabel}>BANKROLL</span>
              <FlipClock value={formatBankroll(bankroll)} />
              <div className={styles.historyStrip}>
                {history.slice(0, 10).map((h) => {
                  const ledClass =
                    h.mult < 2 ? styles.historyLedLow : h.mult >= 10 ? styles.historyLedHigh : styles.historyLed
                  const multClass =
                    h.mult < 2 ? styles.historyMultLow : h.mult >= 10 ? styles.historyMultHigh : styles.historyMultMid
                  return (
                    <div key={h.roundId} className={styles.historyItem}>
                      <span className={`${styles.historyLed} ${ledClass}`} />
                      <span className={styles.historyRound}>{h.roundId}</span>
                      <span
                        className={`${styles.historyMult} ${multClass}`}
                        style={{ backgroundImage: `url(${historyPanelFor(h.mult)})` }}
                      >
                        {h.mult.toFixed(2)}x
                      </span>
                    </div>
                  )
                })}
                <button type="button" className={styles.historyChartBtn} aria-label="History chart">
                  <ChartTrendIcon />
                </button>
              </div>
            </div>

            <div className={styles.topRight}>
              <img
                className={styles.avatar}
                src="https://api.dicebear.com/7.x/avataaars/svg?seed=P9751521&backgroundColor=f0d0a0&hairColor=e8b830"
                alt=""
              />
              <div className={styles.userPill}>P9751521</div>
              <div className={styles.balanceBox}>
                <PokerChipIcon className={styles.balanceChip} />
                <span>{formatCompact(balance)}</span>
                <button type="button" className={styles.plusBtn} aria-label="Add chips">
                  +
                </button>
              </div>
              <button type="button" className={styles.addBtn}>
                <span>ADD</span>
                <CartWagonIcon className={styles.cartIcon} />
              </button>
              <button type="button" className={styles.menuBtn} aria-label="Menu">
                <MenuDiamondsIcon />
              </button>
            </div>
          </header>

          <main className={styles.body}>
            <aside className={styles.sideCol}>
              <span className={styles.sideLabel}>GAME TYPE</span>
              <div className={styles.toggleStack}>
                <span className={styles.toggleOption}>Trenball</span>
                <ToggleSwitch vertical on={gameType === 'classic'} onClick={onGameTypeToggle} />
                <span className={styles.toggleOption}>Classic</span>
              </div>
              <button type="button" className={styles.socialBtn} aria-label="Players">
                <SocialGroupIcon />
              </button>
              <div className={styles.vent}>
                <SpeakerVentIcon />
              </div>
            </aside>

            <section className={styles.graphWrap}>
              <div className={styles.graphFrame}>
                <div className={styles.graphScreen}>
                  <div className={styles.graphBg} style={{ backgroundImage: `url(${CRASH_ASSETS.graphBg})` }} />
                  <div className={styles.graphGrid} />
                  <div className={styles.graphAxisY}>
                    <span>1.8x</span>
                    <span>1.6x</span>
                    <span>1.4x</span>
                    <span>1.2x</span>
                  </div>
                  <div className={styles.graphAxisX}>
                    <span>2</span>
                    <span>4</span>
                    <span>6</span>
                    <span>8</span>
                    <span>10</span>
                  </div>
                  <svg className={styles.graphCurve} preserveAspectRatio="none" viewBox={`0 0 ${CRASH_VIEW_W} ${CRASH_VIEW_H}`}>
                    <defs>
                      <linearGradient id="crashCurveFill" x1="0" x2="0" y1="0" y2="1">
                        <stop offset="0%" stopColor="#4caf50" stopOpacity="0.35" />
                        <stop offset="100%" stopColor="#4caf50" stopOpacity="0" />
                      </linearGradient>
                    </defs>
                    {showCurve && (
                      <>
                        <path d={curve.fill} fill="url(#crashCurveFill)" />
                        <path d={curve.stroke} fill="none" stroke="#4caf50" strokeLinecap="round" strokeWidth="4" />
                      </>
                    )}
                  </svg>
                  {showCurve ? (
                    <div
                      className={styles.rocketPos}
                      style={{
                        left: `${curve.tipPercent.left}%`,
                        top: `${curve.tipPercent.top}%`,
                      }}
                    >
                      <CrashRocketIcon size={28} />
                    </div>
                  ) : (
                    <div className={styles.rocketPos} style={{ left: '8%', top: '92%' }}>
                      <CrashRocketIcon size={24} />
                    </div>
                  )}
                  <div className={styles.graphCenter}>
                    {phase === 'flying' ? (
                      <span className={`${styles.multDisplay} ${multClass}`}>{mult.toFixed(2)}×</span>
                    ) : centerText ? (
                      <span className={multClass}>{centerText}</span>
                    ) : null}
                    {phase === 'crashed' && (
                      <span className={`${styles.multDisplay} ${styles.multCrashed}`}>{mult.toFixed(2)}×</span>
                    )}
                  </div>
                </div>
              </div>
            </section>

            <aside className={styles.sideCol}>
              <div className={styles.vent}>
                <SpeakerVentIcon />
              </div>
              <span className={styles.sideLabel}>AUTO ESCAPE</span>
              <div className={styles.toggleStack}>
                <span className={styles.toggleOption}>ON</span>
                <ToggleSwitch vertical on={autoEscape} onClick={onAutoEscapeToggle} />
                <span className={styles.toggleOption}>OFF</span>
              </div>
            </aside>
          </main>

          <footer className={styles.bottomBar}>
            <div className={styles.bottomSide}>
              <span className={styles.sideLabel}>AUTO BET</span>
              <div className={styles.toggleStack}>
                <span className={styles.toggleOption}>ON</span>
                <ToggleSwitch on={autoBet} onClick={onAutoBetToggle} />
                <span className={styles.toggleOption}>OFF</span>
              </div>
            </div>

            <div className={styles.betCluster}>
              <button type="button" className={styles.betMinus} onClick={onBetMinus} disabled={phase === 'flying'} aria-label="Decrease bet">
                −
              </button>
              <div className={styles.betDisplay}>
                <span className={styles.betLabel}>YOUR BET</span>
                <span className={styles.betValue}>{formatBet(betAmount)}</span>
              </div>
              <button type="button" className={styles.betPlus} onClick={onBetPlus} disabled={phase === 'flying'} aria-label="Increase bet">
                +
              </button>
            </div>

            {phase === 'waiting' && !betPlaced && (
              <button type="button" className={styles.betBtn} onClick={onBet}>
                BET
              </button>
            )}
            {phase === 'waiting' && betPlaced && (
              <button type="button" className={`${styles.betBtn} ${styles.betBtnWaiting}`} disabled>
                WAITING…
              </button>
            )}
            {phase === 'flying' && betPlaced && (
              <button type="button" className={`${styles.betBtn} ${styles.betBtnCashout}`} onClick={onCashOut}>
                CASH OUT {formatCompact(cashOutAmt)}
              </button>
            )}
            {phase === 'flying' && !betPlaced && (
              <button type="button" className={`${styles.betBtn} ${styles.betBtnWaiting}`} disabled>
                FLYING
              </button>
            )}
            {(phase === 'crashed' || phase === 'cashed') && (
              <button type="button" className={`${styles.betBtn} ${styles.betBtnWaiting}`} disabled>
                {phase === 'crashed' ? 'CRASHED' : 'WON!'}
              </button>
            )}

            <div className={styles.bottomSide} aria-hidden />
          </footer>

          {showWelcome && (
            <div className={styles.welcomeOverlay}>
              <div className={styles.welcomeModal}>
                <div className={styles.welcomeArt}>
                  <img src={CRASH_ASSETS.guideCharacter} alt="" />
                </div>
                <div className={styles.welcomeBody}>
                  <h2 className={styles.welcomeTitle}>
                    welcome to <em>Crash</em>
                  </h2>
                  <p className={styles.welcomeText}>
                    Dear player, now we start our journey to the crash, do you need training from a novice?
                  </p>
                  <div className={styles.welcomeActions}>
                    <button type="button" className={styles.welcomeBtn} onClick={() => onWelcomeChoice(true)}>
                      Yes
                    </button>
                    <button type="button" className={styles.welcomeBtn} onClick={() => onWelcomeChoice(false)}>
                      No
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
