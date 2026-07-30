import { memo, useEffect, useMemo, useState } from 'react'
import { ArrowLeft, HelpCircle, RefreshCw, Undo2 } from 'lucide-react'
import type { WingoBetType } from '../engines/wingo'
import styles from './wingoVertical.module.css'

export type WingoMode = '30s' | '1min' | '3min' | '5min'

export type BetCounters = Record<string, { count: number; amount: number }>

export type WingoHistoryRow = {
  period: string
  number: number
  color: string
  size: string
  colors: string[]
}

export type MyBetRecord = {
  id: string
  period: string
  type: WingoBetType
  value: number | null
  amount: number
  payout: number
  state: string
  resultNumber: number | null
}

export type WingoServerResult = {
  number: number
  color: string
  size: string
  colors: string[]
  period: string
}

const MODES: { id: WingoMode; label: string; title: string }[] = [
  { id: '30s', label: '30s', title: 'Win Go 30s' },
  { id: '1min', label: '1Min', title: 'Win Go 1Min' },
  { id: '3min', label: '3Min', title: 'Win Go 3Min' },
  { id: '5min', label: '5Min', title: 'Win Go 5Min' },
]

const CHIP_META = [
  { value: 1, cls: styles.chip1, label: '1' },
  { value: 10, cls: styles.chip10, label: '10' },
  { value: 100, cls: styles.chip100, label: '100' },
  { value: 500, cls: styles.chip500, label: '500' },
  { value: 1000, cls: styles.chip1000, label: '1K' },
] as const

function formatTime(ms: number) {
  const s = Math.max(0, Math.ceil(ms / 1000))
  const m = Math.floor(s / 60)
  const r = s % 60
  return `${String(m).padStart(2, '0')}:${String(r).padStart(2, '0')}`
}

function betKey(type: WingoBetType, value?: number) {
  return type === 'number' ? `n-${value}` : type
}

function ballClass(n: number) {
  if (n === 0) return styles.ball0
  if (n === 5) return styles.ball5
  if ([1, 3, 7, 9].includes(n)) return styles.ballGreen
  return styles.ballRed
}

function colorBarClass(colors: string[]) {
  if (colors.includes('violet') && colors.includes('red')) return styles.barRedViolet
  if (colors.includes('violet') && colors.includes('green')) return styles.barGreenViolet
  if (colors[0] === 'green') return styles.barGreen
  if (colors[0] === 'violet') return styles.barViolet
  return styles.barRed
}

function FlipClock({ time, urgent }: { time: string; urgent: boolean }) {
  return (
    <div className={`${styles.flipClock} ${urgent ? styles.flipUrgent : ''}`}>
      {[...time].map((ch, i) =>
        ch === ':' ? (
          <span key={`s-${i}`} className={styles.flipSep}>
            :
          </span>
        ) : (
          <span key={`${i}-${ch}`} className={styles.flipDigit}>
            {ch}
          </span>
        ),
      )}
    </div>
  )
}

/**
 * Runs off the local clock so the countdown stays smooth between the sparse
 * server pushes, and keeps its re-renders out of the betting grid.
 */
const Countdown = memo(function Countdown({
  deadline,
  locked,
}: {
  deadline: number
  locked: boolean
}) {
  const [now, setNow] = useState(() => Date.now())
  useEffect(() => {
    const id = window.setInterval(() => setNow(Date.now()), 200)
    return () => window.clearInterval(id)
  }, [])
  const msLeft = Math.max(0, deadline - now)
  return <FlipClock time={formatTime(msLeft)} urgent={locked || msLeft <= 5000} />
})

/** Flips only when the gate opens/closes, so taps lock instantly at 5s. */
function useBettingOpen(deadline: number, canBet: boolean, lockMs: number) {
  const [open, setOpen] = useState(() => canBet && deadline - Date.now() > lockMs)
  useEffect(() => {
    const evaluate = () => {
      const next = canBet && deadline - Date.now() > lockMs
      setOpen((prev) => (prev === next ? prev : next))
    }
    evaluate()
    const id = window.setInterval(evaluate, 200)
    return () => window.clearInterval(id)
  }, [canBet, deadline, lockMs])
  return open
}

export type WingoDesignUIProps = {
  balance: number
  betAmount: number
  chips: number[]
  mode: WingoMode
  period: string
  phase: 'betting' | 'locked' | 'reveal'
  /** Epoch ms the current countdown ends at. */
  deadline: number
  lockMs: number
  canBet: boolean
  hasBets: boolean
  counters: BetCounters
  history: WingoHistoryRow[]
  myHistory: MyBetRecord[]
  result: WingoServerResult | null
  showHelp: boolean
  onHome: () => void
  onHelp: () => void
  onCloseHelp: () => void
  onModeChange: (mode: WingoMode) => void
  onChipSelect: (v: number) => void
  onBet: (type: WingoBetType, value?: number) => void
  onRevoke: () => void
  onRefreshBalance: () => void
}

export default function WingoDesignUI({
  balance,
  betAmount,
  mode,
  period,
  phase,
  deadline,
  lockMs,
  canBet,
  hasBets,
  counters,
  history,
  myHistory,
  result,
  showHelp,
  onHome,
  onHelp,
  onCloseHelp,
  onModeChange,
  onChipSelect,
  onBet,
  onRevoke,
  onRefreshBalance,
}: WingoDesignUIProps) {
  const [tab, setTab] = useState<'game' | 'chart' | 'my'>('game')
  const bettingOpen = useBettingOpen(deadline, canBet, lockMs)
  const modeMeta = MODES.find((m) => m.id === mode) ?? MODES[0]!

  const getCounter = (type: WingoBetType, value?: number) => {
    const c = counters[betKey(type, value)]
    if (!c) return '0/0'
    return `${c.count}/${Math.round(c.amount)}`
  }

  const getNumAmount = (n: number) => {
    const c = counters[betKey('number', n)]
    return c ? String(Math.round(c.amount)) : '0'
  }

  const chartCounts = useMemo(() => {
    const counts = Array.from({ length: 10 }, () => 0)
    for (const h of history) counts[h.number] = (counts[h.number] ?? 0) + 1
    return counts
  }, [history])

  return (
    <div className={styles.root}>
      <div className={styles.headerBg} aria-hidden />
      <div className={styles.scroll}>
        <div className={styles.page}>
          <header className={styles.header}>
            <button type="button" className={styles.iconBtn} onClick={onHome} aria-label="Back">
              <ArrowLeft size={18} strokeWidth={2.5} />
            </button>
            <div className={styles.logoWrap} aria-label="WinGo">
              <span className={styles.logo}>WinGo</span>
            </div>
            <button type="button" className={styles.iconBtn} onClick={onHelp} aria-label="Help">
              <HelpCircle size={18} strokeWidth={2.5} />
            </button>
          </header>

          <div className={styles.modeTabs}>
            {MODES.map((m) => (
              <button
                key={m.id}
                type="button"
                className={`${styles.modeTab} ${mode === m.id ? styles.modeTabOn : ''}`}
                onClick={() => onModeChange(m.id)}
              >
                <span className={styles.modeTabLabel}>{m.label}</span>
                <span className={styles.modeTabSub}>{m.title}</span>
              </button>
            ))}
          </div>

          <section className={styles.roundCard}>
            <div className={styles.roundLeft}>
              <div className={styles.roundTitle}>{modeMeta.title}</div>
              <div className={styles.period}>{period}</div>
            </div>
            <div className={styles.roundRight}>
              <div className={styles.timeLabel}>Time Remaining</div>
              <div className={styles.timerBox}>
                <Countdown deadline={deadline} locked={!bettingOpen} />
              </div>
            </div>
          </section>

          <div className={styles.notice}>
            <span className={styles.noticeIcon} aria-hidden />
            <div className={styles.noticeTrack}>
              <span>
                Please place or withdraw your bet 5 seconds before the countdown ends. No betting is
                allowed within the last 5 seconds.
              </span>
            </div>
          </div>

          <section className={`${styles.betCard} ${!bettingOpen ? styles.betCardLocked : ''}`}>
            {!bettingOpen && (
              <div className={styles.lockNote}>
                {phase === 'reveal' ? 'Drawing result…' : 'Betting closed — next round starting'}
              </div>
            )}
            <div className={styles.colorRow}>
              <button
                type="button"
                className={`${styles.colorBtn} ${styles.colorGreen}`}
                disabled={!canBet}
                onClick={() => onBet('green')}
              >
                <span className={styles.colorName}>Green</span>
                <span className={styles.colorOdds}>2x</span>
                <span className={styles.colorCount}>{getCounter('green')}</span>
              </button>
              <button
                type="button"
                className={`${styles.colorBtn} ${styles.colorViolet}`}
                disabled={!canBet}
                onClick={() => onBet('violet')}
              >
                <span className={styles.colorName}>Violet</span>
                <span className={styles.colorOdds}>4.5x</span>
                <span className={styles.colorCount}>{getCounter('violet')}</span>
              </button>
              <button
                type="button"
                className={`${styles.colorBtn} ${styles.colorRed}`}
                disabled={!canBet}
                onClick={() => onBet('red')}
              >
                <span className={styles.colorName}>Red</span>
                <span className={styles.colorOdds}>2x</span>
                <span className={styles.colorCount}>{getCounter('red')}</span>
              </button>
            </div>

            <div className={styles.numberGrid}>
              {Array.from({ length: 10 }, (_, n) => (
                <button
                  key={n}
                  type="button"
                  className={styles.numberCell}
                  disabled={!canBet}
                  onClick={() => onBet('number', n)}
                >
                  <span className={`${styles.ball} ${ballClass(n)}`}>
                    <span className={styles.ballShine} />
                    <span className={styles.ballNum}>{n}</span>
                  </span>
                  <span className={styles.numMult}>9x</span>
                  <span className={styles.numCounter}>{getNumAmount(n)}</span>
                </button>
              ))}
            </div>

            <div className={styles.sizeRow}>
              <button
                type="button"
                className={`${styles.sizeBtn} ${styles.sizeBig}`}
                disabled={!canBet}
                onClick={() => onBet('big')}
              >
                <span className={styles.sizeName}>Big</span>
                <span className={styles.sizeOdds}>2x</span>
                <span className={styles.sizeCount}>{getCounter('big')}</span>
              </button>
              <button
                type="button"
                className={`${styles.sizeBtn} ${styles.sizeSmall}`}
                disabled={!canBet}
                onClick={() => onBet('small')}
              >
                <span className={styles.sizeName}>Small</span>
                <span className={styles.sizeOdds}>2x</span>
                <span className={styles.sizeCount}>{getCounter('small')}</span>
              </button>
            </div>
          </section>

          <section className={styles.historyCard}>
            <div className={styles.histTabs}>
              {(
                [
                  ['game', 'Game History'],
                  ['chart', 'Chart'],
                  ['my', 'My History'],
                ] as const
              ).map(([id, label]) => (
                <button
                  key={id}
                  type="button"
                  className={`${styles.histTab} ${tab === id ? styles.histTabOn : ''}`}
                  onClick={() => setTab(id)}
                >
                  {label}
                </button>
              ))}
            </div>

            {tab === 'game' && (
              <div className={styles.tableWrap}>
                <div className={styles.tableHead}>
                  <span>Period</span>
                  <span>Number</span>
                  <span>Big/Small</span>
                  <span>Color</span>
                </div>
                <ul className={styles.tableBody}>
                  {history.map((h) => (
                    <li key={h.period} className={styles.tableRow}>
                      <span>{h.period.slice(-4)}</span>
                      <span>
                        <span className={`${styles.ballSm} ${ballClass(h.number)}`}>
                          <span className={styles.ballNum}>{h.number}</span>
                        </span>
                      </span>
                      <span>{h.size === 'big' ? 'Big' : 'Small'}</span>
                      <span>
                        <span className={`${styles.colorBar} ${colorBarClass(h.colors)}`} />
                      </span>
                    </li>
                  ))}
                  {!history.length && <li className={styles.empty}>Waiting for results…</li>}
                </ul>
              </div>
            )}

            {tab === 'chart' && (
              <div className={styles.chartWrap}>
                {chartCounts.map((c, n) => (
                  <div key={n} className={styles.chartCol}>
                    <div className={styles.chartBarTrack}>
                      <div
                        className={`${styles.chartBarFill} ${ballClass(n)}`}
                        style={{ height: `${Math.min(100, c * 12)}%` }}
                      />
                    </div>
                    <span className={`${styles.ballSm} ${ballClass(n)}`}>
                      <span className={styles.ballNum}>{n}</span>
                    </span>
                    <span className={styles.chartCount}>{c}</span>
                  </div>
                ))}
              </div>
            )}

            {tab === 'my' && (
              <div className={styles.tableWrap}>
                <div className={styles.tableHead}>
                  <span>Period</span>
                  <span>Bet</span>
                  <span>Result</span>
                  <span>Payout</span>
                </div>
                <ul className={styles.tableBody}>
                  {myHistory.map((h) => (
                    <li key={h.id} className={styles.tableRow}>
                      <span>{h.period.slice(-4)}</span>
                      <span>
                        {h.type === 'number' ? `#${h.value}` : h.type} · {Math.round(h.amount)}
                      </span>
                      <span>
                        {h.resultNumber != null ? (
                          <span className={`${styles.ballSm} ${ballClass(h.resultNumber)}`}>
                            <span className={styles.ballNum}>{h.resultNumber}</span>
                          </span>
                        ) : (
                          '—'
                        )}
                      </span>
                      <span className={h.payout > 0 ? styles.winText : ''}>
                        {h.payout > 0 ? `+${Math.round(h.payout)}` : '0'}
                      </span>
                    </li>
                  ))}
                  {!myHistory.length && <li className={styles.empty}>No bets yet</li>}
                </ul>
              </div>
            )}
          </section>
        </div>
      </div>

      <footer className={styles.footer}>
        <div className={styles.balanceRow}>
          <span className={styles.balanceText}>
            Balance: Rs {Math.round(balance).toLocaleString('en-PK')}
          </span>
          <button
            type="button"
            className={styles.refreshBtn}
            onClick={onRefreshBalance}
            aria-label="Refresh"
          >
            <RefreshCw size={13} strokeWidth={2.5} />
          </button>
        </div>
        <div className={styles.footerActions}>
          <button
            type="button"
            className={styles.revokeBtn}
            disabled={!canBet || !hasBets}
            onClick={onRevoke}
          >
            <Undo2 size={14} />
            <span>Revocation</span>
          </button>
          <div className={styles.chips}>
            {CHIP_META.map((c) => (
              <button
                key={c.value}
                type="button"
                className={`${styles.chip} ${c.cls} ${betAmount === c.value ? styles.chipOn : ''}`}
                onClick={() => onChipSelect(c.value)}
              >
                <span className={styles.chipRing} />
                <span className={styles.chipLabel}>{c.label}</span>
                {betAmount === c.value && <span className={styles.chipArrow} />}
              </button>
            ))}
          </div>
        </div>
      </footer>

      {phase === 'reveal' && result && (
        <div className={styles.resultOverlay} aria-live="polite">
          <div className={styles.resultCard}>
            <div className={styles.resultLabel}>Result</div>
            <div className={`${styles.resultBall} ${ballClass(result.number)}`}>
              <span className={styles.ballShine} />
              <span className={styles.ballNum}>{result.number}</span>
            </div>
            <div className={styles.resultMeta}>
              {result.size === 'big' ? 'Big' : 'Small'} · {result.colors.join(' / ')}
            </div>
          </div>
        </div>
      )}

      {showHelp && (
        <div className={styles.helpOverlay} onClick={onCloseHelp}>
          <div className={styles.helpCard} onClick={(e) => e.stopPropagation()}>
            <h2>How to play</h2>
            <p>Pick a chip, then tap Green / Violet / Red, a number 0–9, or Big / Small.</p>
            <p>Betting closes in the last 5 seconds. Use Revocation to cancel before lock.</p>
            <p>
              Payouts: Color/Size 2x (1.5x on 0/5 edge), Violet 4.5x, Number 9x. Big = 5–9, Small =
              0–4.
            </p>
            <button type="button" className={styles.helpClose} onClick={onCloseHelp}>
              Got it
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
