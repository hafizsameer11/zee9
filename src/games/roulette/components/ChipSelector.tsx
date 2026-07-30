import { ASSET, CHIP_VALUES, type ChipValue } from '../constants/rouletteConfig'
import styles from './ChipSelector.module.css'

type Props = {
  selected: ChipValue
  onSelect: (v: ChipValue) => void
  disabled?: boolean
  balance: number
}

export default function ChipSelector({ selected, onSelect, disabled, balance }: Props) {
  return (
    <div className={styles.row} role="listbox" aria-label="Chip denomination">
      {CHIP_VALUES.map((v) => {
        const tooExpensive = balance < v
        const isSel = selected === v
        return (
          <button
            key={v}
            type="button"
            role="option"
            aria-selected={isSel}
            data-chip={v}
            className={`${styles.chip} ${isSel ? styles.selected : ''} ${tooExpensive ? styles.disabled : ''}`}
            disabled={disabled || tooExpensive}
            onClick={() => onSelect(v)}
          >
            <img src={ASSET.chip(v)} alt={`${v}`} draggable={false} />
            <span className={styles.chipLabel}>{v >= 1000 ? `${v / 1000}K` : v}</span>
          </button>
        )
      })}
    </div>
  )
}
