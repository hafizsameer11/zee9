import { useEffect, useState, type CSSProperties } from 'react'
import { getDesignCanvasStyle, getDesignScaleShellStyle, type DesignLayout } from '../hooks/useDesignScale'
import type { RefObject } from 'react'
import { ArrowLeft, HelpCircle, LayoutGrid, RefreshCw } from 'lucide-react'
import type { WingoBet, WingoBetType, WingoResult } from '../engines/wingo'
import { numberToDisplayColors } from '../engines/wingo'
import { WingoBall, ballColorForNumber } from './wingoGfx'
import styles from './wingoClassic.module.css'

const CHIPS = [
  { value: 1, cls: styles.chipGreen },
  { value: 10, cls: styles.chipOrange },
  { value: 100, cls: styles.chipBlue },
  { value: 500, cls: styles.chipPurple },
  { value: 1000, cls: styles.chipRed },
] as const

const MODES = [
  { id: '30s', label: '30s', ms: 30000 },
  { id: '1min', label: '1min', ms: 60000 },
  { id: '3min', label: '3min', ms: 180000 },
  { id: '5min', label: '5min', ms: 300000 },
] as const

export type WingoMode = (typeof MODES)[number]['id']

export type MyBetRecord = {
  id: number
  period: string
  bets: WingoBet[]
  result: WingoResult | null
  winAmount: number
}

export type BetCounters = Record<string, { count: number; amount: number }>

function formatTime(ms: number) {
  const s = Math.max(0, Math.ceil(ms / 1000))
  const m = Math.floor(s / 60)
  const r = s % 60
  return `${String(m).padStart(2, '0')}:${String(r).padStart(2, '0')}`
}

function betKey(type: WingoBetType, value?: number) {
  return type === 'number' ? `n-${value}` : type
}

function FlipDigit({ digit, urgent }: { digit: string; urgent: boolean }) {
  const [shown, setShown] = useState(digit)
  const [flip, setFlip] = useState(false)

  useEffect(() => {
    if (digit === shown) return
    setFlip(true)
    const swap = window.setTimeout(() => {
      setShown(digit)
      setFlip(false)
    }, 180)
    return () => clearTimeout(swap)
  }, [digit, shown])

  return (
    <span
      className={`${styles.flipDigit} ${flip ? styles.flipDigitFlip : ''} ${urgent ? styles.flipDigitUrgent : ''}`}
    >
      <span className={styles.flipDigitInner}>{shown}</span>
    </span>
  )
}

function FlipClock({ time, urgent }: { time: string; urgent: boolean }) {
  const chars = [...time]
  return (
    <div className={`${styles.flipClock} ${urgent ? styles.flipClockUrgent : ''}`}>
      {chars.map((d, i) =>
        d === ':' ? (
          <span key={`sep-${i}`} className={`${styles.flipSep} ${urgent ? styles.flipSepBlink : ''}`}>
            :
          </span>
        ) : (
          <FlipDigit key={`d-${i}`} digit={d} urgent={urgent} />
        ),
      )}
    </div>
  )
}

function ColorSwatches({ number }: { number: number }) {
  const colors = numberToDisplayColors(number)
  return (
    <div className={styles.colorSwatches}>
      {colors.map((c) => (
        <span
          key={c}
          className={`${styles.colorSwatch} ${
            c === 'green' ? styles.swatchGreen : c === 'red' ? styles.swatchRed : styles.swatchViolet
          }`}
        />
      ))}
    </div>
  )
}

function AmbientBg() {
  return (
    <div className={styles.ambient} aria-hidden>
      <span className={styles.orb1} />
      <span className={styles.orb2} />
      <span className={styles.orb3} />
      {Array.from({ length: 12 }, (_, i) => (
        <span key={i} className={styles.sparkle} style={{ '--i': i } as CSSProperties} />
      ))}
    </div>
  )
}

export type WingoDesignUIProps = {
  viewportRef: RefObject<HTMLDivElement | null>
  layout: DesignLayout
  rootClassName: string
  canvasClassName: string
  balance: number
  betAmount: number
  onBetAmount: (n: number) => void
  onRefreshBalance: () => void
  period: string
  timeLeft: number
  roundMs: number
  resultReveal: WingoResult | null
  lastBetKey: string | null
  mode: WingoMode
  onModeChange: (mode: WingoMode) => void
  history: WingoResult[]
  myHistory: MyBetRecord[]
  pending: (WingoBet & { id: number })[]
  counters: BetCounters
  onBet: (type: WingoBetType, value?: number) => void
  onRevoke: () => void
  canBet: boolean
  onHome: () => void
}

export default function WingoDesignUI({
  viewportRef,
  layout,
  rootClassName,
  canvasClassName,
  balance,
  betAmount,
  onBetAmount,
  onRefreshBalance,
  period,
  timeLeft,
  roundMs,
  resultReveal,
  lastBetKey,
  mode,
  onModeChange,
  history,
  myHistory,
  pending,
  counters,
  onBet,
  onRevoke,
  canBet,
  onHome,
}: WingoDesignUIProps) {
  const [tab, setTab] = useState<'history' | 'chart' | 'my'>('history')
  const [showHelp, setShowHelp] = useState(false)
  const [refreshSpin, setRefreshSpin] = useState(false)
  const modeInfo = MODES.find((m) => m.id === mode) ?? MODES[0]
  const timeStr = formatTime(timeLeft)
  const urgent = timeLeft <= 5000
  const progress = Math.max(0, Math.min(1, timeLeft / roundMs))

  const getCounter = (type: WingoBetType, value?: number) => {
    const c = counters[betKey(type, value)]
    return c ? `${c.count}/${c.amount}` : '0/0'
  }

  const getNumCounter = (n: number) => {
    const c = counters[betKey('number', n)]
    return c ? String(c.amount) : '0'
  }

  const counterClass = (key: string) =>
    lastBetKey === key ? `${styles.colorCounter} ${styles.counterPop}` : styles.colorCounter

  const handleRefresh = () => {
    setRefreshSpin(true)
    onRefreshBalance()
    window.setTimeout(() => setRefreshSpin(false), 600)
  }

  return (
    <div className={rootClassName} ref={viewportRef}>
      <div style={getDesignScaleShellStyle(layout)}>
        <div className={canvasClassName} style={getDesignCanvasStyle(layout)}>
          <AmbientBg />

          <aside className={styles.leftBar}>
            <div className={styles.balance}>
              <span>Balance:</span>
              <span className={styles.balanceAmount}>Rs {balance.toLocaleString()}</span>
              <button
                type="button"
                className={`${styles.refreshBtn} ${refreshSpin ? styles.refreshSpin : ''}`}
                onClick={handleRefresh}
                aria-label="Refresh balance"
              >
                <RefreshCw size={10} />
              </button>
            </div>

            <div className={styles.chips}>
              {CHIPS.map((chip) => (
                <button
                  key={chip.value}
                  type="button"
                  className={`${styles.chip} ${chip.cls} ${betAmount === chip.value ? styles.chipSelected : ''}`}
                  onClick={() => onBetAmount(chip.value)}
                >
                  {chip.value >= 1000 ? '1k' : chip.value}
                </button>
              ))}
            </div>

            <button
              type="button"
              className={styles.revokeBtn}
              onClick={onRevoke}
              disabled={pending.length === 0 || !canBet}
            >
              <ArrowLeft size={10} />
              Revocation
            </button>
          </aside>

          <div className={styles.mainPanel}>
            <section className={styles.historySection}>
              <div className={styles.tabs}>
                {(['history', 'chart', 'my'] as const).map((t) => (
                  <button
                    key={t}
                    type="button"
                    className={`${styles.tab} ${tab === t ? styles.tabActive : ''}`}
                    onClick={() => setTab(t)}
                  >
                    {t === 'history' ? 'Game History' : t === 'chart' ? 'Chart' : 'My History'}
                  </button>
                ))}
              </div>

              <div className={styles.historyScroll}>
                {tab === 'history' && (
                  <table className={styles.historyTable}>
                    <thead>
                      <tr>
                        <th>Period</th>
                        <th>Number</th>
                        <th>Big/Small</th>
                        <th>Color</th>
                      </tr>
                    </thead>
                    <tbody>
                      {history.map((h, idx) => (
                        <tr
                          key={h.period}
                          className={idx === 0 ? styles.historyRowNew : undefined}
                          style={{ animationDelay: `${idx * 30}ms` }}
                        >
                          <td className={styles.periodCell}>{h.period}</td>
                          <td>
                            <WingoBall
                              number={h.number}
                              color={ballColorForNumber(h.number)}
                              size="compact"
                              className={`${styles.chartBall} ${idx === 0 ? styles.ballGlow : ''}`}
                            />
                          </td>
                          <td className={styles.sizeCell}>{h.size === 'big' ? 'Big' : 'Small'}</td>
                          <td>
                            <ColorSwatches number={h.number} />
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}

                {tab === 'chart' && (
                  <div className={styles.chartGrid}>
                    {history.map((h, idx) => (
                      <WingoBall
                        key={h.period}
                        number={h.number}
                        color={ballColorForNumber(h.number)}
                        size="compact"
                        className={`${styles.chartBall} ${styles.chartBallPop}`}
                        style={{ animationDelay: `${idx * 40}ms` } as CSSProperties}
                      />
                    ))}
                    {history.length === 0 && <p className={styles.emptyHistory}>No results yet</p>}
                  </div>
                )}

                {tab === 'my' && (
                  <>
                    {myHistory.length === 0 && <p className={styles.emptyHistory}>No bets yet</p>}
                    {myHistory.map((r) => (
                      <div key={r.id} className={styles.myHistoryItem}>
                        <span>
                          {r.period.slice(-8)} · {r.bets.length} bet{r.bets.length !== 1 ? 's' : ''}
                        </span>
                        {r.result ? (
                          <span className={r.winAmount > 0 ? styles.myHistoryWin : styles.myHistoryLoss}>
                            {r.winAmount > 0 ? `+Rs ${r.winAmount}` : 'Lost'}
                          </span>
                        ) : (
                          <span>Pending</span>
                        )}
                      </div>
                    ))}
                  </>
                )}
              </div>
            </section>

            <section className={`${styles.bettingSection} ${!canBet ? styles.bettingLocked : ''}`}>
              {!canBet && (
                <div className={styles.lockBanner}>
                  <span className={styles.lockPulse} />
                  Bets locked — drawing soon
                </div>
              )}

              <div className={styles.colorRow}>
                <button
                  type="button"
                  className={`${styles.colorBtn} ${styles.colorBtnGreen}`}
                  disabled={!canBet}
                  onClick={() => onBet('green')}
                >
                  Green
                  <span className={styles.colorMult}>2x</span>
                  <span className={counterClass('green')}>{getCounter('green')}</span>
                </button>
                <button
                  type="button"
                  className={`${styles.colorBtn} ${styles.colorBtnViolet}`}
                  disabled={!canBet}
                  onClick={() => onBet('violet')}
                >
                  Violet
                  <span className={styles.colorMult}>4.5x</span>
                  <span className={counterClass('violet')}>{getCounter('violet')}</span>
                </button>
                <button
                  type="button"
                  className={`${styles.colorBtn} ${styles.colorBtnRed}`}
                  disabled={!canBet}
                  onClick={() => onBet('red')}
                >
                  Red
                  <span className={styles.colorMult}>2x</span>
                  <span className={counterClass('red')}>{getCounter('red')}</span>
                </button>
              </div>

              <div className={styles.betGridRow}>
                <button
                  type="button"
                  className={`${styles.sizeBtn} ${styles.sizeBtnBig}`}
                  disabled={!canBet}
                  onClick={() => onBet('big')}
                >
                  Big
                  <span className={styles.colorMult}>2x</span>
                  <span className={counterClass('big')}>{getCounter('big')}</span>
                </button>

                <div className={styles.numberGrid}>
                  {Array.from({ length: 10 }, (_, n) => (
                    <button
                      key={n}
                      type="button"
                      className={`${styles.numberBtn} ${lastBetKey === betKey('number', n) ? styles.numberBtnPop : ''}`}
                      disabled={!canBet}
                      onClick={() => onBet('number', n)}
                    >
                      <WingoBall number={n} color={ballColorForNumber(n)} size="bet" />
                      <span className={styles.numberMult}>9x</span>
                      <span className={counterClass(betKey('number', n))}>{getNumCounter(n)}</span>
                    </button>
                  ))}
                </div>

                <button
                  type="button"
                  className={`${styles.sizeBtn} ${styles.sizeBtnSmall}`}
                  disabled={!canBet}
                  onClick={() => onBet('small')}
                >
                  Small
                  <span className={styles.colorMult}>2x</span>
                  <span className={counterClass('small')}>{getCounter('small')}</span>
                </button>
              </div>
            </section>

            <section className={styles.timerSection}>
              <div className={styles.timerHeader}>
                <span className={styles.logo}>
                  <span className={styles.logoText}>Win Go</span>
                </span>
                <button type="button" className={styles.headerIcon} onClick={() => setShowHelp(true)} aria-label="Help">
                  <HelpCircle size={12} />
                </button>
                <button type="button" className={styles.headerIcon} onClick={onHome} aria-label="Menu">
                  <LayoutGrid size={12} />
                </button>
              </div>

              <div className={styles.modeTabs}>
                {MODES.map((m) => (
                  <button
                    key={m.id}
                    type="button"
                    className={`${styles.modeTab} ${mode === m.id ? styles.modeTabActive : ''}`}
                    onClick={() => onModeChange(m.id)}
                  >
                    {m.label}
                  </button>
                ))}
              </div>

              <div className={`${styles.periodBox} ${urgent ? styles.periodBoxUrgent : ''}`}>
                <div className={styles.periodLabel}>Win Go {modeInfo.label}</div>
                <div className={styles.periodId}>{period}</div>
              </div>

              <div className={styles.timerBlock}>
                <div className={styles.timerLabel}>Time Remaining</div>
                <div className={styles.timerRingWrap}>
                  <svg className={styles.timerRing} viewBox="0 0 36 36" aria-hidden>
                    <circle className={styles.timerRingBg} cx="18" cy="18" r="15.5" />
                    <circle
                      className={`${styles.timerRingFill} ${urgent ? styles.timerRingUrgent : ''}`}
                      cx="18"
                      cy="18"
                      r="15.5"
                      style={{ strokeDashoffset: `${97.4 * (1 - progress)}` }}
                    />
                  </svg>
                  <FlipClock time={timeStr} urgent={urgent} />
                </div>
                <div className={styles.progressTrack}>
                  <div
                    className={`${styles.progressFill} ${urgent ? styles.progressUrgent : ''}`}
                    style={{ width: `${progress * 100}%` }}
                  />
                </div>
              </div>

              <div className={styles.marqueeWrap}>
                <div className={styles.marquee}>
                  <span>
                    ...the countdown ends. No betting is allowed within the last 5 seconds. · Good luck! · Pick your
                    color, number, or size ·
                  </span>
                  <span aria-hidden>
                    ...the countdown ends. No betting is allowed within the last 5 seconds. · Good luck! · Pick your
                    color, number, or size ·
                  </span>
                </div>
              </div>
            </section>
          </div>

          {resultReveal && (
            <div className={styles.resultOverlay} key={resultReveal.period}>
              <div className={styles.resultBurst} aria-hidden />
              <div className={styles.resultCard}>
                <span className={styles.resultLabel}>Winning Number</span>
                <WingoBall
                  number={resultReveal.number}
                  color={ballColorForNumber(resultReveal.number)}
                  size="bet"
                  className={styles.resultBall}
                />
                <span className={styles.resultMeta}>
                  {resultReveal.color.toUpperCase()} · {resultReveal.size.toUpperCase()}
                </span>
              </div>
            </div>
          )}

          {showHelp && (
            <div className={styles.helpOverlay} onClick={() => setShowHelp(false)}>
              <div className={styles.helpModal} onClick={(e) => e.stopPropagation()}>
                <h3>How to Play Win Go</h3>
                <p>
                  Select a chip amount, then tap a bet option. Green/Red pay 2×, Violet pays 4.5×, exact number pays 9×,
                  Big (5–9) and Small (0–4) pay 2×. Bets lock in the last 5 seconds. Use Revocation to undo your last
                  bet.
                </p>
                <button type="button" className={styles.helpClose} onClick={() => setShowHelp(false)}>
                  Got it
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
