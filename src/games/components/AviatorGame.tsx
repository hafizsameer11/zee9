import { useCallback, useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useWallet } from '../../context/WalletContext'
import { generateCrashPoint, multiplierAtElapsed } from '../engines/crash'
import { getDesignCanvasStyle, getDesignScaleShellStyle, useDesignScale } from '../hooks/useDesignScale'
import type { GameComponentProps } from '../types'
import AviatorArena from './AviatorArena'
import {
  BackChevronIcon,
  CartWagonIcon,
  ClockRewindIcon,
  MenuDiamondsIcon,
  PromoPinIcon,
  ShieldFairIcon,
} from './aviatorClassicGfx'
import styles from './aviatorGame.module.css'

type GlobalPhase = 'idle' | 'flying' | 'crashed'
type SlotPhase = 'idle' | 'active' | 'cashed' | 'lost'
type SidebarTab = 'all' | 'my' | 'top'
type PanelTab = 'bet' | 'auto'

type BetSlot = {
  bet: number
  autoEnabled: boolean
  autoAt: number
  phase: SlotPhase
  wager: number
}

type LiveBet = {
  name: string
  bet: number
  cashout: number | null
  avatarSeed: string
}

const ALL_BETS: LiveBet[] = [
  { name: 'P***4', bet: 5000, cashout: null, avatarSeed: 'a1' },
  { name: 'P***1', bet: 2000, cashout: null, avatarSeed: 'a2' },
  { name: 'P***7', bet: 1000, cashout: null, avatarSeed: 'a3' },
  { name: 'P***2', bet: 500, cashout: null, avatarSeed: 'a4' },
  { name: 'P***9', bet: 300, cashout: null, avatarSeed: 'a5' },
  { name: 'P***3', bet: 200, cashout: null, avatarSeed: 'a6' },
  { name: 'P***8', bet: 150, cashout: null, avatarSeed: 'a7' },
  { name: 'P***5', bet: 100, cashout: null, avatarSeed: 'a8' },
  { name: 'P***6', bet: 80, cashout: null, avatarSeed: 'a9' },
  { name: 'P***0', bet: 50, cashout: null, avatarSeed: 'a10' },
]

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
  const { balance, debit, credit, canAfford } = useWallet()

  const [globalPhase, setGlobalPhase] = useState<GlobalPhase>('idle')
  const [mult, setMult] = useState(1)
  const [elapsedSec, setElapsedSec] = useState(0)
  const [history, setHistory] = useState<number[]>([
    1.1, 1.98, 2.38, 1.24, 4.71, 15.9, 1.06, 2.51, 1.02, 3.7, 1.21, 13.66, 1.1, 1.32, 1.7,
  ])
  const [sidebarTab, setSidebarTab] = useState<SidebarTab>('all')
  const [slots, setSlots] = useState<BetSlot[]>([
    { bet: defaultBet || 10, autoEnabled: false, autoAt: 2.0, phase: 'idle', wager: 0 },
    { bet: defaultBet || 10, autoEnabled: false, autoAt: 2.0, phase: 'idle', wager: 0 },
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
    setElapsedSec(0)
  }, [])

  const endCrash = useCallback(() => {
    stopLoop()
    setGlobalPhase('crashed')
    setMult(crashPoint.current)
    setHistory((h) => [crashPoint.current, ...h].slice(0, 20))
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
      onMessage?.(`🎉 Cashed ${formatCompact(win)}`)
    },
    [credit, onMessage],
  )

  const tick = useCallback(() => {
    const elapsed = Date.now() - startTime.current
    const m = multiplierAtElapsed(elapsed)
    setMult(m)
    setElapsedSec(elapsed / 1000)
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

  const sidebarBets =
    sidebarTab === 'top'
      ? [...ALL_BETS].sort((a, b) => b.bet - a.bet)
      : sidebarTab === 'my'
        ? ALL_BETS.slice(0, 2)
        : ALL_BETS

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
              src={avatarUrl('P9751521')}
              alt=""
            />
            <div className={styles.userMeta}>
              <span className={styles.userName}>P9751521</span>
              <span className={styles.userId}>ID:9751521</span>
            </div>
            <div className={styles.balanceBox}>
              <span>{formatCompact(balance)}</span>
            </div>
          </div>

          <div className={styles.topRight}>
            <button type="button" className={styles.addBtn}>
              <span>ADD</span>
              <CartWagonIcon className={styles.cartIcon} />
            </button>
            <button type="button" className={styles.menuBtn} aria-label="Menu">
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
                >
                  {tab === 'all' ? 'All Bets' : tab === 'my' ? 'My Bets' : 'Top'}
                </button>
              ))}
            </div>

            <div className={styles.sidebarHead}>
              <div className={styles.sidebarTitle}>
                <strong>ALL BETS</strong>
                <span>{sidebarBets.length}</span>
              </div>
              <button type="button" className={styles.prevHandBtn}>
                <ClockRewindIcon />
                Previous hand
              </button>
            </div>

            <div className={styles.betTableHead}>
              <span>User</span>
              <span>Bet&X</span>
              <span>Cash Out</span>
            </div>

            <div className={styles.betList}>
              {sidebarBets.map((row) => (
                <div key={row.name} className={styles.betRow}>
                  <div className={styles.betUser}>
                    <img
                      className={styles.betAvatar}
                      src={avatarUrl(row.avatarSeed)}
                      alt=""
                    />
                    <span className={styles.betName}>{row.name}</span>
                  </div>
                  <span className={styles.betAmount}>{formatCompact(row.bet)}</span>
                  <span
                    className={`${styles.betCashout} ${row.cashout ? styles.betCashoutWin : ''}`}
                  >
                    {row.cashout ? formatAmount(row.cashout) : '0.00'}
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
                <span
                  key={`${h}-${idx}`}
                  className={`${styles.historyChip} ${historyChipClass(h)}`}
                >
                  {h.toFixed(2)}x
                </span>
              ))}
            </div>

            <AviatorArena
              mult={mult}
              phase={globalPhase}
              elapsedSec={crashed ? elapsedSec : flying ? elapsedSec : 0}
            />

            <div className={styles.betPanels}>
              {slots.map((slot, i) => (
                <BetPanel
                  key={i}
                  slot={slot}
                  mult={mult}
                  flying={flying}
                  crashed={crashed}
                  onPlaceBet={() => placeBet(i)}
                  onCashOut={() => manualCashOut(i)}
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
  crashed,
  onPlaceBet,
  onCashOut,
  onUpdate,
}: {
  slot: BetSlot
  mult: number
  flying: boolean
  crashed: boolean
  onPlaceBet: () => void
  onCashOut: () => void
  onUpdate: (patch: Partial<BetSlot>) => void
}) {
  const [panelTab, setPanelTab] = useState<PanelTab>('bet')
  const locked = flying || crashed
  const active = slot.phase === 'active'
  const done = slot.phase === 'cashed' || slot.phase === 'lost'

  const adjustBet = (delta: number) => {
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
        >
          Bet
        </button>
        <button
          type="button"
          className={panelTab === 'auto' ? styles.panelTabActive : styles.panelTab}
          onClick={() => setPanelTab('auto')}
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
                    onClick={() => onUpdate({ bet: amt })}
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

        {active && flying ? (
          <button
            type="button"
            className={`${styles.betActionBtn} ${styles.cashoutBtn}`}
            onClick={onCashOut}
          >
            <span className={styles.betActionLabel}>CASH OUT</span>
            <span className={styles.betActionAmount}>{mult.toFixed(2)}x</span>
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
            disabled={locked}
          >
            <span className={styles.betActionLabel}>BET</span>
            <span className={styles.betActionAmount}>{slot.bet}</span>
          </button>
        )}
      </div>
    </div>
  )
}
