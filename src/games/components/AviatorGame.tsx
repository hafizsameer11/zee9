import { useCallback, useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useWallet } from '../../context/WalletContext'
import { usePlayerAuth } from '../../api/auth'
import { api } from '../../api/client'
import { sound } from '../../lib/sound'
import { getDesignCanvasStyle, getDesignScaleShellStyle, useDesignScale } from '../hooks/useDesignScale'
import type { GameComponentProps } from '../types'
import AviatorArena from './AviatorArena'
import { connectAviatorSocket } from '../lib/aviatorSocket'
import {
  BackChevronIcon,
  CartWagonIcon,
  ClockRewindIcon,
  MenuDiamondsIcon,
  PromoPinIcon,
  ShieldFairIcon,
} from './aviatorClassicGfx'
import styles from './aviatorGame.module.css'

type ServerPhase = 'waiting' | 'flying' | 'crashed'
type SlotPhase = 'idle' | 'active' | 'cashed' | 'lost'
type SidebarTab = 'all' | 'my' | 'top'
type PanelTab = 'bet' | 'auto'

type BetSlot = {
  bet: number
  autoEnabled: boolean
  autoAt: number
  phase: SlotPhase
  wager: number
  betId: string | null
}

type LiveBet = {
  id: string
  name: string
  bet: number
  cashout: number | null
  cashoutAt: number | null
  avatarSeed: string
  state: string
  isMe?: boolean
}

const QUICK_AMOUNTS = [100, 200, 500, 1000]

function formatCompact(n: number) {
  return n.toLocaleString('en-PK', { minimumFractionDigits: 0, maximumFractionDigits: 0 })
}

function formatAmount(n: number) {
  return n.toLocaleString('en-PK', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}

function historyChipClass(mult: number) {
  if (mult < 2) return styles.chipBlue
  if (mult < 10) return styles.chipPurple
  return styles.chipPink
}

function avatarUrl(seed: string) {
  return `https://api.dicebear.com/7.x/avataaars/svg?seed=${seed}&backgroundColor=b6e3f4,c0aede,d1d4f9`
}

export default function AviatorGame({ bet: defaultBet, onMessage }: GameComponentProps) {
  const navigate = useNavigate()
  const viewportRef = useRef<HTMLDivElement>(null)
  const layout = useDesignScale(viewportRef)
  const { balance, refresh, canAfford } = useWallet()
  const { player } = usePlayerAuth()

  const [phase, setPhase] = useState<ServerPhase | 'idle'>('idle')
  const [mult, setMult] = useState(1)
  const [elapsedSec, setElapsedSec] = useState(0)
  const [waitingMsLeft, setWaitingMsLeft] = useState(0)
  const [history, setHistory] = useState<number[]>([])
  const [liveBets, setLiveBets] = useState<LiveBet[]>([])
  const [betCount, setBetCount] = useState(0)
  const [sidebarTab, setSidebarTab] = useState<SidebarTab>('all')
  const [flightStartPerf, setFlightStartPerf] = useState<number | null>(null)
  const [crashCap, setCrashCap] = useState<number | null>(null)
  const [slots, setSlots] = useState<BetSlot[]>([
    { bet: defaultBet || 100, autoEnabled: false, autoAt: 2.0, phase: 'idle', wager: 0, betId: null },
    { bet: defaultBet || 100, autoEnabled: false, autoAt: 2.0, phase: 'idle', wager: 0, betId: null },
  ])

  const prevPhase = useRef<string>('idle')
  const busyRef = useRef(false)
  const flightStartPerfRef = useRef<number | null>(null)

  const alignFlightStart = useCallback((startedAtIso: string | null, serverTimeIso: string | null) => {
    const serverNow = serverTimeIso ? Date.parse(serverTimeIso) : Date.now()
    const clockOffset = Date.now() - serverNow
    const startWall = startedAtIso ? Date.parse(startedAtIso) : Date.now()
    const elapsedAlready = Math.max(0, Date.now() - clockOffset - startWall)
    const perfStart = performance.now() - elapsedAlready
    flightStartPerfRef.current = perfStart
    setFlightStartPerf(perfStart)
    setCrashCap(null)
  }, [])

  const onFlightMult = useCallback((m: number, elapsed: number) => {
    setMult(m)
    setElapsedSec(elapsed)
  }, [])

  const applyState = useCallback(
    (state: any) => {
      const nextPhase = state.phase as ServerPhase
      setPhase(nextPhase)
      setWaitingMsLeft(state.waitingMsLeft ?? 0)
      setHistory(state.history ?? [])
      setLiveBets(state.liveBets ?? [])
      setBetCount(state.betCount ?? 0)

      if (Array.isArray(state.myBets)) {
        setSlots((prev) =>
          prev.map((slot, i) => {
            const mine = state.myBets.find((b: any) => b.slot === i)
            if (!mine) {
              if (state.phase === 'waiting' && slot.phase !== 'active') {
                return { ...slot, phase: 'idle' as const, wager: 0, betId: null }
              }
              if (state.phase === 'waiting' && prevPhase.current !== 'waiting') {
                return { ...slot, phase: 'idle' as const, wager: 0, betId: null }
              }
              return slot
            }
            const phaseMap: Record<string, SlotPhase> = {
              ACTIVE: 'active',
              CASHED_OUT: 'cashed',
              BUST: 'lost',
            }
            return {
              ...slot,
              betId: mine.id,
              wager: mine.bet,
              phase: phaseMap[mine.state] ?? slot.phase,
              autoAt: mine.autoAt ?? slot.autoAt,
              autoEnabled: mine.autoAt != null ? true : slot.autoEnabled,
            }
          }),
        )
      }

      if (nextPhase === 'flying') {
        if (prevPhase.current !== 'flying' || flightStartPerfRef.current == null) {
          alignFlightStart(state.startedAt, state.serverTime)
        }
      } else if (nextPhase === 'crashed') {
        const crash = state.crashPoint ?? state.multiplier ?? 1
        flightStartPerfRef.current = null
        setFlightStartPerf(null)
        setCrashCap(crash)
        setMult(crash)
        setElapsedSec((state.elapsedMs ?? 0) / 1000)
      } else {
        flightStartPerfRef.current = null
        setFlightStartPerf(null)
        setCrashCap(null)
        setMult(1)
        setElapsedSec(0)
      }

      if (prevPhase.current !== nextPhase) {
        if (nextPhase === 'flying' && prevPhase.current === 'waiting') {
          sound.play('whoosh', { volume: 0.55 })
        }
        if (nextPhase === 'crashed' && prevPhase.current === 'flying') {
          sound.play('crash')
          onMessage?.('💥 Crashed!')
          void refresh()
        }
        if (nextPhase === 'waiting' && prevPhase.current === 'crashed') {
          onMessage?.(null)
          setSlots((s) => s.map((slot) => ({ ...slot, phase: 'idle', wager: 0, betId: null })))
          void refresh()
        }
        prevPhase.current = nextPhase
      }
    },
    [alignFlightStart, onMessage, refresh],
  )

  const socketRef = useRef<ReturnType<typeof connectAviatorSocket> | null>(null)

  useEffect(() => {
    const sock = connectAviatorSocket({
      onState: applyState,
      onError: (message) => onMessage?.(message),
    })
    socketRef.current = sock
    return () => {
      sock.close()
      socketRef.current = null
    }
  }, [applyState, onMessage])

  // Smooth waiting countdown locally between pushes
  useEffect(() => {
    if (phase !== 'waiting') return
    const id = setInterval(() => {
      setWaitingMsLeft((ms) => Math.max(0, ms - 100))
    }, 100)
    return () => clearInterval(id)
  }, [phase])

  const placeBet = async (index: number) => {
    if (busyRef.current) return
    if (phase !== 'waiting') {
      sound.play('error')
      return onMessage?.('Wait for next round to bet')
    }
    const slot = slots[index]
    if (slot.phase !== 'idle' || slot.betId) return
    if (!canAfford(slot.bet)) {
      sound.play('error')
      return onMessage?.('Insufficient balance')
    }
    busyRef.current = true
    try {
      sound.play('bet')
      const res = await api.post('/games/aviator/bet', {
        amount: slot.bet,
        slot: index,
        autoAt: slot.autoEnabled ? slot.autoAt : null,
      })
      setSlots((s) => {
        const next = [...s]
        next[index] = { ...next[index], phase: 'active', wager: slot.bet, betId: res.betId }
        return next
      })
      onMessage?.(null)
      void refresh()
      socketRef.current?.refresh()
    } catch (e: any) {
      sound.play('error')
      onMessage?.(e?.message || 'Bet failed')
    } finally {
      busyRef.current = false
    }
  }

  const manualCashOut = async (index: number) => {
    if (busyRef.current) return
    if (phase !== 'flying') return
    const slot = slots[index]
    if (slot.phase !== 'active' || !slot.betId) return
    busyRef.current = true
    try {
      const res = await api.post('/games/aviator/cashout', { betId: slot.betId })
      sound.play('cashout')
      sound.play('coin', { volume: 0.6 })
      setSlots((s) => {
        const next = [...s]
        next[index] = { ...next[index], phase: 'cashed' }
        return next
      })
      onMessage?.(`🎉 Cashed ${formatCompact(res.payout)} @ ${res.cashoutAt.toFixed(2)}x`)
      void refresh()
      socketRef.current?.refresh()
    } catch (e: any) {
      sound.play('error')
      onMessage?.(e?.message || 'Cash out failed')
      socketRef.current?.refresh()
    } finally {
      busyRef.current = false
    }
  }

  const updateSlot = (index: number, patch: Partial<BetSlot>) => {
    setSlots((s) => {
      const next = [...s]
      next[index] = { ...next[index], ...patch }
      return next
    })
  }

  const flying = phase === 'flying'
  const waiting = phase === 'waiting'

  const sidebarBets = (() => {
    if (sidebarTab === 'top') return [...liveBets].sort((a, b) => b.bet - a.bet)
    if (sidebarTab === 'my') return liveBets.filter((b) => b.isMe)
    return liveBets
  })()

  return (
    <div className={styles.root} ref={viewportRef}>
      <div style={getDesignScaleShellStyle(layout)}>
        <div className={styles.canvas} style={getDesignCanvasStyle(layout)}>
          <header className={styles.topBar}>
            <div className={styles.topLeft}>
              <button
                type="button"
                className={styles.backBtn}
                onClick={() => navigate('/home')}
                aria-label="Back"
                data-sfx="whoosh"
              >
                <BackChevronIcon />
              </button>
              <div className={styles.promoBadge}>
                <PromoPinIcon className={styles.promoIcon} />
                <span>Play Game</span>
                <strong>Rs{slots[0].bet}</strong>
              </div>
            </div>

            <div className={styles.topCenter}>
              <img
                className={styles.avatar}
                src={avatarUrl(player?.id?.slice(-6) || 'zee9')}
                alt=""
              />
              <div className={styles.userMeta}>
                <span className={styles.userName}>{player?.name || 'Player'}</span>
                <span className={styles.userId}>ID:{(player?.id || '').slice(-8).toUpperCase()}</span>
              </div>
              <div className={styles.balanceBox}>
                <span>{formatCompact(balance)}</span>
              </div>
            </div>

            <div className={styles.topRight}>
              <button type="button" className={styles.addBtn} data-sfx="tap">
                <span>ADD</span>
                <CartWagonIcon className={styles.cartIcon} />
              </button>
              <button type="button" className={styles.menuBtn} aria-label="Menu" data-sfx="tap">
                <MenuDiamondsIcon />
              </button>
            </div>
          </header>

          <div className={styles.body}>
            <aside className={styles.sidebar}>
              <div className={styles.sidebarTabs}>
                {(['all', 'my', 'top'] as SidebarTab[]).map((tab) => (
                  <button
                    key={tab}
                    type="button"
                    className={sidebarTab === tab ? styles.sidebarTabActive : styles.sidebarTab}
                    onClick={() => setSidebarTab(tab)}
                    data-sfx="select"
                  >
                    {tab === 'all' ? 'All Bets' : tab === 'my' ? 'My Bets' : 'Top'}
                  </button>
                ))}
              </div>

              <div className={styles.sidebarHead}>
                <div className={styles.sidebarTitle}>
                  <strong>ALL BETS</strong>
                  <span>{betCount}</span>
                </div>
                <button type="button" className={styles.prevHandBtn} data-sfx="tap">
                  <ClockRewindIcon />
                  Live round
                </button>
              </div>

              <div className={styles.betTableHead}>
                <span>User</span>
                <span>Bet&X</span>
                <span>Cash Out</span>
              </div>

              <div className={styles.betList}>
                {sidebarBets.length === 0 && (
                  <div className={styles.betEmpty}>Waiting for players…</div>
                )}
                {sidebarBets.map((row) => (
                  <div
                    key={row.id}
                    className={`${styles.betRow} ${row.isMe ? styles.betRowMe : ''} ${row.state === 'CASHED_OUT' ? styles.betRowWin : ''}`}
                  >
                    <div className={styles.betUser}>
                      <img className={styles.betAvatar} src={avatarUrl(row.avatarSeed)} alt="" />
                      <span className={styles.betName}>{row.name}</span>
                    </div>
                    <span className={styles.betAmount}>
                      {formatCompact(row.bet)}
                      {row.cashoutAt ? (
                        <em className={styles.betX}> {row.cashoutAt.toFixed(2)}x</em>
                      ) : null}
                    </span>
                    <span
                      className={`${styles.betCashout} ${row.cashout ? styles.betCashoutWin : ''}`}
                    >
                      {row.cashout ? formatAmount(row.cashout) : '—'}
                    </span>
                  </div>
                ))}
              </div>

              <div className={styles.provablyFair}>
                <span>This game is</span>
                <ShieldFairIcon />
                <span>Provably Fair</span>
              </div>
            </aside>

            <div className={styles.gameCol}>
              <div className={styles.historyStrip}>
                {history.map((h, idx) => (
                  <span key={`${h}-${idx}`} className={`${styles.historyChip} ${historyChipClass(h)}`}>
                    {h.toFixed(2)}x
                  </span>
                ))}
              </div>

              <AviatorArena
                mult={mult}
                phase={phase === 'idle' ? 'waiting' : phase}
                elapsedSec={elapsedSec}
                waitingMsLeft={waitingMsLeft}
                flightStartPerf={flightStartPerf}
                crashCap={crashCap}
                onFlightMult={onFlightMult}
              />

              <div className={styles.betPanels}>
                {slots.map((slot, i) => (
                  <BetPanel
                    key={i}
                    slot={slot}
                  mult={mult}
                  flying={flying}
                  waiting={waiting}
                  onPlaceBet={() => void placeBet(i)}
                  onCashOut={() => void manualCashOut(i)}
                  onUpdate={(patch) => updateSlot(i, patch)}
                />
              ))}
            </div>
          </div>
        </div>
        </div>
      </div>
    </div>
  )
}

function BetPanel({
  slot,
  mult,
  flying,
  waiting,
  onPlaceBet,
  onCashOut,
  onUpdate,
}: {
  slot: BetSlot
  mult: number
  flying: boolean
  waiting: boolean
  onPlaceBet: () => void
  onCashOut: () => void
  onUpdate: (patch: Partial<BetSlot>) => void
}) {
  const [panelTab, setPanelTab] = useState<PanelTab>('bet')
  const locked = !waiting || slot.phase === 'active'
  const active = slot.phase === 'active'
  const done = slot.phase === 'cashed' || slot.phase === 'lost'

  const adjustBet = (delta: number) => {
    sound.play('chip', { volume: 0.45 })
    const idx = QUICK_AMOUNTS.findIndex((a) => a >= slot.bet)
    const i = idx === -1 ? QUICK_AMOUNTS.length - 1 : idx
    if (delta > 0) {
      onUpdate({ bet: QUICK_AMOUNTS[Math.min(QUICK_AMOUNTS.length - 1, i + 1)] })
    } else {
      onUpdate({ bet: Math.max(10, i > 0 ? QUICK_AMOUNTS[i - 1] : 10) })
    }
  }

  return (
    <div className={styles.betPanel}>
      <div className={styles.panelTabs}>
        <button
          type="button"
          className={panelTab === 'bet' ? styles.panelTabActive : styles.panelTab}
          onClick={() => setPanelTab('bet')}
          data-sfx="select"
        >
          Bet
        </button>
        <button
          type="button"
          className={panelTab === 'auto' ? styles.panelTabActive : styles.panelTab}
          onClick={() => setPanelTab('auto')}
          data-sfx="select"
        >
          Auto
        </button>
      </div>

      <div className={styles.panelBody}>
        <div className={styles.panelControls}>
          {panelTab === 'bet' ? (
            <>
              <div className={styles.amountRow}>
                <button
                  type="button"
                  className={styles.amountBtn}
                  disabled={locked || active}
                  onClick={() => adjustBet(-1)}
                >
                  −
                </button>
                <span className={styles.amountDisplay}>{slot.bet}</span>
                <button
                  type="button"
                  className={styles.amountBtn}
                  disabled={locked || active}
                  onClick={() => adjustBet(1)}
                >
                  +
                </button>
              </div>
              <div className={styles.quickRow}>
                {QUICK_AMOUNTS.map((amt) => (
                  <button
                    key={amt}
                    type="button"
                    className={styles.quickBtn}
                    disabled={locked || active}
                    onClick={() => {
                      sound.play('chip', { volume: 0.4 })
                      onUpdate({ bet: amt })
                    }}
                  >
                    {formatAmount(amt)}
                  </button>
                ))}
              </div>
            </>
          ) : (
            <div className={styles.autoSection}>
              <div className={styles.autoRow}>
                <span>Auto Cash Out</span>
                <button
                  type="button"
                  role="switch"
                  aria-checked={slot.autoEnabled}
                  className={`${styles.switch} ${slot.autoEnabled ? styles.switchOn : ''}`}
                  disabled={locked || active}
                  onClick={() => onUpdate({ autoEnabled: !slot.autoEnabled })}
                  data-sfx="tap"
                />
              </div>
              <div className={styles.autoRow}>
                <span>Cashout at</span>
                <input
                  type="number"
                  min={1.1}
                  step={0.1}
                  value={slot.autoAt}
                  disabled={locked || active || !slot.autoEnabled}
                  onChange={(e) => onUpdate({ autoAt: Number(e.target.value) || 2 })}
                  className={styles.autoInput}
                />
                <span>x</span>
              </div>
            </div>
          )}
        </div>

        {active && flying && mult >= 1.01 ? (
          <button
            type="button"
            className={`${styles.betActionBtn} ${styles.cashoutBtn}`}
            onClick={onCashOut}
            data-sfx="cashout"
          >
            <span className={styles.betActionLabel}>CASH OUT</span>
            <span className={styles.betActionAmount}>{mult.toFixed(2)}x</span>
          </button>
        ) : active && flying ? (
          <button type="button" className={`${styles.betActionBtn} ${styles.doneBtn}`} disabled>
            <span className={styles.betActionLabel}>FLYING…</span>
          </button>
        ) : done ? (
          <button type="button" className={`${styles.betActionBtn} ${styles.doneBtn}`} disabled>
            <span className={styles.betActionLabel}>
              {slot.phase === 'cashed' ? 'WON' : 'LOST'}
            </span>
          </button>
        ) : (
          <button
            type="button"
            className={styles.betActionBtn}
            onClick={onPlaceBet}
            disabled={!waiting || active}
            data-sfx="bet"
          >
            <span className={styles.betActionLabel}>BET</span>
            <span className={styles.betActionAmount}>{slot.bet}</span>
          </button>
        )}
      </div>
    </div>
  )
}
