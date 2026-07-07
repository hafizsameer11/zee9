import { useCallback, useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useWallet } from '../../context/WalletContext'
import {
  GRID_SIZE,
  createMinesRound,
  minesMultiplier,
  revealTile,
  type MinesRound,
} from '../engines/mines'
import type { GameComponentProps } from '../types'
import { getDesignCanvasStyle, useDesignScale } from '../hooks/useDesignScale'
import { BombArt, FlameArt, GemArt, HiddenMarkArt, SparkArt } from './minesGfx'
import styles from './minesGame.module.css'

const QUICK_STAKES = [50, 100, 500, 1000, 5000]
const MINE_MARKS = [1, 3, 5, 10, 15, 24]

const LEADERBOARD = [
  { name: 'Bilal****92', bet: 5000, mult: 8.4, win: 42000, avatar: 'BI', rank: 1 },
  { name: 'Ayesha***', bet: 2500, mult: 6.1, win: 15250, avatar: 'AY', rank: 2 },
  { name: 'Hamza**7', bet: 1000, mult: 9.8, win: 9800, avatar: 'HA', rank: 3 },
  { name: 'Usman**1', bet: 800, mult: 4.2, win: 3360, avatar: 'US', rank: 0 },
  { name: 'Sana***k', bet: 500, mult: 5.5, win: 2750, avatar: 'SA', rank: 0 },
  { name: 'Faraz**9', bet: 300, mult: 3.0, win: 900, avatar: 'FA', rank: 0 },
  { name: 'Zain**m', bet: 1200, mult: 0, win: -1200, avatar: 'ZA', rank: 0 },
  { name: 'Rida**k', bet: 600, mult: 2.8, win: 1680, avatar: 'RI', rank: 0 },
]

const TICKER = [
  { name: 'Kamran**3', mult: 7.2, stake: 3600, profit: 25920, gem: true },
  { name: 'Nida**k', mult: 3.1, stake: 1000, profit: 3100, gem: false },
  { name: 'Ali***9', mult: 12.5, stake: 500, profit: 6250, gem: true },
  { name: 'Saad**2', mult: 2.0, stake: 2000, profit: 4000, gem: false },
]

function formatPkr(n: number) {
  return n.toLocaleString('en-PK', { minimumFractionDigits: 0, maximumFractionDigits: 2 })
}

export default function MinesGame({ bet: defaultBet, onMessage }: GameComponentProps) {
  const navigate = useNavigate()
  const viewportRef = useRef<HTMLDivElement>(null)
  const layout = useDesignScale(viewportRef)
  const { balance, debit, credit, canAfford } = useWallet()

  const [betAmount, setBetAmount] = useState(defaultBet)
  const [mineCount, setMineCount] = useState(5)
  const [autoEnabled, setAutoEnabled] = useState(false)
  const [autoAt, setAutoAt] = useState(2)
  const [round, setRound] = useState<MinesRound | null>(null)

  const playing = round?.active === true
  const ended = round != null && !round.active
  const showAll = ended

  const mult = round ? minesMultiplier(round.revealed.size, round.mineCount) : 1
  const gemsFound = round?.revealed.size ?? 0
  const safeTotal = GRID_SIZE - mineCount
  const nextMult = playing ? minesMultiplier(gemsFound + 1, mineCount) : 1
  const potentialWin = Math.round(betAmount * mult * 100) / 100
  const sliderPct = ((mineCount - 1) / 23) * 100

  const startRound = useCallback(() => {
    if (betAmount <= 0) {
      onMessage?.('Set a bet amount first')
      return
    }
    if (!canAfford(betAmount)) {
      onMessage?.('Insufficient balance')
      return
    }
    if (!debit(betAmount)) {
      onMessage?.('Could not place bet')
      return
    }
    setRound(createMinesRound(mineCount, betAmount))
    onMessage?.(null)
  }, [betAmount, canAfford, debit, mineCount, onMessage])

  const cashOut = useCallback(() => {
    if (!round?.active || round.revealed.size === 0) return
    const win = Math.round(betAmount * mult * 100) / 100
    credit(win)
    onMessage?.(`🎉 Won ${formatPkr(win)} PKR`)
    setRound({ ...round, active: false })
  }, [betAmount, credit, mult, onMessage, round])

  const reset = useCallback(() => {
    setRound(null)
    onMessage?.(null)
  }, [onMessage])

  const handleCell = (index: number) => {
    if (!round?.active) return
    const { hit, round: next } = revealTile(round, index)
    setRound(next)
    if (hit) {
      onMessage?.('💥 Boom!')
    }
  }

  useEffect(() => {
    if (!playing || !autoEnabled || gemsFound === 0) return
    if (mult >= autoAt) cashOut()
  }, [autoAt, autoEnabled, cashOut, gemsFound, mult, playing])

  const cellClass = (index: number) => {
    const revealed = round?.revealed.has(index)
    const isMine = round?.mines.has(index)

    if (showAll && !revealed) return isMine ? styles.cellMineDim : styles.cellGemDim
    if (revealed && isMine) return styles.cellMine
    if (revealed) return styles.cellGem
    if (playing) return `${styles.cellHidden} ${styles.cellPlay}`
    return styles.cellHidden
  }

  const hitMine =
    ended && round != null && Array.from(round.revealed).some((i) => round.mines.has(i))
  const multLabel = hitMine ? 'BOOM' : playing ? 'RISING' : ended ? 'DONE' : 'READY'

  return (
    <div className={styles.root} ref={viewportRef}>
      <div
        className={styles.canvas}
        style={getDesignCanvasStyle(layout)}
      >
        <div className={styles.ambientGlow} />
        <div className={`${styles.particle} ${styles.particleA}`} />
        <div className={`${styles.particle} ${styles.particleB}`} />
        <div className={`${styles.particle} ${styles.particleC}`} />

        <header className={styles.header}>
          <button type="button" className={styles.logoBlock} onClick={() => navigate('/home')}>
            <span className={styles.logoIcon}>
              <PickaxeIcon />
              <span className={styles.logoGem}>
                <GemIcon />
              </span>
            </span>
            <span className={styles.logoTitle}>
              <span className={styles.logoBrand}>Zee9</span>
              <span className={styles.logoSub}>MINES</span>
            </span>
          </button>

          <div className={styles.headerRight}>
            <div className={styles.balancePill}>
              <span className={styles.balanceCoin}>
                <CoinIcon />
              </span>
              <span className={styles.balanceMeta}>
                <span className={styles.balanceLabel}>Balance</span>
                <span className={styles.balanceValue}>PKR {formatPkr(balance)}</span>
              </span>
            </div>
            <button type="button" className={styles.iconBtn} aria-label="History">
              <HistoryIcon />
            </button>
            <button type="button" className={styles.iconBtn} aria-label="Settings">
              <SettingsIcon />
            </button>
          </div>
        </header>

        <main className={styles.main}>
          <aside className={styles.betPanel}>
            <div className={styles.betScroll}>
              <h2 className={styles.panelTitle}>
                <WalletIcon /> Place Your Bet
              </h2>

              <div>
                <span className={styles.fieldLabel}>Bet Amount</span>
                <div className={styles.betInputWrap}>
                  <span className={styles.betPrefix}>PKR</span>
                  <input
                    type="number"
                    min={10}
                    step={10}
                    className={styles.betInput}
                    value={betAmount}
                    disabled={playing}
                    onChange={(e) => setBetAmount(Math.max(10, Number(e.target.value) || 10))}
                  />
                  <div className={styles.betHalfBtns}>
                    <button
                      type="button"
                      className={styles.betHalfBtn}
                      disabled={playing}
                      onClick={() => setBetAmount((b) => Math.max(10, Math.round(b / 2)))}
                    >
                      ½
                    </button>
                    <button
                      type="button"
                      className={styles.betHalfBtn}
                      disabled={playing}
                      onClick={() => setBetAmount((b) => b * 2)}
                    >
                      2×
                    </button>
                  </div>
                </div>
              </div>

              <div className={styles.quickRow}>
                {QUICK_STAKES.map((n) => (
                  <button
                    key={n}
                    type="button"
                    className={`${styles.quickBtn} ${betAmount === n ? styles.quickBtnActive : ''}`}
                    disabled={playing}
                    onClick={() => setBetAmount(n)}
                  >
                    {n >= 1000 ? `${n / 1000}K` : n}
                  </button>
                ))}
              </div>

              <div className={styles.divider} />

              <div>
                <div className={styles.minesSliderHead}>
                  <span className={styles.minesSliderLabel}>
                    <BombIcon /> Mines Count
                  </span>
                  <span className={styles.minesCountBadge}>{mineCount}</span>
                </div>
                <div className={styles.sliderTrack}>
                  <div className={styles.sliderFill} style={{ width: `${sliderPct}%` }} />
                  <div className={styles.sliderThumb} style={{ left: `${sliderPct}%` }} />
                  <input
                    type="range"
                    min={1}
                    max={24}
                    value={mineCount}
                    disabled={playing}
                    className={styles.sliderInput}
                    onChange={(e) => setMineCount(Number(e.target.value))}
                  />
                </div>
                <div className={styles.sliderMarks}>
                  {MINE_MARKS.map((n) => (
                    <button
                      key={n}
                      type="button"
                      className={`${styles.sliderMark} ${mineCount === n ? styles.sliderMarkActive : ''}`}
                      disabled={playing}
                      onClick={() => setMineCount(n)}
                    >
                      {n}
                    </button>
                  ))}
                </div>
              </div>

              <div className={styles.autoRow}>
                <div className={styles.autoMeta}>
                  <ZapIcon />
                  <div>
                    <div className={styles.autoTitle}>Auto Cashout</div>
                    <div className={styles.autoSub}>
                      Target {autoEnabled ? '' : `${autoAt.toFixed(2)}×`}
                    </div>
                  </div>
                </div>
                {autoEnabled && (
                  <input
                    type="number"
                    min={1.1}
                    step={0.1}
                    className={styles.autoAtInput}
                    value={autoAt}
                    disabled={playing}
                    onChange={(e) => setAutoAt(Math.max(1.1, Number(e.target.value) || 2))}
                    aria-label="Auto cashout multiplier"
                  />
                )}
                <button
                  type="button"
                  role="switch"
                  aria-checked={autoEnabled}
                  className={`${styles.switch} ${autoEnabled ? styles.switchOn : ''}`}
                  disabled={playing}
                  onClick={() => setAutoEnabled((v) => !v)}
                >
                  <span className={styles.switchKnob} />
                </button>
              </div>

              <div className={styles.summaryCard}>
                <div className={styles.summaryRow}>
                  <span>Stake</span>
                  <span>PKR {formatPkr(betAmount)}</span>
                </div>
                <div className={styles.summaryRow}>
                  <span>Gems Found</span>
                  <span className={styles.summaryGreen}>
                    {gemsFound} / {safeTotal}
                  </span>
                </div>
                <div className={styles.summaryRow}>
                  <span>Multiplier</span>
                  <span className={styles.summaryGold}>{mult.toFixed(2)}×</span>
                </div>
                <div className={styles.summaryDivider} />
                <div className={styles.summaryRow}>
                  <span>Potential Win</span>
                  <span className={styles.summaryWin}>PKR {formatPkr(potentialWin)}</span>
                </div>
              </div>
            </div>

            <div className={styles.actionCol}>
              {playing && (
                <button
                  type="button"
                  className={styles.cashoutBtn}
                  disabled={gemsFound === 0}
                  onClick={cashOut}
                >
                  <HandCoinsIcon />
                  CASH OUT · PKR {formatPkr(potentialWin)}
                </button>
              )}
              {!playing && !ended && (
                <button type="button" className={styles.startBtn} onClick={startRound}>
                  <PlayIcon />
                  START GAME
                </button>
              )}
              {ended && (
                <button type="button" className={styles.startBtn} onClick={reset}>
                  <PlayIcon />
                  PLAY AGAIN
                </button>
              )}
            </div>
          </aside>

          <section className={styles.arenaPanel}>
            <div className={styles.arenaGlow} />
            <div className={styles.arenaTopBar}>
              <div className={styles.arenaHead}>
                <h1 className={styles.arenaTitle}>MINES</h1>
                <p className={styles.arenaSub}>Find the gems, avoid the mines</p>
              </div>
              <div className={styles.multBlock}>
                <div className={styles.multGlow} />
                <span className={`${styles.multValue} ${playing ? styles.multValueLive : ''}`}>
                  {mult.toFixed(2)}×
                </span>
                <span
                  className={`${styles.multSub} ${multLabel === 'BOOM' ? styles.multSubLose : ''}`}
                >
                  {multLabel}
                </span>
              </div>
            </div>

            <div className={styles.gridStage}>
              <div className={styles.gridWrap}>
              {Array.from({ length: GRID_SIZE }, (_, i) => {
                const revealed = round?.revealed.has(i)
                const isMine = round?.mines.has(i)
                const isHidden = !revealed && !(showAll && !revealed)

                return (
                  <button
                    key={i}
                    type="button"
                    className={`${styles.cell} ${cellClass(i)}`}
                    onClick={() => handleCell(i)}
                    disabled={!playing || revealed || showAll}
                  >
                    {revealed && isMine && (
                      <>
                        <BombArt className={styles.cellArt} />
                        <FlameArt className={styles.cellMineFlame} />
                      </>
                    )}
                    {revealed && !isMine && (
                      <>
                        <GemArt className={styles.cellArt} />
                        <SparkArt className={styles.cellGemSpark} />
                      </>
                    )}
                    {showAll && !revealed && isMine && <BombArt className={styles.cellArt} />}
                    {showAll && !revealed && !isMine && <GemArt className={styles.cellArt} />}
                    {isHidden && playing && <HiddenMarkArt className={styles.cellHiddenMark} />}
                  </button>
                )
              })}
              </div>
            </div>

            <div className={styles.statsRow}>
              <div className={`${styles.statChip} ${styles.statGem}`}>
                <GemIcon />
                Gems: <span className={styles.summaryGreen}>{gemsFound}/{safeTotal}</span>
              </div>
              <div className={`${styles.statChip} ${styles.statMine}`}>
                <BombIcon />
                Mines: <span>{mineCount}</span>
              </div>
              <div className={`${styles.statChip} ${styles.statNext}`}>
                <TrendIcon />
                Next: <span className={styles.summaryGold}>{nextMult.toFixed(2)}×</span>
              </div>
            </div>
          </section>

          <aside className={styles.leaderPanel}>
            <div className={styles.leaderHead}>
              <div className={styles.leaderTitleWrap}>
                <span className={styles.leaderIcon}>
                  <TrophyIcon />
                </span>
                <h2 className={styles.panelTitle}>Top Wins</h2>
              </div>
              <span className={styles.liveBadge}>
                <span className={styles.liveDot} /> LIVE
              </span>
            </div>
            <div className={styles.leaderScroll}>
              <div className={styles.leaderList}>
              {LEADERBOARD.map((row, idx) => (
                <div
                  key={row.name}
                  className={`${styles.leaderRow} ${idx === 0 ? styles.leaderRowTop : ''}`}
                >
                  <span
                    className={`${styles.leaderAvatar} ${row.rank === 1 ? styles.leaderAvatarGold : ''}`}
                  >
                    {row.avatar}
                    {row.rank === 1 && (
                      <span className={styles.rankBadge}>
                        <CrownIcon />
                      </span>
                    )}
                    {row.rank === 2 && <span className={`${styles.rankBadge} ${styles.rankBadgeSilver}`}>2</span>}
                    {row.rank === 3 && <span className={`${styles.rankBadge} ${styles.rankBadgeBronze}`}>3</span>}
                  </span>
                  <div className={styles.leaderMeta}>
                    <div className={styles.leaderName}>{row.name}</div>
                    <div className={styles.leaderBet}>
                      PKR {formatPkr(row.bet)} · {row.mult > 0 ? `${row.mult}×` : '0.0×'}
                    </div>
                  </div>
                  <span className={row.win >= 0 ? styles.leaderWin : styles.leaderLose}>
                    {row.win >= 0 ? '+' : ''}
                    {formatPkr(row.win)}
                  </span>
                </div>
              ))}
              </div>
            </div>
          </aside>
        </main>

        <footer className={styles.footer}>
          <div className={styles.tickerWrap}>
            <span className={styles.tickerLabel}>
              <RadioIcon /> LIVE WINS
            </span>
            <div className={styles.tickerCards}>
              {TICKER.map((t) => (
                <div
                  key={t.name}
                  className={`${styles.tickerCard} ${t.gem ? '' : styles.tickerCardGold}`}
                >
                  {t.gem ? <GemIcon /> : <CoinIcon />}
                  <div className={styles.tickerMeta}>
                    <span className={styles.tickerName}>{t.name}</span>
                    <span className={styles.tickerDetail}>
                      {t.mult}× · PKR {formatPkr(t.stake)}
                    </span>
                  </div>
                  <span className={styles.tickerProfit}>+{formatPkr(t.profit)}</span>
                </div>
              ))}
            </div>
          </div>
          <div className={styles.chatCol}>
            <div className={styles.chatBubbles}>
              <div className={styles.chatLine}>
                <span className={styles.chatUserGold}>Hamza:</span>
                <span className={styles.chatText}>gg nice cashout 🔥</span>
              </div>
              <div className={styles.chatLine}>
                <span className={styles.chatUserGreen}>Ayesha:</span>
                <span className={styles.chatText}>5 mines is brave</span>
              </div>
              <div className={styles.chatLine}>
                <span className={styles.chatUserRed}>Zain:</span>
                <span className={styles.chatText}>hit a mine 😭</span>
              </div>
            </div>
            <div className={styles.chatInputWrap}>
              <input type="text" className={styles.chatInput} placeholder="Message..." readOnly />
              <button type="button" className={styles.sendBtn} aria-label="Send">
                <SendIcon />
              </button>
            </div>
          </div>
        </footer>
      </div>
    </div>
  )
}

function PickaxeIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
      <path d="M14 14.76V3.5a2.5 2.5 0 0 0-5 0v11.26" />
      <path d="m2 21 5-5" />
      <path d="M12 11H2" />
    </svg>
  )
}

function GemIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden>
      <path d="M12 2L22 9v6l-10 7L2 15V9l10-7zm0 2.5L4 10v4.2l8 5.6 8-5.6V10l-8-5.5z" />
    </svg>
  )
}

function CrownIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
      <path d="M11.562 3.266a.5.5 0 0 1 .876 0L15.39 8.87a1 1 0 0 0 1.516.294L21 7l-2 13H5L3 7l4.094 2.164a1 1 0 0 0 1.516-.294z" />
    </svg>
  )
}

function CoinIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
      <circle cx="12" cy="12" r="8" />
      <path d="M12 6v12M9 9h4.5a1.5 1.5 0 0 1 0 3H9h4.5a1.5 1.5 0 0 1 0 3H9" />
    </svg>
  )
}

function WalletIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
      <path d="M19 7V4a1 1 0 0 0-1-1H5a2 2 0 0 0 0 4h15a1 1 0 0 1 1 1v4h-3a2 2 0 0 0 0 4h3a1 1 0 0 0 1-1v-2a1 1 0 0 0-1-1" />
      <path d="M3 5v14a2 2 0 0 0 2 2h15a1 1 0 0 0 1-1v-4" />
    </svg>
  )
}

function BombIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden>
      <circle cx="12" cy="14" r="7" />
      <path stroke="currentColor" strokeWidth="2" fill="none" d="M12 3v4M8 5l2 2M16 5l-2 2" />
    </svg>
  )
}

function ZapIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden>
      <path d="M13 2 3 14h9l-1 8 10-12h-9l1-8z" />
    </svg>
  )
}

function HandCoinsIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
      <path d="M11 15h2a2 2 0 1 0 0-4h-3c-.6 0-1.1-.2-1.4-.6L3 9" />
      <path d="m7 21 1.6-1.4c.3-.4.8-.6 1.4-.6h4c1.1 0 2.1-.4 2.8-1.2l4.6-4.4a2 2 0 0 0-2.75-2.91l-4.2 3.9" />
      <path d="m2 16 6 6" />
      <circle cx="16" cy="9" r="2.9" />
      <circle cx="6" cy="5" r="3" />
    </svg>
  )
}

function PlayIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden>
      <path d="M8 5v14l11-7z" />
    </svg>
  )
}

function TrendIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
      <polyline points="22 7 13.5 15.5 8.5 10.5 2 17" />
      <polyline points="16 7 22 7 22 13" />
    </svg>
  )
}

function TrophyIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
      <path d="M6 9H4.5a2.5 2.5 0 0 1 0-5H6M18 9h1.5a2.5 2.5 0 0 0 0-5H18" />
      <path d="M4 22h16" />
      <path d="M10 14.66V17c0 .55-.47.98-.97 1.21C7.85 18.75 7 20 7 22" />
      <path d="M14 14.66V17c0 .55.47.98.97 1.21C16.15 18.75 17 20 17 22" />
      <path d="M18 2H6v7a6 6 0 0 0 12 0V2Z" />
    </svg>
  )
}

function HistoryIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
      <path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8" />
      <path d="M3 3v5h5" />
      <path d="M12 7v5l4 2" />
    </svg>
  )
}

function SettingsIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
      <path d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1-1-1.74v-.5a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z" />
      <circle cx="12" cy="12" r="3" />
    </svg>
  )
}

function RadioIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
      <path d="M4.9 19.1C1 15.2 1 8.8 4.9 4.9" />
      <path d="M7.8 16.2c-2.3-2.3-2.3-6.1 0-8.5" />
      <circle cx="12" cy="12" r="2" />
      <path d="M16.2 7.8c2.3 2.3 2.3 6.1 0 8.5" />
      <path d="M19.1 4.9C23 8.8 23 15.1 19.1 19" />
    </svg>
  )
}

function SendIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
      <path d="m22 2-7 20-4-9-9-4Z" />
      <path d="M22 2 11 13" />
    </svg>
  )
}
