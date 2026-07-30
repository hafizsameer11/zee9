import { SYMBOL_META, type Fg2Symbol } from '../constants/symbolConfig'
import styles from '../styles/fortuneGems2.module.css'

type Props = {
  open: boolean
  onClose: () => void
}

const ORDER: Fg2Symbol[] = ['wild', 'ruby', 'sapphire', 'emerald', 'A', 'K', 'Q', 'J']

export default function InfoPanel({ open, onClose }: Props) {
  if (!open) return null
  return (
    <div className={styles.infoPanel} onClick={onClose} role="presentation">
      <div
        className={styles.infoCard}
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-label="Game information"
        style={{ position: 'relative' }}
      >
        <button type="button" className={styles.infoClose} onClick={onClose} aria-label="Close">
          ×
        </button>
        <h2>Fortune Gems 2</h2>
        <h3>Symbol Values</h3>
        {ORDER.map((id) => (
          <div key={id} className={styles.payRow}>
            <img src={SYMBOL_META[id].src} alt="" />
            <span>{SYMBOL_META[id].label}</span>
            <strong style={{ marginLeft: 'auto' }}>{SYMBOL_META[id].payout}×</strong>
          </div>
        ))}
        <h3>Wild Guardian</h3>
        <p>Wild substitutes for all symbols and can complete paylines across the 3×3 board.</p>
        <h3>Lucky Wheel</h3>
        <p>
          Land a WHEEL token on the Special Reel to spin the Lucky Wheel for rewards from 3× to
          1000× your bet.
        </p>
        <h3>Special Multiplier</h3>
        <p>
          The center Special token multiplies line wins by 2×, 3×, 5×, 10× or 15×.
        </p>
        <h3>Extra Bet</h3>
        <p>
          Extra Bet adds 50% to the selected base stake. All rewards are calculated from the
          increased total shown in the BET display.
        </p>
        <h3>Full Board</h3>
        <p>Fill all nine cells with matching symbols (wilds assist) for a massive temple reward.</p>
      </div>
    </div>
  )
}
