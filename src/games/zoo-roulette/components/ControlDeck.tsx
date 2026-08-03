import { ASSET, CHIP_VALUES, type ChipValue } from '../constants/gameConfig'
import styles from '../styles/zooRoulette.module.css'

type Props = {
  balance: number
  playerName: string
  selectedChip: ChipValue
  canRebet: boolean
  bettingOpen: boolean
  onSelectChip: (v: ChipValue) => void
  onRebet: () => void
  onShift: (dir: -1 | 1) => void
}

function formatBalance(n: number) {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(2)}M`
  if (n >= 10_000) return n.toLocaleString(undefined, { maximumFractionDigits: 0 })
  return n.toLocaleString(undefined, { maximumFractionDigits: 2 })
}

export default function ControlDeck({
  balance,
  playerName,
  selectedChip,
  canRebet,
  bettingOpen,
  onSelectChip,
  onRebet,
  onShift,
}: Props) {
  return (
    <footer className={styles.deck}>
      <img className={styles.deckBg} src={ASSET.ui('deck')} alt="" draggable={false} />
      <div className={styles.player}>
        <div className={styles.avatar}>
          <div className={styles.avatarFace} />
          <img className={styles.avatarFrame} src={ASSET.ui('avatar-frame')} alt="" draggable={false} />
        </div>
        <div className={styles.playerMeta}>
          <div className={styles.playerName}>{playerName}</div>
          <div className={styles.balance}>{formatBalance(balance)}</div>
        </div>
      </div>

      <div className={styles.chipTray}>
        <button type="button" className={`${styles.chipArrow} ${styles.chipArrowFlip}`} onClick={() => onShift(-1)} aria-label="Previous chip">
          <img src={ASSET.ui('ico-tri')} alt="" draggable={false} />
        </button>
        <div className={styles.chips}>
          {CHIP_VALUES.map((v) => (
            <button
              key={v}
              type="button"
              className={`${styles.chipBtn} ${selectedChip === v ? styles.chipSelected : ''}`}
              data-chip={v}
              onClick={() => onSelectChip(v)}
              aria-label={`Select chip ${v}`}
              aria-pressed={selectedChip === v}
            >
              <img src={ASSET.chip(v)} alt="" draggable={false} />
            </button>
          ))}
        </div>
        <button type="button" className={styles.chipArrow} onClick={() => onShift(1)} aria-label="Next chip">
          <img src={ASSET.ui('ico-tri')} alt="" draggable={false} />
        </button>
      </div>

      <button type="button" className={styles.rebetBtn} disabled={!canRebet || !bettingOpen} onClick={onRebet}>
        <img src={ASSET.ui('ico-rebet')} alt="" draggable={false} />
        REBET
      </button>
    </footer>
  )
}
