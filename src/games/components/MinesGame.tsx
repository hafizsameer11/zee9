import { useCallback, useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useWallet } from '../../context/WalletContext'
import { useSound } from '../../lib/sound'
import { GRID_SIZE } from '../engines/mines'
import { connectMinesSocket } from '../lib/minesSocket'
import type { GameComponentProps } from '../types'
import { roundLossMessage } from '../lib/roundResult'
import { getDesignCanvasStyle, getDesignScaleShellStyle, useDesignScale } from '../hooks/useDesignScale'
import { useGameLeaveGuard } from '../hooks/useGameLeaveGuard'
import {
  BackChevronIcon,
  CartWagonIcon,
  GemRevealIcon,
  GuideHandIcon,
  MenuDiamondsIcon,
  MineRevealIcon,
  MoneyBagIcon,
  PokerChipIcon,
  PromoPinIcon,
  SkullBombIcon,
  TreasureChestIcon,
} from './minesClassicGfx'
import styles from './minesGame.module.css'
import AddCashModal from '../../components/s9/modals/AddCashModal'

const BET_STEPS = [10, 20, 50, 100, 200, 500, 1000, 2000, 5000]
const MULT_STEPS = 6

function formatAmount(n: number) {
  return n.toLocaleString('en-PK', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}
function formatCompact(n: number) {
  return n.toLocaleString('en-PK', { minimumFractionDigits: 0, maximumFractionDigits: 0 })
}

type Round = {
  roundId: string
  mineCount: number
  bet: number
  active: boolean
  gems: Set<number>
  mines: Set<number>
  bomb: number | null
  multiplier: number
}

export default function MinesGame({ bet: defaultBet, onMessage }: GameComponentProps) {
  const navigate = useNavigate()
  const viewportRef = useRef<HTMLDivElement>(null)
  const layout = useDesignScale(viewportRef)
  const { balance, refresh, canAfford } = useWallet()
  const { play } = useSound()

  const [betAmount, setBetAmount] = useState(defaultBet || 10)
  const [mineCount, setMineCount] = useState(2)
  const [round, setRound] = useState<Round | null>(null)
  const [busy, setBusy] = useState(false)
  const [showAddCash, setShowAddCash] = useState(false)
  const [menuOpen, setMenuOpen] = useState(false)
  const socketRef = useRef<ReturnType<typeof connectMinesSocket> | null>(null)

  useEffect(() => {
    const sock = connectMinesSocket({
      onError: (message) => onMessage?.(message),
    })
    socketRef.current = sock
    return () => {
      sock.close()
      socketRef.current = null
    }
  }, [onMessage])

  // Fair multipliers only — house edge is applied server-side via mine outcomes.
  const mult = useCallback((revealed: number, mines: number) => {
    if (revealed <= 0) return 0
    let m = 1
    const safe = GRID_SIZE - mines
    for (let i = 0; i < revealed; i++) m *= (GRID_SIZE - i) / (safe - i)
    return m
  }, [])

  const playing = round?.active === true
  const ended = round != null && !round.active
  const showAll = ended

  const gemsFound = round?.gems.size ?? 0
  const currentMult = round?.multiplier ?? 0
  const nextMult = mult(Math.max(1, gemsFound + 1), round?.mineCount ?? mineCount)
  const currentWin = round ? Math.round(round.bet * currentMult * 100) / 100 : 0
  const nextWin = Math.round(betAmount * nextMult * 100) / 100

  const stepMultipliers = Array.from({ length: MULT_STEPS }, (_, i) => mult(i + 1, mineCount))

  const isRevealed = (i: number) => !!round && (round.gems.has(i) || round.bomb === i)

  const adjustBet = (delta: number) => {
    play('chip', { volume: 0.5 })
    setBetAmount((b) => {
      const idx = BET_STEPS.findIndex((s) => s >= b)
      const i = idx === -1 ? BET_STEPS.length - 1 : idx
      if (delta > 0) return BET_STEPS[Math.min(BET_STEPS.length - 1, i + 1)]
      return BET_STEPS[Math.max(0, i - 1)]
    })
  }

  const startRound = useCallback(async () => {
    if (busy) return
    if (betAmount <= 0) return onMessage?.('Set a bet amount first')
    if (!canAfford(betAmount)) {
      play('error')
      return onMessage?.('Insufficient balance')
    }
    setBusy(true)
    try {
      const sock = socketRef.current
      if (!sock) throw new Error('Not connected')
      const res = await sock.request<{ roundId: string }>('start', {
        bet: betAmount,
        mines: mineCount,
      })
      play('bet')
      setRound({ roundId: res.roundId, mineCount, bet: betAmount, active: true, gems: new Set(), mines: new Set(), bomb: null, multiplier: 0 })
      onMessage?.(null)
      void refresh()
    } catch (e: any) {
      play('error')
      onMessage?.(e?.message || 'Could not place bet')
    } finally {
      setBusy(false)
    }
  }, [betAmount, busy, canAfford, mineCount, onMessage, play, refresh])

  const handleCell = useCallback(
    async (index: number) => {
      if (!round?.active || busy || isRevealed(index)) return
      setBusy(true)
      play('reveal', { volume: 0.55 })
      try {
        const sock = socketRef.current
        if (!sock) throw new Error('Not connected')
        const res = await sock.request<{
          safe: boolean
          state?: string
          mines?: number[]
          multiplier?: number
          payout?: number
        }>('reveal', { roundId: round.roundId, tile: index })
        if (res.safe === false) {
          play('boom')
          setTimeout(() => play('lose', { volume: 0.7 }), 180)
          setRound((r) => (r ? { ...r, active: false, bomb: index, mines: new Set(res.mines), multiplier: 0 } : r))
          onMessage?.(roundLossMessage(betAmount))
          void refresh()
        } else if (res.state === 'CASHED_OUT') {
          play('gem')
          setTimeout(() => play('win'), 200)
          setRound((r) => (r ? { ...r, active: false, gems: new Set([...r.gems, index]), mines: new Set(res.mines), multiplier: res.multiplier ?? 0 } : r))
          onMessage?.(`Won Rs ${formatCompact(res.payout ?? 0)}`)
          void refresh()
        } else {
          play('gem')
          setRound((r) => (r ? { ...r, gems: new Set([...r.gems, index]), multiplier: res.multiplier ?? 0 } : r))
        }
      } catch (e: any) {
        play('error')
        onMessage?.(e?.message || 'Reveal failed')
      } finally {
        setBusy(false)
      }
    },
    [busy, onMessage, play, refresh, round],
  )

  const cashOut = useCallback(async () => {
    if (!round?.active || round.gems.size === 0 || busy) return
    setBusy(true)
    try {
      const sock = socketRef.current
      if (!sock) throw new Error('Not connected')
      const res = await sock.request<{ mines?: number[]; multiplier: number; payout: number }>(
        'cashout',
        { roundId: round.roundId },
      )
      play('cashout')
      setTimeout(() => play('coin'), 220)
      setRound((r) => (r ? { ...r, active: false, mines: new Set(res.mines), multiplier: res.multiplier } : r))
      onMessage?.(`Won Rs ${formatCompact(res.payout)}`)
      void refresh()
    } catch (e: any) {
      play('error')
      onMessage?.(e?.message || 'Cash out failed')
    } finally {
      setBusy(false)
    }
  }, [busy, onMessage, play, refresh, round])

  const reset = useCallback(() => {
    play('whoosh', { volume: 0.5 })
    setRound(null)
    onMessage?.(null)
  }, [onMessage, play])

  const { requestLeave, LeaveModal } = useGameLeaveGuard(navigate, {
    hasActiveBet: playing,
    stakeAmount: round?.bet,
    canCashOut: playing && gemsFound > 0,
    cashOutAmount: currentWin,
    onCashOut: cashOut,
  })

  const cellClass = (index: number) => {
    const revealed = isRevealed(index)
    const isMine = round?.mines.has(index)
    if (showAll && !revealed) return isMine ? styles.cellMineDim : styles.cellGemDim
    if (revealed && isMine) return styles.cellMine
    if (revealed) return styles.cellGem
    if (playing) return `${styles.cellHidden} ${styles.cellPlay}`
    return styles.cellHidden
  }

  const activeStep = playing ? gemsFound : 0

  return (
    <>
    <div className={styles.root} ref={viewportRef}>
      <div style={getDesignScaleShellStyle(layout)}>
        <div className={styles.canvas} style={getDesignCanvasStyle(layout)}>
        <div className={styles.caveBg} aria-hidden />

        <header className={styles.topBar}>
          <div className={styles.topLeft}>
            <button type="button" className={styles.backBtn} onClick={requestLeave} aria-label="Back">
              <BackChevronIcon />
            </button>
            <div className={styles.promoBadge}>
              <PromoPinIcon className={styles.promoIcon} />
              <span>Play Game</span>
              <strong>Rs{betAmount}</strong>
            </div>
          </div>

          <div className={styles.topCenter}>
            <img
              className={styles.avatar}
              src="https://api.dicebear.com/7.x/avataaars/svg?seed=P9751521&backgroundColor=f0d0a0&hairColor=e8b830"
              alt=""
            />
            <div className={styles.userMeta}>
              <span className={styles.userName}>Zee9 Player</span>
              <span className={styles.userId}>ID: ZEE9</span>
            </div>
            <div className={styles.balanceBox}>
              <PokerChipIcon className={styles.balanceChip} />
              <span>{formatCompact(balance)}</span>
            </div>
          </div>

          <div className={styles.topRight}>
            <button
              type="button"
              className={styles.addBtn}
              onClick={() => {
                setMenuOpen(false)
                setShowAddCash(true)
              }}
            >
              <span>ADD</span>
              <CartWagonIcon className={styles.cartIcon} />
            </button>
            <button
              type="button"
              className={styles.menuBtn}
              aria-label="Menu"
              onClick={() => setMenuOpen((v) => !v)}
            >
              <MenuDiamondsIcon />
            </button>
            {menuOpen && (
              <div className={styles.menuPanel} role="menu">
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
              </div>
            )}
          </div>
        </header>

        <main className={styles.body}>
          <section className={styles.gridSection}>
            <div className={styles.woodFrame}>
              <div className={styles.woodFrameInner}>
                <div className={styles.grid}>
                  {Array.from({ length: GRID_SIZE }, (_, i) => {
                    const revealed = isRevealed(i)
                    const isMine = round?.mines.has(i)
                    const isHidden = !revealed && !(showAll && !revealed)

                    return (
                      <button
                        key={i}
                        type="button"
                        className={`${styles.cell} ${cellClass(i)}`}
                        onClick={() => handleCell(i)}
                        disabled={!playing || revealed || showAll || busy}
                        data-sfx={playing && !revealed ? 'tap' : undefined}
                      >
                        {revealed && isMine && <MineRevealIcon className={styles.cellIcon} />}
                        {revealed && !isMine && <GemRevealIcon className={styles.cellIcon} />}
                        {showAll && !revealed && isMine && <MineRevealIcon className={styles.cellIcon} />}
                        {showAll && !revealed && !isMine && <GemRevealIcon className={styles.cellIcon} />}
                        {isHidden && (
                          <>
                            <span className={styles.cellEmboss} aria-hidden />
                            <span className={styles.cellShine} aria-hidden />
                          </>
                        )}
                      </button>
                    )
                  })}
                </div>
              </div>
            </div>
          </section>

          <aside className={styles.controlPanel}>
            <div className={styles.multRow}>
              {stepMultipliers.map((m, i) => (
                <div
                  key={i}
                  className={`${styles.multItem} ${activeStep === i + 1 ? styles.multItemActive : ''} ${gemsFound > i ? styles.multItemDone : ''}`}
                >
                  <MoneyBagIcon n={i + 1} className={styles.moneyBag} />
                  <span className={styles.multValue}>{m.toFixed(2)}</span>
                </div>
              ))}
            </div>

            <div className={styles.minesRow}>
              <button
                type="button"
                className={styles.stoneBtnMinus}
                disabled={playing || mineCount <= 1}
                onClick={() => setMineCount((c) => Math.max(1, c - 1))}
                aria-label="Fewer mines"
                data-sfx="chip"
              >
                −
              </button>
              <div className={styles.minesCenter}>
                <SkullBombIcon className={styles.minesBomb} />
                <span className={styles.minesLabel}>
                  Mines <strong>{mineCount}</strong>
                </span>
              </div>
              <button
                type="button"
                className={styles.stoneBtnPlus}
                disabled={playing || mineCount >= 24}
                onClick={() => setMineCount((c) => Math.min(24, c + 1))}
                aria-label="More mines"
                data-sfx="chip"
              >
                +
              </button>
            </div>

            <div className={styles.winRow}>
              <div className={`${styles.winBox} ${styles.winBoxNext}`}>
                <div className={styles.winBoxHead}>Next Win</div>
                <div className={styles.winBoxBody}>
                  <TreasureChestIcon className={styles.chestIcon} />
                  <div className={styles.winBoxStats}>
                    <span className={styles.winMult}>{nextMult.toFixed(2)}X</span>
                    <span className={styles.winAmount}>{formatAmount(nextWin)}</span>
                  </div>
                </div>
              </div>
              <div className={`${styles.winBox} ${styles.winBoxCurrent}`}>
                <div className={styles.winBoxHead}>Win</div>
                <div className={styles.winBoxBody}>
                  <TreasureChestIcon className={styles.chestIcon} />
                  <div className={styles.winBoxStats}>
                    <span className={styles.winMult}>{currentMult > 0 ? `${currentMult.toFixed(2)}X` : '0X'}</span>
                    <span className={styles.winAmount}>{formatAmount(currentWin)}</span>
                  </div>
                </div>
              </div>
            </div>

            <div className={styles.panelBottom}>
              <div className={styles.betRow}>
                <button
                  type="button"
                  className={styles.stoneBtnMinus}
                  disabled={playing}
                  onClick={() => adjustBet(-1)}
                  aria-label="Decrease bet"
                  data-sfx="chip"
                >
                  −
                </button>
                <div className={styles.betCenter}>
                  <span className={styles.betLabel}>Bets</span>
                  <PokerChipIcon className={styles.betChip} />
                  <span className={styles.betValue}>{formatCompact(betAmount)}</span>
                </div>
                <button
                  type="button"
                  className={styles.stoneBtnPlus}
                  disabled={playing}
                  onClick={() => adjustBet(1)}
                  aria-label="Increase bet"
                  data-sfx="chip"
                >
                  +
                </button>
              </div>

              {playing && (
                <div className={styles.startBtnWrap}>
                  <button
                    type="button"
                    className={styles.startBtn}
                    disabled={gemsFound === 0 || busy}
                    onClick={cashOut}
                    data-sfx="cashout"
                  >
                    Cash Out · {formatAmount(currentWin)}
                  </button>
                </div>
              )}
              {!playing && !ended && (
                <div className={styles.startBtnWrap}>
                  <span className={styles.startBtnGlow} aria-hidden />
                  <button type="button" className={styles.startBtn} onClick={startRound} disabled={busy} data-sfx="bet">
                    {busy ? 'Starting…' : 'Start Game'}
                  </button>
                  <GuideHandIcon className={styles.guideHand} aria-hidden />
                </div>
              )}
              {ended && (
                <div className={styles.startBtnWrap}>
                  <button type="button" className={styles.startBtn} onClick={reset} data-sfx="select">
                    Play Again
                  </button>
                </div>
              )}
            </div>
          </aside>
        </main>
        </div>
      </div>
    </div>
    {showAddCash && <AddCashModal onClose={() => setShowAddCash(false)} />}
    {LeaveModal}
    </>
  )
}
