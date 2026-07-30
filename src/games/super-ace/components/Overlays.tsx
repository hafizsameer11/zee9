import { useMemo, useState } from 'react'
import { ASSET, COIN_FRAMES, formatMoney, featureBuyCost, symbolSrc } from '../constants/gameConfig'
import styles from '../styles/royalAce.module.css'

export function CoinShower({ active, heavy }: { active: boolean; heavy?: boolean }) {
  const coins = useMemo(() => {
    if (!active) return []
    const n = heavy ? 28 : 14
    return Array.from({ length: n }, (_, i) => ({
      id: i,
      left: `${4 + ((i * 17) % 92)}%`,
      delay: `${(i % 10) * 0.08}s`,
      dur: `${1.6 + (i % 7) * 0.18}s`,
      size: 28 + (i % 5) * 6,
      src: COIN_FRAMES[i % COIN_FRAMES.length]!,
    }))
  }, [active, heavy])

  if (!active) return null
  return (
    <div className={styles.coinRain} aria-hidden>
      {coins.map((c) => (
        <img
          key={c.id}
          className={styles.coin}
          src={c.src}
          alt=""
          style={{
            left: c.left,
            width: c.size,
            height: c.size,
            animationDelay: c.delay,
            animationDuration: c.dur,
          }}
        />
      ))}
    </div>
  )
}

export function SuperWinOverlay({
  amount,
  show,
}: {
  amount: number
  show: boolean
}) {
  if (!show) return null
  return (
    <div className={styles.superLayer}>
      <CoinShower active heavy />
      <img className={styles.superTitle} src={ASSET.superWin} alt="SUPER WIN" />
      <div className={styles.superAmount}>{formatMoney(amount)}</div>
    </div>
  )
}

export function BuyBonusPanel({
  bet,
  onClose,
  onBuy,
  onBetChange,
}: {
  bet: number
  onClose: () => void
  onBuy: () => void
  onBetChange: (dir: 1 | -1) => void
}) {
  const [qty, setQty] = useState(1)
  const unit = featureBuyCost(bet)
  const total = Math.round(unit * qty * 100) / 100

  return (
    <>
      <div className={styles.dim} onClick={onClose} />
      <div className={styles.panel} role="dialog" aria-label="Buy Bonus">
        <button type="button" className={styles.closeX} onClick={onClose} aria-label="Close">
          ×
        </button>
        <div className={styles.panelTitle}>Buy Bonus</div>
        <div className={styles.panelHint}>
          Purchase to activate Free Spins with Scatter guarantee.
        </div>
        <img
          src={symbolSrc('scatter')}
          alt=""
          style={{ display: 'block', width: 72, height: 100, margin: '0 auto 10px', objectFit: 'contain' }}
        />
        <div className={styles.panelRow}>
          <span>Bet</span>
          <div className={styles.qtyCtrl}>
            <button type="button" onClick={() => onBetChange(-1)}>
              <img src={ASSET.minus} alt="-" />
            </button>
            <strong>{formatMoney(bet)}</strong>
            <button type="button" onClick={() => onBetChange(1)}>
              <img src={ASSET.plus} alt="+" />
            </button>
          </div>
        </div>
        <div className={styles.panelRow}>
          <span>Quantity</span>
          <div className={styles.qtyCtrl}>
            <button type="button" onClick={() => setQty((q) => Math.max(1, q - 1))}>
              <img src={ASSET.minus} alt="-" />
            </button>
            <strong>{qty}</strong>
            <button type="button" onClick={() => setQty((q) => Math.min(20, q + 1))}>
              <img src={ASSET.plus} alt="+" />
            </button>
          </div>
        </div>
        <div className={styles.panelRow}>
          <span>Price</span>
          <strong>{formatMoney(unit)}</strong>
        </div>
        <div className={styles.panelRow}>
          <span>Total Price</span>
          <strong>{formatMoney(total)}</strong>
        </div>
        <button type="button" className={styles.buyPlay} onClick={onBuy}>
          Buy &amp; Play
        </button>
      </div>
    </>
  )
}

const PAY_ROWS: { id: Parameters<typeof symbolSrc>[0]; label: string; note: string }[] = [
  { id: 'ace', label: 'ACE', note: '5+ · Highest' },
  { id: 'king', label: 'King', note: '5+ · High' },
  { id: 'queen', label: 'Queen', note: '5+ · High' },
  { id: 'jack', label: 'Jack', note: '5+ · High' },
  { id: 'spade', label: 'Spade', note: '5+ · Low' },
  { id: 'heart', label: 'Heart', note: '5+ · Low' },
  { id: 'diamond', label: 'Diamond', note: '5+ · Low' },
  { id: 'club', label: 'Club', note: '5+ · Low' },
  { id: 'wild', label: 'WILD', note: 'Substitutes all but Scatter' },
  { id: 'scatter', label: 'Scatter', note: '3+ → 10 Free Spins' },
]

export function PaytablePanel({ onClose }: { onClose: () => void }) {
  return (
    <>
      <div className={styles.dim} onClick={onClose} />
      <div className={`${styles.panel} ${styles.paytable}`} role="dialog" aria-label="Paytable">
        <button type="button" className={styles.closeX} onClick={onClose} aria-label="Close">
          ×
        </button>
        <div className={styles.panelTitle}>Paytable</div>
        <div className={styles.panelHint}>Match 5 or more identical cards. Combos raise ×1–×5.</div>
        {PAY_ROWS.map((r) => (
          <div key={r.id} className={styles.payRow}>
            <img src={symbolSrc(r.id)} alt={r.label} />
            <span>{r.label}</span>
            <span style={{ color: '#ffe566' }}>{r.note}</span>
          </div>
        ))}
      </div>
    </>
  )
}
