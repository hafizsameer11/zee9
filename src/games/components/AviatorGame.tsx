import { useCallback, useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useWallet } from '../../context/WalletContext'
import { generateCrashPoint, multiplierAtElapsed } from '../engines/crash'
import { buildAviatorCurvePaths, multiplierToProgress } from '../engines/aviatorCurve'
import { getDesignCanvasStyle, useDesignScale, LEGACY_DESIGN_W, LEGACY_DESIGN_H } from '../hooks/useDesignScale'
import type { GameComponentProps } from '../types'
import styles from './aviatorGame.module.css'

type GlobalPhase = 'idle' | 'flying' | 'crashed'
type SlotPhase = 'idle' | 'active' | 'cashed' | 'lost'

type BetSlot = {
  bet: number
  autoEnabled: boolean
  autoAt: number
  phase: SlotPhase
  wager: number
}

const LEADERBOARD = [
  { name: 'NeonKing', bet: 500, mult: 8.51, win: 4255, avatar: 'NE' },
  { name: 'LuckyX', bet: 120, mult: 3.24, win: 388, avatar: 'LX' },
  { name: 'VioletPro', bet: 75, mult: null, win: null, avatar: 'VP' },
  { name: 'StarGazer', bet: 300, mult: 1.02, win: -300, avatar: 'SG' },
  { name: 'MagnetGuru', bet: 45, mult: 2.17, win: 97, avatar: 'MG' },
  { name: 'CrimsonRun', bet: 210, mult: 5.6, win: 1176, avatar: 'CR' },
  { name: 'AzureBet', bet: 60, mult: 1.11, win: -60, avatar: 'AZ' },
  { name: 'GhostHawk', bet: 500, mult: 1.85, win: 425, avatar: 'GH' },
]

function historyChipClass(mult: number) {
  if (mult < 2) return styles.chipLow
  return styles.chipHigh
}

export default function AviatorGame({ bet: defaultBet, onMessage }: GameComponentProps) {
  const navigate = useNavigate()
  const viewportRef = useRef<HTMLDivElement>(null)
  const layout = useDesignScale(viewportRef, LEGACY_DESIGN_W, LEGACY_DESIGN_H)
  const { balance, debit, credit, canAfford } = useWallet()

  const [globalPhase, setGlobalPhase] = useState<GlobalPhase>('idle')
  const [mult, setMult] = useState(1)
  const [history, setHistory] = useState<number[]>([1.24, 1.02, 8.51, 2.17, 1.11, 14.6])
  const [slots, setSlots] = useState<BetSlot[]>([
    { bet: defaultBet, autoEnabled: false, autoAt: 2.5, phase: 'idle', wager: 0 },
    { bet: Math.min(defaultBet * 2, 500), autoEnabled: true, autoAt: 2.5, phase: 'idle', wager: 0 },
  ])

  const crashPoint = useRef(1)
  const startTime = useRef(0)
  const raf = useRef(0)
  const slotsRef = useRef(slots)
  slotsRef.current = slots

  const stopLoop = useCallback(() => {
    if (raf.current) cancelAnimationFrame(raf.current)
  }, [])

  const resetSlots = useCallback(() => {
    setSlots((s) => s.map((slot) => ({ ...slot, phase: 'idle', wager: 0 })))
    setGlobalPhase('idle')
    setMult(1)
  }, [])

  const endCrash = useCallback(() => {
    stopLoop()
    setGlobalPhase('crashed')
    setMult(crashPoint.current)
    setHistory((h) => [crashPoint.current, ...h].slice(0, 12))
    setSlots((s) => s.map((slot) => (slot.phase === 'active' ? { ...slot, phase: 'lost' } : slot)))
    onMessage?.('💥 Crashed!')
    setTimeout(resetSlots, 2200)
  }, [onMessage, resetSlots, stopLoop])

  const cashOutSlot = useCallback(
    (index: number, atMult: number) => {
      const slot = slotsRef.current[index]
      if (slot.phase !== 'active') return
      const win = Math.round(slot.wager * atMult * 100) / 100
      credit(win)
      setSlots((s) => {
        const next = [...s]
        next[index] = { ...next[index], phase: 'cashed' }
        return next
      })
      onMessage?.(`🎉 Cashed ${win} PKR`)
    },
    [credit, onMessage],
  )

  const tick = useCallback(() => {
    const elapsed = Date.now() - startTime.current
    const m = multiplierAtElapsed(elapsed)
    setMult(m)
    slotsRef.current.forEach((slot, i) => {
      if (slot.phase === 'active' && slot.autoEnabled && slot.autoAt > 0 && m >= slot.autoAt) {
        cashOutSlot(i, m)
      }
    })
    if (m >= crashPoint.current) {
      endCrash()
      return
    }
    raf.current = requestAnimationFrame(tick)
  }, [cashOutSlot, endCrash])

  const startRound = useCallback(() => {
    crashPoint.current = generateCrashPoint()
    startTime.current = Date.now()
    setMult(1)
    setGlobalPhase('flying')
    onMessage?.(null)
    raf.current = requestAnimationFrame(tick)
  }, [onMessage, tick])

  const placeBet = (index: number) => {
    if (globalPhase === 'flying' || globalPhase === 'crashed') return
    const slot = slots[index]
    if (slot.phase !== 'idle') return
    if (!canAfford(slot.bet)) {
      onMessage?.('Insufficient balance')
      return
    }
    if (!debit(slot.bet)) return
    setSlots((s) => {
      const next = [...s]
      next[index] = { ...next[index], phase: 'active', wager: slot.bet }
      return next
    })
    if (globalPhase === 'idle') startRound()
  }

  const manualCashOut = (index: number) => {
    if (globalPhase !== 'flying') return
    cashOutSlot(index, mult)
  }

  const updateSlot = (index: number, patch: Partial<BetSlot>) => {
    setSlots((s) => {
      const next = [...s]
      next[index] = { ...next[index], ...patch }
      return next
    })
  }

  useEffect(() => () => stopLoop(), [stopLoop])

  const flying = globalPhase === 'flying'
  const crashed = globalPhase === 'crashed'
  const curveProgress = multiplierToProgress(mult)
  const showProgress =
    flying || crashed ? Math.max(curveProgress, flying ? 0.035 : 0) : 0
  const curve = buildAviatorCurvePaths(showProgress)
  const showCurve = (flying || crashed) && showProgress > 0
  const elapsedSec =
    (flying || crashed) && startTime.current > 0
      ? (Date.now() - startTime.current) / 1000
      : 0
  const axisWindowStart = elapsedSec > 8 ? Math.floor(elapsedSec - 8) : 0
  const statusLabel = crashed ? 'Crashed' : flying ? 'Flying High' : 'Ready'

  return (
    <div className={styles.root} ref={viewportRef}>
      <div
        className={styles.canvas}
        style={getDesignCanvasStyle(layout)}
      >
        <div className={styles.glowTop} />
        <div className={styles.glowConic} />
        <div className={styles.glowBottom} />
        <div className={styles.stars} />

        <header className={styles.header}>
          <button type="button" className={styles.logoBtn} onClick={() => navigate('/home')}>
            <span className={styles.logoIcon}>
              <PlaneIcon />
            </span>
            <span className={styles.logoText}>AVIATOR</span>
          </button>

          <div className={styles.headerRight}>
            <div className={styles.balancePill}>
              <CoinIcon />
              <span>{balance.toLocaleString()} PKR</span>
            </div>
            <button type="button" className={styles.iconBtn} aria-label="History">
              <HistoryIcon />
            </button>
            <button type="button" className={styles.iconBtn} aria-label="Settings">
              <SettingsIcon />
            </button>
            <span className={styles.avatar}>P</span>
          </div>
        </header>

        <main className={styles.main}>
          <section className={styles.betsCol}>
            {slots.map((slot, i) => (
              <BetSlotCard
                key={i}
                index={i}
                slot={slot}
                mult={mult}
                flying={flying}
                crashed={crashed}
                onPlaceBet={() => placeBet(i)}
                onCashOut={() => manualCashOut(i)}
                onUpdate={(patch) => updateSlot(i, patch)}
              />
            ))}
          </section>

          <section className={styles.stageCol}>
            <div className={styles.historyWrap}>
              {history.slice(0, 6).map((h, idx) => (
                <span key={`${h}-${idx}`} className={`${styles.historyChip} ${historyChipClass(h)}`}>
                  {h.toFixed(2)}x
                </span>
              ))}
            </div>

            <div className={styles.arena}>
              <div className={styles.arenaGrid} />
              <div className={styles.arenaGlow} />
              <div className={styles.sparkA} />
              <div className={styles.sparkB} />
              <div className={styles.sparkC} />

              {showCurve && (
                <svg className={styles.curve} viewBox="0 0 1000 720" preserveAspectRatio="none">
                  <defs>
                    <linearGradient id="aviatorCurveStroke" x1="0" y1="1" x2="1" y2="0">
                      <stop offset="0%" stopColor="#e85d4c" />
                      <stop offset="100%" stopColor="#d4af37" />
                    </linearGradient>
                    <linearGradient id="aviatorCurveFill" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="rgba(212,175,55,0.35)" />
                      <stop offset="100%" stopColor="rgba(212,175,55,0)" />
                    </linearGradient>
                  </defs>
                  <path d={curve.fill} fill="url(#aviatorCurveFill)" />
                  <path
                    d={curve.stroke}
                    fill="none"
                    stroke="url(#aviatorCurveStroke)"
                    strokeWidth="6"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
              )}

              {flying && showCurve && (
                <div
                  className={styles.planeWrap}
                  style={{ left: `${curve.tipPercent.left}%`, top: `${curve.tipPercent.top}%` }}
                >
                  <span className={styles.planeTrail} />
                  <span className={styles.planeOrb}>
                    <PlaneIcon />
                  </span>
                </div>
              )}

              <div className={styles.multiplierBlock}>
                <span
                  className={`${styles.multiplier} ${flying ? styles.multiplierLive : ''} ${crashed ? styles.multiplierCrash : ''}`}
                >
                  {mult.toFixed(2)}x
                </span>
                <span className={styles.multiplierSub}>{statusLabel}</span>
              </div>

              <div className={styles.timeAxis}>
                {[0, 2, 4, 6, 8].map((step) => (
                  <span key={step} className={styles.timeTick}>
                    {axisWindowStart + step}s
                  </span>
                ))}
              </div>
            </div>
          </section>

          <section className={styles.leaderCol}>
            <div className={styles.leaderCard}>
              <div className={styles.leaderHead}>
                <span className={styles.leaderTitle}>
                  <TrophyIcon /> Live Leaderboard
                </span>
                <span className={styles.leaderCount}>
                  <span className={styles.liveDot} /> 2,481
                </span>
              </div>
              <div className={styles.leaderList}>
                {LEADERBOARD.map((row, idx) => (
                  <div key={row.name} className={`${styles.leaderRow} ${idx === 0 ? styles.leaderRowHighlight : ''}`}>
                    <div className={styles.leaderUser}>
                      <span className={styles.leaderAvatar}>{row.avatar}</span>
                      <div>
                        <span className={styles.leaderName}>{row.name}</span>
                        <span className={styles.leaderBet}>{row.bet} PKR</span>
                      </div>
                    </div>
                    <div className={styles.leaderResult}>
                      {row.mult == null ? (
                        <>
                          <span className={styles.leaderFlying}>Flying...</span>
                          <span className={styles.leaderDash}>--</span>
                        </>
                      ) : (
                        <>
                          <span className={row.mult >= 2 ? styles.leaderMultWin : styles.leaderMultLose}>
                            {row.mult.toFixed(2)}x
                          </span>
                          {row.win != null && (
                            <span className={row.win >= 0 ? styles.leaderWin : styles.leaderLose}>
                              {row.win >= 0 ? '+' : ''}
                              {row.win} PKR
                            </span>
                          )}
                        </>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </section>
        </main>

        <footer className={styles.footer}>
          <span className={styles.footerLabel}>
            <ChatIcon /> Live Activity
          </span>
          <div className={styles.footerTicker}>
            <span className={styles.tickerGold}>
              <PartyIcon /> CrimsonRun cashed out at <strong>5.60x</strong> for <strong>1,176 PKR</strong>
            </span>
            <span className={styles.tickerRed}>
              <SparkIcon /> NeonKing won <strong>4,255 PKR</strong> at <strong>8.51x</strong>
            </span>
            <span className={styles.tickerMuted}>
              <TrendIcon /> MagnetGuru cashed out at <strong>2.17x</strong>
            </span>
          </div>
          <div className={styles.chatBox}>
            <input type="text" placeholder="Say something..." className={styles.chatInput} readOnly />
            <button type="button" className={styles.sendBtn} aria-label="Send">
              <SendIcon />
            </button>
          </div>
        </footer>
      </div>
    </div>
  )
}

function BetSlotCard({
  index,
  slot,
  mult,
  flying,
  crashed,
  onPlaceBet,
  onCashOut,
  onUpdate,
}: {
  index: number
  slot: BetSlot
  mult: number
  flying: boolean
  crashed: boolean
  onPlaceBet: () => void
  onCashOut: () => void
  onUpdate: (patch: Partial<BetSlot>) => void
}) {
  const locked = flying || crashed
  const active = slot.phase === 'active'
  const done = slot.phase === 'cashed' || slot.phase === 'lost'
  const isSlotTwo = index === 1

  return (
    <div className={styles.betCard}>
      <div className={styles.betCardTitle}>
        <span className={isSlotTwo ? styles.slotBadgeMuted : styles.slotBadge}>{index + 1}</span>
        Bet Slot {index === 0 ? 'One' : 'Two'}
      </div>

      <div className={styles.betInputRow}>
        <input
          type="number"
          min={10}
          step={10}
          value={slot.bet}
          disabled={locked || active}
          onChange={(e) => onUpdate({ bet: Math.max(10, Number(e.target.value) || 10) })}
          className={styles.betInput}
        />
        <span className={styles.betCurrency}>PKR</span>
      </div>

      {!isSlotTwo && (
        <div className={styles.quickRow}>
          {[5, 10, 50].map((n) => (
            <button
              key={n}
              type="button"
              className={styles.quickBtn}
              disabled={locked || active}
              onClick={() => onUpdate({ bet: slot.bet + n })}
            >
              +{n}
            </button>
          ))}
          <button
            type="button"
            className={styles.quickBtn}
            disabled={locked || active}
            onClick={() => onUpdate({ bet: 500 })}
          >
            MAX
          </button>
        </div>
      )}

      <div className={styles.autoRow}>
        <span className={styles.autoLabel}>
          <ZapIcon /> Auto Cashout
        </span>
        <button
          type="button"
          role="switch"
          aria-checked={slot.autoEnabled}
          className={`${styles.switch} ${slot.autoEnabled ? styles.switchOn : ''}`}
          disabled={locked || active}
          onClick={() => onUpdate({ autoEnabled: !slot.autoEnabled })}
        />
      </div>

      {slot.autoEnabled && (
        <div className={styles.cashoutAtRow}>
          <span>Cashout at</span>
          {isSlotTwo ? (
            <span className={styles.cashoutAtValue}>{slot.autoAt.toFixed(2)}x</span>
          ) : (
            <>
              <input
                type="number"
                min={1.1}
                step={0.1}
                value={slot.autoAt}
                disabled={locked || active}
                onChange={(e) => onUpdate({ autoAt: Number(e.target.value) || 2 })}
                className={styles.cashoutAtInput}
              />
              <span>x</span>
            </>
          )}
        </div>
      )}

      {active && flying ? (
        <button type="button" className={styles.cashoutBtn} onClick={onCashOut}>
          <RocketIcon /> Cash Out · {mult.toFixed(2)}x
        </button>
      ) : done ? (
        <button type="button" className={styles.doneBtn} disabled>
          {slot.phase === 'cashed' ? 'Cashed Out ✓' : 'Lost'}
        </button>
      ) : (
        <button
          type="button"
          className={isSlotTwo ? styles.placeBtnAlt : styles.placeBtn}
          onClick={onPlaceBet}
          disabled={locked}
        >
          <RocketIcon /> Place Bet · {slot.bet} PKR
        </button>
      )}
    </div>
  )
}

function PlaneIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
      <path d="M17.8 19.2 16 11l3.5-3.5C21 6 21.5 4 21 3c-1-.5-3 0-4.5 1.5L13 8 4.8 6.2c-.5-.1-.9.1-1.1.5l-.3.5c-.2.5-.1 1 .3 1.3L9 12l-2 3H4l-1 1 3 2 2 3 1-1v-3l3-2 3.5 5.3c.3.4.8.5 1.3.3l.5-.2c.4-.3.6-.7.5-1.2z" />
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

function ZapIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden>
      <path d="M13 2 3 14h9l-1 8 10-12h-9l1-8z" />
    </svg>
  )
}

function RocketIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
      <path d="M4.5 16.5c-1.5 1.26-2 5-2 5s3.74-.5 5-2c.71-.84.7-2.13-.09-2.91a2.18 2.18 0 0 0-2.91-.09z" />
      <path d="m12 15-3-3a22 22 0 0 1 2-3.95A12.88 12.88 0 0 1 22 2c0 2.72-.78 7.5-6 11a22.35 22.35 0 0 1-4 2z" />
      <path d="M9 12H4s.55-3.03 2-4c1.62-1.08 5 0 5 0" />
      <path d="M12 15v5s3.03-.55 4-2c1.08-1.62 0-5 0-5" />
    </svg>
  )
}

function ChatIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
      <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
    </svg>
  )
}

function PartyIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
      <path d="M5.8 11.3 2 22l10.7-3.79" />
      <path d="M4 3h.01M22 8h.01M15 2h.01M22 20h.01M22 2l-2.24.75" />
      <path d="M9.5 9.5 22 22" />
      <path d="M14.5 4.5 17 7" />
    </svg>
  )
}

function SparkIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
      <path d="m12 3-1.912 5.813a2 2 0 0 1-1.275 1.275L3 12l5.813 1.912a2 2 0 0 1 1.275 1.275L12 21l1.912-5.813a2 2 0 0 1 1.275-1.275L21 12l-5.813-1.912a2 2 0 0 1-1.275-1.275L12 3Z" />
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

function SendIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
      <path d="m22 2-7 20-4-9-9-4Z" />
      <path d="M22 2 11 13" />
    </svg>
  )
}
