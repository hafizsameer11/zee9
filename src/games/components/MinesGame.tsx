import { useCallback, useRef, useState } from 'react'
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
import { getDesignCanvasStyle, getDesignScaleShellStyle, useDesignScale } from '../hooks/useDesignScale'
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

const BET_STEPS = [10, 25, 50, 100, 250, 500, 1000, 5000]
const MULT_STEPS = 6

function formatAmount(n: number) {
  return n.toLocaleString('en-PK', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}

function formatCompact(n: number) {
  return n.toLocaleString('en-PK', { minimumFractionDigits: 0, maximumFractionDigits: 0 })
}

export default function MinesGame({ bet: defaultBet, onMessage }: GameComponentProps) {
  const navigate = useNavigate()
  const viewportRef = useRef<HTMLDivElement>(null)
  const layout = useDesignScale(viewportRef)
  const { balance, debit, credit, canAfford } = useWallet()

  const [betAmount, setBetAmount] = useState(defaultBet || 10)
  const [mineCount, setMineCount] = useState(2)
  const [round, setRound] = useState<MinesRound | null>(null)

  const playing = round?.active === true
  const ended = round != null && !round.active
  const showAll = ended

  const gemsFound = round?.revealed.size ?? 0
  const mult = round ? minesMultiplier(gemsFound, round.mineCount) : 0
  const nextMult = minesMultiplier(Math.max(1, gemsFound + 1), mineCount)
  const currentWin = playing || ended ? Math.round(betAmount * mult * 100) / 100 : 0
  const nextWin = Math.round(betAmount * nextMult * 100) / 100

  const stepMultipliers = Array.from({ length: MULT_STEPS }, (_, i) =>
    minesMultiplier(i + 1, mineCount),
  )

  const adjustBet = (delta: number) => {
    setBetAmount((b) => {
      const idx = BET_STEPS.findIndex((s) => s >= b)
      const i = idx === -1 ? BET_STEPS.length - 1 : idx
      if (delta > 0) return BET_STEPS[Math.min(BET_STEPS.length - 1, i + 1)]
      return BET_STEPS[Math.max(0, i - 1)]
    })
  }

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
    onMessage?.(`Won PKR ${formatCompact(win)}`)
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
    if (hit) onMessage?.('Hit a mine!')
  }

  const cellClass = (index: number) => {
    const revealed = round?.revealed.has(index)
    const isMine = round?.mines.has(index)
    if (showAll && !revealed) return isMine ? styles.cellMineDim : styles.cellGemDim
    if (revealed && isMine) return styles.cellMine
    if (revealed) return styles.cellGem
    if (playing) return `${styles.cellHidden} ${styles.cellPlay}`
    return styles.cellHidden
  }

  const activeStep = playing ? gemsFound : 0

  return (
    <div className={styles.root} ref={viewportRef}>
      <div style={getDesignScaleShellStyle(layout)}>
        <div className={styles.canvas} style={getDesignCanvasStyle(layout)}>
        <div className={styles.caveBg} aria-hidden />

        <header className={styles.topBar}>
          <div className={styles.topLeft}>
            <button type="button" className={styles.backBtn} onClick={() => navigate('/home')} aria-label="Back">
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
          <section className={styles.gridSection}>
            <div className={styles.woodFrame}>
              <div className={styles.woodFrameInner}>
                <div className={styles.grid}>
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
                        {revealed && isMine && <MineRevealIcon className={styles.cellIcon} />}
                        {revealed && !isMine && <GemRevealIcon className={styles.cellIcon} />}
                        {showAll && !revealed && isMine && <MineRevealIcon className={styles.cellIcon} />}
                        {showAll && !revealed && !isMine && <GemRevealIcon className={styles.cellIcon} />}
                        {isHidden && playing && <span className={styles.cellShine} />}
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
                    <span className={styles.winMult}>{mult > 0 ? `${mult.toFixed(2)}X` : '0X'}</span>
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
                >
                  +
                </button>
              </div>

              {playing && (
                <div className={styles.startBtnWrap}>
                  <button
                    type="button"
                    className={styles.startBtn}
                    disabled={gemsFound === 0}
                    onClick={cashOut}
                  >
                    Cash Out · {formatAmount(currentWin)}
                  </button>
                </div>
              )}
              {!playing && !ended && (
                <div className={styles.startBtnWrap}>
                  <span className={styles.startBtnGlow} aria-hidden />
                  <button type="button" className={styles.startBtn} onClick={startRound}>
                    Start Game
                  </button>
                  <GuideHandIcon className={styles.guideHand} aria-hidden />
                </div>
              )}
              {ended && (
                <div className={styles.startBtnWrap}>
                  <button type="button" className={styles.startBtn} onClick={reset}>
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
  )
}
