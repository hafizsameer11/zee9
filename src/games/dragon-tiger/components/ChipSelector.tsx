import { ASSET, CHIP_VALUES, type ChipValue } from '../constants/gameConfig'
import { formatChipLabel } from '../utils/cardUtils'
import styles from './ChipSelector.module.css'

type Props = {
  selected: ChipValue
  disabled?: boolean
  onSelect: (v: ChipValue) => void
}

export default function ChipSelector({ selected, disabled, onSelect }: Props) {
  return (
    <div className={`${styles.row} ${disabled ? styles.disabled : ''}`} role="listbox" aria-label="Chips">
      {CHIP_VALUES.map((v) => {
        const active = v === selected
        return (
          <button
            key={v}
            type="button"
            role="option"
            aria-selected={active}
            data-chip={v}
            className={`${styles.chipBtn} ${active ? styles.selected : ''}`}
            disabled={disabled}
            onClick={() => onSelect(v)}
          >
            <img src={ASSET.chip(v)} alt={formatChipLabel(v)} draggable={false} />
            <span className={styles.chipLabel}>{formatChipLabel(v)}</span>
            <span className={styles.sr}>{formatChipLabel(v)}</span>
          </button>
        )
      })}
    </div>
  )
}
