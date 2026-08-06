import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import AddCashModal from '../../components/s9/modals/AddCashModal'
import { usePlayerAuth } from '../../api/auth'
import { getAccess } from '../../api/client'
import { useWallet } from '../../context/WalletContext'
import { sound } from '../../lib/sound'
import { type UpDownChoice } from '../engines/dice'
import { getDesignCanvasStyle, getDesignScaleShellStyle, useDesignScale } from '../hooks/useDesignScale'
import { useGameLeaveGuard } from '../hooks/useGameLeaveGuard'
import { useAutoAffordableChip } from '../lib/maxAffordableChip'
import { useWinPresentationHold } from '../../hooks/useWinPresentationHold'
import { connectSevenUpSocket } from '../lib/sevenUpSocket'
import { roundLossMessage, roundWinMessage } from '../lib/roundResult'
import type { GameComponentProps } from '../types'
import { CHIP_IMG_SM, IMG, SND } from './assets'
import { chipFor, formatAmount } from './chips'
import {
  CHIP_VALUES,
  DESIGN_H,
  DESIGN_W,
  FELT,
  ROUND_SEC,
  SEAT_SLOTS,
  TABLE,
  ZONES,
  type ChipValue,
} from './constants'
import DiceStage from './components/DiceStage'
import TableZone from './components/TableZone'
import Seat, { type SeatData } from './components/Seat'
import { BalancePill, ChipTray, HistoryStrip, IconButton, LivePill, Logo, TimerRing } from './components/Hud'
import styles from './sevenUpDown.module.css'

type UiPhase = 'betting' | 'rolling' | 'result'
type Zones = Record<UpDownChoice, number>

const ZERO: Zones = { down: 0, seven: 0, up: 0 }

/** Zone plate header heights, as a percentage of each plate (from the art). */
const HEAD_PCT: Record<UpDownChoice, number> = { down: 10.7, seven: 13.01, up: 10.7 }

type ServerSeat = {
  id: string
  name: string
  bets: Zones
  total: number
  lastSide: UpDownChoice
  lastAmount: number
  seq: number
}

type FlyingChip = {
  id: string
  value: ChipValue
  fx: number
  fy: number
  tx: number
  ty: number
  delay: number
}

type FloatText = { id: string; text: string; x: number; y: number }

let uid = 0
const nextId = () => `f${++uid}`

function uiPhaseOf(p: string | undefined): UiPhase {
  if (p === 'reveal') return 'result'
  if (p === 'locked') return 'rolling'
  return 'betting'
}

const ROLL_MIN_MS = 2200

function toZones(v: any): Zones {
  return {
    down: Number(v?.down) || 0,
    seven: Number(v?.seven) || 0,
    up: Number(v?.up) || 0,
  }
}

export default function SevenUpDownGame({ bet: defaultBet, onMessage }: GameComponentProps) {
  const navigate = useNavigate()
  const viewportRef = useRef<HTMLDivElement>(null)
  const sceneRef = useRef<HTMLDivElement>(null)
  const layout = useDesignScale(viewportRef, DESIGN_W, DESIGN_H)
  const { balance, refresh } = useWallet()
  const { holdWin, releaseWinHold } = useWinPresentationHold('7up-down')
  const holdWinRef = useRef(holdWin)
  holdWinRef.current = holdWin
  const releaseWinHoldRef = useRef(releaseWinHold)
  releaseWinHoldRef.current = releaseWinHold
  const { player } = usePlayerAuth()
  const authed = !!getAccess()

  const [betAmount, setBetAmount] = useState<ChipValue>(
    (CHIP_VALUES.find((v) => v === defaultBet) ?? 100) as ChipValue,
  )

  useAutoAffordableChip(balance, CHIP_VALUES, setBetAmount)

  const [phase, setPhase] = useState<UiPhase>('betting')
  const [countdown, setCountdown] = useState(ROUND_SEC)
  const [period, setPeriod] = useState<string | null>(null)
  const [history, setHistory] = useState<number[]>([])
  const [pots, setPots] = useState<Zones>(ZERO)
  const [myBets, setMyBets] = useState<Zones>(ZERO)
  const [lastBets, setLastBets] = useState<Zones>(ZERO)
  const [seats, setSeats] = useState<ServerSeat[]>([])
  const [dice, setDice] = useState<{ d1: number | null; d2: number | null; sum: number | null }>({
    d1: null,
    d2: null,
    sum: null,
  })
  const [winningZone, setWinningZone] = useState<UpDownChoice | null>(null)
  const [payout, setPayout] = useState(0)
  const [online, setOnline] = useState(0)
  const [connected, setConnected] = useState(false)
  const [flying, setFlying] = useState<FlyingChip[]>([])
  const [floats, setFloats] = useState<FloatText[]>([])
  const [toast, setToast] = useState<string | null>(null)
  const [menuOpen, setMenuOpen] = useState(false)
  const [showAddCash, setShowAddCash] = useState(false)

  const zoneRefs = useRef<Record<string, HTMLButtonElement | null>>({})
  const seatRefs = useRef<Record<string, HTMLDivElement | null>>({})
  const selfRef = useRef<HTMLDivElement | null>(null)
  const socketRef = useRef<ReturnType<typeof connectSevenUpSocket> | null>(null)
  const rollAudioRef = useRef<HTMLAudioElement | null>(null)

  const periodRef = useRef<string | null>(null)
  const revealedRef = useRef<string | null>(null)
  const phaseRef = useRef<UiPhase>('betting')
  const seatSeqRef = useRef<Map<string, number>>(new Map())
  const slotRef = useRef<Map<string, number>>(new Map())
  const scaleRef = useRef(1)
  scaleRef.current = layout.scale
  const myBetsRef = useRef(myBets)
  myBetsRef.current = myBets
  const toastTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const rollingStartedAtRef = useRef(0)
  const resultTimerRef = useRef<number | null>(null)

  const clearToast = useCallback(() => {
    if (toastTimerRef.current) {
      window.clearTimeout(toastTimerRef.current)
      toastTimerRef.current = null
    }
    setToast(null)
    onMessage?.(null)
  }, [onMessage])

  const showToast = useCallback((msg: string, ms = 2200) => {
    if (toastTimerRef.current) window.clearTimeout(toastTimerRef.current)
    setToast(msg)
    onMessage?.(msg)
    toastTimerRef.current = window.setTimeout(() => {
      setToast((t) => (t === msg ? null : t))
      onMessage?.(null)
      toastTimerRef.current = null
    }, ms)
  }, [onMessage])

  // ── Chip flight ────────────────────────────────────────────────────
  const centerOf = useCallback((el: HTMLElement | null) => {
    const scene = sceneRef.current
    if (!el || !scene) return null
    const s = scaleRef.current || 1
    const sr = scene.getBoundingClientRect()
    const r = el.getBoundingClientRect()
    return {
      x: (r.left + r.width / 2 - sr.left) / s,
      y: (r.top + r.height / 2 - sr.top) / s,
    }
  }, [])

  const flyChips = useCallback(
    (fromEl: HTMLElement | null, zone: UpDownChoice, amount: number) => {
      const from = centerOf(fromEl)
      const to = centerOf(zoneRefs.current[zone])
      if (!from || !to) return
      // One sprite per 4 chips keeps big bets readable without flooding the felt.
      const value = chipFor(amount)
      const count = Math.min(4, Math.max(1, Math.round(amount / value)))
      const batch: FlyingChip[] = Array.from({ length: count }, (_, i) => ({
        id: nextId(),
        value,
        fx: from.x,
        fy: from.y,
        tx: to.x + (Math.random() - 0.5) * 54,
        ty: to.y + (Math.random() - 0.5) * 40,
        delay: i * 70,
      }))
      setFlying((prev) => [...prev.slice(-24), ...batch])
      const ids = new Set(batch.map((b) => b.id))
      window.setTimeout(() => setFlying((prev) => prev.filter((c) => !ids.has(c.id))), 620 + count * 70)
    },
    [centerOf],
  )

  // ── Realtime ───────────────────────────────────────────────────────
  useEffect(() => {
    if (!authed) return

    const sock = connectSevenUpSocket({
      onStatus: (s) => setConnected(s === 'open'),
      onError: (m) => {
        // Expected while rolling / revealing — don't leave a sticky banner up top.
        if (/betting closed/i.test(m) && phaseRef.current !== 'betting') return
        showToast(m)
      },
      onState: (state) => {
        const nextPhase = uiPhaseOf(state.phase)
        const p = String(state.period ?? state.roundId ?? '')

        setCountdown(Math.max(0, Math.ceil((Number(state.msLeft) || 0) / 1000)))
        setPeriod(state.period ?? null)
        setOnline(Number(state.playersOnline) || 0)
        setPots(toZones(state.zoneTotals))
        setMyBets(toZones(state.myBets))
        if (Array.isArray(state.history)) setHistory(state.history.slice(0, 12))

        // Fly a chip for every other player's new wager.
        const incoming: ServerSeat[] = Array.isArray(state.seats) ? state.seats : []
        for (const s of incoming) {
          const prevSeq = seatSeqRef.current.get(s.id)
          if (prevSeq != null && s.seq > prevSeq && s.id !== player?.id) {
            const el = seatRefs.current[s.id]
            if (el) flyChips(el, s.lastSide, Number(s.lastAmount) || 0)
          }
          seatSeqRef.current.set(s.id, s.seq)
        }
        setSeats(incoming)

        if (nextPhase === 'betting') {
          const newRound = !!periodRef.current && periodRef.current !== p
          const reopening = phaseRef.current !== 'betting'
          if (newRound) {
            setWinningZone(null)
            setPayout(0)
            setDice({ d1: null, d2: null, sum: null })
            seatSeqRef.current.clear()
          }
          if (newRound || reopening) clearToast()
          periodRef.current = p
          phaseRef.current = 'betting'
          setPhase('betting')
          return
        }

        if (nextPhase === 'rolling') {
          if (phaseRef.current !== 'rolling') {
            rollingStartedAtRef.current = Date.now()
            phaseRef.current = 'rolling'
            try {
              const a = rollAudioRef.current
              if (a) {
                a.currentTime = 0
                void a.play().catch(() => {})
              }
            } catch {
              /* ignore */
            }
          }
          setPhase('rolling')
          return
        }

        const sum = Number(state.sum)
        if (!Number.isFinite(sum)) {
          setPhase('rolling')
          return
        }

        const pendingPayout = Number(state.myPayout ?? 0)
        if (pendingPayout > 0) holdWinRef.current(pendingPayout)

        const applyResult = () => {
          const win = (state.winningZone as UpDownChoice) ?? null
          const got = Number(state.myPayout ?? 0)
          setDice({
            d1: Number(state.die1) || null,
            d2: Number(state.die2) || null,
            sum,
          })
          setWinningZone(win)
          setPayout(got)
          phaseRef.current = 'result'
          setPhase('result')

          if (revealedRef.current !== p) {
            revealedRef.current = p
            const staked = toZones(state.myBets)
            setLastBets(staked)
            const total = staked.down + staked.seven + staked.up
            if (got > 0) {
              releaseWinHoldRef.current()
              sound.play('win')
              showToast(roundWinMessage(got))
              const id = nextId()
              setFloats((f) => [...f, { id, text: `+${formatAmount(got)}`, x: DESIGN_W / 2, y: 250 }])
              window.setTimeout(() => setFloats((f) => f.filter((x) => x.id !== id)), 1600)
            } else if (total > 0) {
              sound.play('lose', { volume: 0.5 })
              showToast(roundLossMessage(total))
            }
            void refresh()
          }
          periodRef.current = p
        }

        const wait = Math.max(0, ROLL_MIN_MS - (Date.now() - rollingStartedAtRef.current))
        if (resultTimerRef.current) window.clearTimeout(resultTimerRef.current)
        resultTimerRef.current = window.setTimeout(() => {
          resultTimerRef.current = null
          applyResult()
        }, wait)
      },
    })

    socketRef.current = sock
    return () => {
      sock.close()
      socketRef.current = null
      setConnected(false)
      clearToast()
      if (resultTimerRef.current) {
        window.clearTimeout(resultTimerRef.current)
        resultTimerRef.current = null
      }
    }
  }, [authed, clearToast, flyChips, player?.id, refresh, showToast])

  useEffect(() => {
    const a = new Audio(SND.roll)
    a.volume = 0.45
    a.preload = 'auto'
    rollAudioRef.current = a
    return () => {
      a.pause()
      rollAudioRef.current = null
    }
  }, [])

  // ── Betting ────────────────────────────────────────────────────────
  const placeBet = useCallback(
    (zone: UpDownChoice, amount: number) => {
      if (phase !== 'betting') return
      if (!authed) {
        showToast('Sign in to play')
        return
      }
      const sock = socketRef.current
      if (!sock || !connected) {
        sound.play('error')
        showToast('Reconnecting…')
        return
      }
      if (balance < amount) {
        sound.play('error')
        showToast('Not enough balance')
        return
      }

      // Optimistic — the next server tick is authoritative.
      setMyBets((prev) => ({ ...prev, [zone]: prev[zone] + amount }))
      setPots((prev) => ({ ...prev, [zone]: prev[zone] + amount }))
      sound.play('chip')
      sound.vibrate(10)
      flyChips(selfRef.current, zone, amount)

      void sock
        .request('bet', { side: zone, amount })
        .then(() => void refresh())
        .catch((e: any) => {
          sound.play('error')
          const msg = e?.message || 'Bet rejected'
          if (/betting closed/i.test(msg)) showToast(msg, 1400)
          else showToast(msg)
          setMyBets((prev) => ({ ...prev, [zone]: Math.max(0, prev[zone] - amount) }))
          setPots((prev) => ({ ...prev, [zone]: Math.max(0, prev[zone] - amount) }))
        })
    },
    [authed, balance, connected, flyChips, phase, refresh, showToast],
  )

  const handleZoneBet = useCallback(
    (zone: UpDownChoice) => placeBet(zone, betAmount),
    [betAmount, placeBet],
  )

  const myStake = myBets.down + myBets.seven + myBets.up
  const lastStake = lastBets.down + lastBets.seven + lastBets.up

  const { requestLeave, LeaveModal } = useGameLeaveGuard(navigate, {
    hasActiveBet: myStake > 0 && phase !== 'result',
    stakeAmount: myStake,
  })

  const handleRebet = useCallback(() => {
    if (phase !== 'betting' || lastStake <= 0) return
    if (balance < lastStake) {
      showToast('Not enough balance to rebet')
      return
    }
    for (const z of ['down', 'seven', 'up'] as UpDownChoice[]) {
      if (lastBets[z] > 0) placeBet(z, lastBets[z])
    }
  }, [balance, lastBets, lastStake, phase, placeBet, showToast])

  const handleDouble = useCallback(() => {
    if (phase !== 'betting' || myStake <= 0) return
    if (balance < myStake) {
      showToast('Not enough balance to double')
      return
    }
    const snapshot = { ...myBets }
    for (const z of ['down', 'seven', 'up'] as UpDownChoice[]) {
      if (snapshot[z] > 0) placeBet(z, snapshot[z])
    }
  }, [balance, myBets, myStake, phase, placeBet, showToast])

  // ── Seat layout ────────────────────────────────────────────────────
  const registerSeatRef = useCallback((id: string, el: HTMLDivElement | null) => {
    seatRefs.current[id] = el
  }, [])

  const registerZoneRef = useCallback((zone: UpDownChoice, el: HTMLButtonElement | null) => {
    zoneRefs.current[zone] = el
  }, [])

  const seatSlots = useMemo(() => {
    const others = seats.filter((s) => s.id !== player?.id)
    const slots: (SeatData | null)[] = Array.from({ length: SEAT_SLOTS }, () => null)
    const assigned = slotRef.current
    const taken = new Set<number>()

    // Keep a player in the same chair for as long as they keep betting.
    for (const s of others) {
      const slot = assigned.get(s.id)
      if (slot != null && !taken.has(slot)) {
        taken.add(slot)
        slots[slot] = { id: s.id, name: s.name, total: s.total, lastSide: s.lastSide }
      }
    }
    for (const s of others) {
      if (assigned.has(s.id) && slots.some((x) => x?.id === s.id)) continue
      const free = slots.findIndex((x, i) => x == null && !taken.has(i))
      if (free < 0) break
      assigned.set(s.id, free)
      taken.add(free)
      slots[free] = { id: s.id, name: s.name, total: s.total, lastSide: s.lastSide }
    }
    if (assigned.size > 60) assigned.clear()
    return slots
  }, [seats, player?.id])

  const seatColStyle = { top: FELT.top - 4, height: FELT.height + 8 }

  return (
    <>
      <div className={styles.root} ref={viewportRef}>
        <div style={getDesignScaleShellStyle(layout)}>
          <div className={styles.canvas} style={getDesignCanvasStyle(layout)}>
            <div className={styles.scene} ref={sceneRef}>
              <img src={IMG.roomBg} alt="" className={styles.roomBg} draggable={false} />
              <div className={styles.roomTint} aria-hidden />

              <img
                src={IMG.table}
                alt=""
                draggable={false}
                className={styles.tableImg}
                style={{
                  left: TABLE.left,
                  top: TABLE.top,
                  width: TABLE.width,
                  height: TABLE.height,
                }}
              />

              {/* Betting felt */}
              <div
                className={styles.felt}
                style={{ left: FELT.left, top: FELT.top, width: FELT.width, height: FELT.height }}
              >
                {ZONES.map((z) => (
                  <TableZone
                    key={z.id}
                    zone={z.id}
                    range={z.range}
                    mult={z.mult}
                    pot={pots[z.id]}
                    myBet={myBets[z.id]}
                    headPct={HEAD_PCT[z.id]}
                    canBet={phase === 'betting' && authed}
                    won={phase === 'result' && winningZone === z.id}
                    dimmed={phase === 'result' && winningZone != null && winningZone !== z.id}
                    onBet={handleZoneBet}
                    registerRef={registerZoneRef}
                  />
                ))}
              </div>

              {/* Seats */}
              <div className={styles.seatCol} style={{ left: 2, ...seatColStyle }}>
                {seatSlots.slice(0, 3).map((s, i) => (
                  <Seat key={s?.id ?? `l${i}`} seat={s} registerRef={registerSeatRef} />
                ))}
              </div>
              <div
                className={styles.seatCol}
                style={{ left: DESIGN_W - 76, alignItems: 'center', ...seatColStyle }}
              >
                {seatSlots.slice(3, 6).map((s, i) => (
                  <Seat key={s?.id ?? `r${i}`} seat={s} registerRef={registerSeatRef} />
                ))}
              </div>

              <HistoryStrip history={history} top={FELT.top + FELT.height + 8} />

              {/* Top bar */}
              <header className={styles.topBar}>
                <div className={styles.topLeft}>
                  <IconButton src={IMG.btnBack} label="Back to lobby" onClick={requestLeave} />
                  <Logo period={period} />
                </div>
                <div className={styles.topRight}>
                  <LivePill online={online} connected={connected} />
                  <BalancePill balance={balance} />
                  <IconButton
                    src={IMG.btnAdd}
                    label="Add cash"
                    onClick={() => {
                      setMenuOpen(false)
                      setShowAddCash(true)
                    }}
                  />
                  <IconButton src={IMG.btnMenu} label="Menu" onClick={() => setMenuOpen((v) => !v)} />
                </div>
              </header>

              <TimerRing seconds={countdown} max={ROUND_SEC} phase={phase} />

              {menuOpen && (
                <div className={styles.menu} role="menu">
                  <button type="button" className={styles.menuItem} onClick={requestLeave}>
                    Exit to lobby
                  </button>
                  <button
                    type="button"
                    className={styles.menuItem}
                    onClick={() => {
                      setMenuOpen(false)
                      setShowAddCash(true)
                    }}
                  >
                    Add cash
                  </button>
                  <button type="button" className={styles.menuItem} onClick={() => setMenuOpen(false)}>
                    Close
                  </button>
                  <span className={styles.menuNote}>
                    2–6 and 8–12 pay ×2 · exactly 7 pays ×5
                  </span>
                </div>
              )}

              {/* Dice */}
              <DiceStage
                phase={phase === 'betting' ? 'idle' : phase === 'rolling' ? 'rolling' : 'reveal'}
                die1={dice.d1}
                die2={dice.d2}
                sum={dice.sum}
                winningZone={winningZone}
                payout={payout}
                staked={lastStake}
              />

              {/* FX */}
              <div className={styles.fxLayer}>
                {flying.map((c) => (
                  <img
                    key={c.id}
                    src={CHIP_IMG_SM[c.value]}
                    alt=""
                    draggable={false}
                    className={styles.flyChip}
                    style={
                      {
                        '--fx': `${c.fx}px`,
                        '--fy': `${c.fy}px`,
                        '--tx': `${c.tx}px`,
                        '--ty': `${c.ty}px`,
                        '--delay': `${c.delay}ms`,
                      } as React.CSSProperties
                    }
                  />
                ))}
                {floats.map((f) => (
                  <span key={f.id} className={styles.floatText} style={{ left: f.x, top: f.y }}>
                    {f.text}
                  </span>
                ))}
              </div>

              {toast && <div className={styles.toast}>{toast}</div>}

              {/* Bottom bar */}
              <footer className={styles.bottomBar}>
                <div className={styles.selfDock} ref={selfRef}>
                  <div className={styles.selfAvatar}>
                    {(player?.name ?? 'G').slice(0, 2).toUpperCase()}
                  </div>
                  <div className={styles.selfMeta}>
                    <span className={styles.selfName}>{player?.name ?? 'Guest'}</span>
                    <span className={styles.selfStake}>
                      {myStake > 0 ? `Staked ${formatAmount(myStake)}` : 'No bet yet'}
                    </span>
                  </div>
                </div>

                <ChipTray selected={betAmount} balance={balance} onSelect={setBetAmount} />

                <div className={styles.actions}>
                  <button
                    type="button"
                    className={styles.actionBtn}
                    disabled={phase !== 'betting' || lastStake <= 0}
                    onClick={handleRebet}
                  >
                    Rebet
                  </button>
                  <button
                    type="button"
                    className={`${styles.actionBtn} ${styles.actionPrimary}`}
                    disabled={phase !== 'betting' || myStake <= 0}
                    onClick={handleDouble}
                  >
                    Double
                  </button>
                </div>
              </footer>

              {!authed && (
                <div className={styles.veil}>
                  <span className={styles.veilText}>Preview mode</span>
                  <span className={styles.veilSub}>
                    Sign in to join the live table — rounds, dice and payouts all run on the server.
                  </span>
                </div>
              )}
              {authed && !connected && (
                <div className={styles.veil}>
                  <span className={styles.spinner} />
                  <span className={styles.veilText}>Connecting to table…</span>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
      {showAddCash && <AddCashModal onClose={() => setShowAddCash(false)} />}
      {LeaveModal}
    </>
  )
}
