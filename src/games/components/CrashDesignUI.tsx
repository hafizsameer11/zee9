import type { RefObject } from 'react'
import { useEffect, useRef, useState } from 'react'
import { getDesignCanvasStyle, getDesignScaleShellStyle, type DesignLayout } from '../hooks/useDesignScale'
import { buildAxisCrashCurve, CRASH_VIEW_H, CRASH_VIEW_W } from '../engines/crashCurve'
import { multiplierAtElapsed, multiplierAtElapsedSmooth } from '../engines/crash'
import { CRASH_ASSETS, historyPanelFor } from './crashAssets'
import {
  BackChevronIcon,
  CartWagonIcon,
  ChartTrendIcon,
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
  /** Continuous mult for smooth rocket path (defaults to mult). */
  displayMult?: number
  elapsedSec?: number
  /** performance.now()-aligned flight start — local RAF (survives cashout). */
  flightStartPerf?: number | null
  crashCap?: number | null
  onFlightMult?: (mult: number, elapsedSec: number) => void
  phase: CrashPhase
  serverPhase?: 'waiting' | 'flying' | 'crashed'
  playerStatus?: 'idle' | 'active' | 'cashed' | 'bust'
  pendingNextBet?: boolean
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

function canUseLiveMult(
  serverPhase: 'waiting' | 'flying' | 'crashed',
  playerStatus: 'idle' | 'active' | 'cashed' | 'bust',
) {
  return serverPhase === 'flying' && playerStatus === 'active'
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
  return (
    <button
      type="button"
      className={`${styles.rocker} ${vertical ? styles.rockerV : styles.rockerH} ${on ? styles.rockerOn : ''} ${className ?? ''}`}
      onClick={onClick}
      aria-pressed={on}
    >
      <span className={styles.rockerWell}>
        <span className={styles.rockerSlider} />
      </span>
      <span className={`${styles.rockerDot} ${styles.rockerDotOn}`} aria-hidden />
      <span className={`${styles.rockerDot} ${styles.rockerDotOff}`} aria-hidden />
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
  displayMult,
  elapsedSec = 0,
  flightStartPerf = null,
  crashCap = null,
  onFlightMult,
  phase,
  serverPhase = phase === 'cashed' ? 'flying' : phase === 'crashed' ? 'crashed' : phase === 'flying' ? 'flying' : 'waiting',
  playerStatus = 'idle',
  pendingNextBet = false,
  countdown,
  history,
  autoBet,
  autoEscape,
  gameType,
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
  const axisRef = useRef({ t: 10, m: 2 })
  const rafRef = useRef(0)
  const lastNotifyRef = useRef(0)
  const onFlightMultRef = useRef(onFlightMult)
  onFlightMultRef.current = onFlightMult

  const strokePathRef = useRef<SVGPathElement>(null)
  const fillPathRef = useRef<SVGPathElement>(null)
  const rocketRef = useRef<HTMLDivElement>(null)
  const bangRef = useRef<HTMLDivElement>(null)
  const multTextRef = useRef<HTMLSpanElement>(null)
  const bangTextRef = useRef<HTMLSpanElement>(null)

  const [axisLabels, setAxisLabels] = useState(() => {
    const c = buildAxisCrashCurve(0, 1, { t: 10, m: 2 })
    return { y: c.yLabels, x: c.xLabels }
  })
  const [liveDiscrete, setLiveDiscrete] = useState(mult)
  const [showCurve, setShowCurve] = useState(serverPhase === 'flying' || serverPhase === 'crashed')

  const applyFrame = (elapsed: number, smooth: number, discrete: number, flying: boolean) => {
    const curve = buildAxisCrashCurve(Math.max(0, elapsed), Math.max(1, smooth), axisRef.current)
    if (fillPathRef.current) fillPathRef.current.setAttribute('d', curve.fill)
    if (strokePathRef.current) strokePathRef.current.setAttribute('d', curve.stroke)
    if (rocketRef.current) {
      rocketRef.current.style.left = `${curve.tipPercent.left}%`
      rocketRef.current.style.top = `${curve.tipPercent.top}%`
      rocketRef.current.style.transform = `translate(-40%, -55%) rotate(${flying ? curve.angleDeg : -28}deg)`
      rocketRef.current.style.opacity = flying ? '1' : '0'
    }
    if (bangRef.current) {
      bangRef.current.style.left = `${curve.tipPercent.left}%`
      bangRef.current.style.top = `${curve.tipPercent.top}%`
    }
    if (multTextRef.current) multTextRef.current.textContent = `${discrete.toFixed(2)}×`
    if (bangTextRef.current) bangTextRef.current.textContent = `Bang @ ${discrete.toFixed(2)}x`
    // Axis labels change rarely — only commit when scale expands
    const y = curve.yLabels
    const x = curve.xLabels
    setAxisLabels((prev) => {
      const sameY = prev.y.length === y.length && prev.y.every((v, i) => v === y[i])
      const sameX = prev.x.length === x.length && prev.x.every((v, i) => v === x[i])
      return sameY && sameX ? prev : { y, x }
    })
  }

  // Local RAF while round is flying — independent of player cashout (like Aviator)
  useEffect(() => {
    if (serverPhase !== 'flying' || flightStartPerf == null) {
      if (rafRef.current) {
        cancelAnimationFrame(rafRef.current)
        rafRef.current = 0
      }
      return
    }

    setShowCurve(true)
    const tick = () => {
      const elapsedMs = Math.max(0, performance.now() - flightStartPerf)
      const elapsed = elapsedMs / 1000
      let smooth = multiplierAtElapsedSmooth(elapsedMs)
      let discrete = multiplierAtElapsed(elapsedMs)
      if (crashCap != null) {
        smooth = Math.min(smooth, crashCap)
        discrete = Math.min(discrete, crashCap)
      }

      applyFrame(elapsed, smooth, discrete, true)

      const now = performance.now()
      if (now - lastNotifyRef.current > 80) {
        lastNotifyRef.current = now
        setLiveDiscrete(discrete)
        onFlightMultRef.current?.(discrete, elapsed)
      }

      rafRef.current = requestAnimationFrame(tick)
    }

    rafRef.current = requestAnimationFrame(tick)
    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current)
      rafRef.current = 0
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [serverPhase, flightStartPerf, crashCap])

  // Waiting / crashed: draw from parent props (no RAF)
  useEffect(() => {
    if (serverPhase === 'flying' && flightStartPerf != null) return

    if (serverPhase === 'waiting') {
      axisRef.current = { t: 10, m: 2 }
      setShowCurve(false)
      const curve = buildAxisCrashCurve(0, 1, axisRef.current)
      setAxisLabels({ y: curve.yLabels, x: curve.xLabels })
      if (rocketRef.current) {
        rocketRef.current.style.left = '6%'
        rocketRef.current.style.top = '90%'
        rocketRef.current.style.transform = 'translate(-40%, -55%) rotate(-28deg)'
        rocketRef.current.style.opacity = '1'
      }
      return
    }

    // crashed
    setShowCurve(true)
    const smooth = Math.max(1, displayMult ?? mult)
    applyFrame(Math.max(0, elapsedSec), smooth, mult, false)
    setLiveDiscrete(mult)
    if (rocketRef.current) rocketRef.current.style.opacity = '0'
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [serverPhase, mult, displayMult, elapsedSec, flightStartPerf])

  const cashOutAmt = Math.round(betAmount * (canUseLiveMult(serverPhase, playerStatus) ? liveDiscrete : mult))
  const canCashOut = serverPhase === 'flying' && playerStatus === 'active'
  const canQueueNext =
    pendingNextBet ||
    (playerStatus === 'idle' && (serverPhase === 'flying' || serverPhase === 'crashed')) ||
    (playerStatus === 'cashed' && (serverPhase === 'flying' || serverPhase === 'crashed')) ||
    (playerStatus === 'bust' && serverPhase === 'crashed')
  const canBetNow = serverPhase === 'waiting' && playerStatus === 'idle'

  const centerText =
    serverPhase === 'waiting' ? `New Round Starts in ${countdown.toFixed(2)} S` : null

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
                    {axisLabels.y.map((v) => (
                      <span key={`y-${v}`}>{v.toFixed(1)}x</span>
                    ))}
                  </div>
                  <div className={styles.graphAxisX}>
                    {axisLabels.x.map((v) => (
                      <span key={`x-${v}`}>{v < 10 ? v.toFixed(1) : Math.round(v)}</span>
                    ))}
                  </div>
                  <svg className={styles.graphCurve} preserveAspectRatio="none" viewBox={`0 0 ${CRASH_VIEW_W} ${CRASH_VIEW_H}`}>
                    <defs>
                      <linearGradient id="crashCurveFill" x1="0" x2="0" y1="0" y2="1">
                        <stop offset="0%" stopColor="#3de0ff" stopOpacity="0.45" />
                        <stop offset="100%" stopColor="#3de0ff" stopOpacity="0" />
                      </linearGradient>
                      <filter id="crashGlow" x="-20%" y="-20%" width="140%" height="140%">
                        <feGaussianBlur stdDeviation="2.2" result="b" />
                        <feMerge>
                          <feMergeNode in="b" />
                          <feMergeNode in="SourceGraphic" />
                        </feMerge>
                      </filter>
                    </defs>
                    <path
                      ref={fillPathRef}
                      d=""
                      fill="url(#crashCurveFill)"
                      style={{ visibility: showCurve ? 'visible' : 'hidden' }}
                    />
                    <path
                      ref={strokePathRef}
                      d=""
                      fill="none"
                      stroke="#5cf0ff"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth="4.5"
                      filter="url(#crashGlow)"
                      style={{ visibility: showCurve ? 'visible' : 'hidden' }}
                    />
                  </svg>
                  <div
                    ref={rocketRef}
                    className={styles.rocketPos}
                    style={{
                      left: '6%',
                      top: '90%',
                      transform: 'translate(-40%, -55%) rotate(-28deg)',
                      opacity: serverPhase === 'crashed' ? 0 : 1,
                    }}
                  >
                    <img className={styles.rocketImg} src={CRASH_ASSETS.rocket} alt="" draggable={false} />
                  </div>
                  {serverPhase === 'crashed' && (
                    <div ref={bangRef} className={styles.bangBurst} aria-hidden>
                      <span className={styles.bangCore} />
                      <span className={styles.bangSmoke} />
                      <span className={styles.bangSmoke2} />
                    </div>
                  )}
                  <div className={styles.graphCenter}>
                    {serverPhase === 'flying' && (
                      <span
                        ref={multTextRef}
                        className={`${styles.multDisplay} ${playerStatus === 'cashed' ? styles.multCashed : styles.multFlying}`}
                      >
                        {liveDiscrete.toFixed(2)}×
                      </span>
                    )}
                    {serverPhase === 'waiting' && centerText ? (
                      <span className={styles.multWaiting}>{centerText}</span>
                    ) : null}
                    {serverPhase === 'crashed' && (
                      <span ref={bangTextRef} className={styles.bangText}>
                        Bang @ {mult.toFixed(2)}x
                      </span>
                    )}
                  </div>
                </div>
                <div className={styles.frameKnob} aria-hidden />
              </div>
            </section>

            <aside className={`${styles.sideCol} ${styles.sideColRight}`}>
              <div className={styles.vent}>
                <SpeakerVentIcon />
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
              <button type="button" className={styles.betMinus} onClick={onBetMinus} disabled={canCashOut} aria-label="Decrease bet">
                −
              </button>
              <div className={styles.betDisplay}>
                <span className={styles.betLabel}>YOUR BET</span>
                <span className={styles.betValue}>{formatBet(betAmount)}</span>
              </div>
              <button type="button" className={styles.betPlus} onClick={onBetPlus} disabled={canCashOut} aria-label="Increase bet">
                +
              </button>
            </div>

            {canCashOut ? (
              <button type="button" className={`${styles.betBtn} ${styles.betBtnCashout}`} onClick={onCashOut}>
                CASH OUT {formatCompact(cashOutAmt)}
              </button>
            ) : canBetNow ? (
              <button type="button" className={styles.betBtn} onClick={onBet}>
                BET
              </button>
            ) : serverPhase === 'waiting' && playerStatus === 'active' ? (
              <button type="button" className={`${styles.betBtn} ${styles.betBtnWaiting}`} disabled>
                WAITING…
              </button>
            ) : canQueueNext || pendingNextBet ? (
              <button
                type="button"
                className={`${styles.betBtn} ${pendingNextBet ? styles.betBtnQueued : ''}`}
                onClick={onBet}
              >
                {pendingNextBet ? 'QUEUED — TAP TO CANCEL' : 'BET (Next Round)'}
              </button>
            ) : (
              <button type="button" className={`${styles.betBtn} ${styles.betBtnWaiting}`} disabled>
                FLYING
              </button>
            )}

            <div className={styles.bottomSide}>
              <span className={styles.sideLabel}>AUTO ESCAPE</span>
              <div className={styles.toggleStack}>
                <span className={styles.toggleOption}>ON</span>
                <ToggleSwitch on={autoEscape} onClick={onAutoEscapeToggle} />
                <span className={styles.toggleOption}>OFF</span>
              </div>
            </div>
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
