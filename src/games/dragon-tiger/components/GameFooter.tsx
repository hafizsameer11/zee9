import ChipSelector from './ChipSelector'
import { ASSET, type ChipValue } from '../constants/gameConfig'
import { selfAvatarSrc } from './SidePlayers'
import styles from './GameFooter.module.css'

type Props = {
  balance: number
  stake: number
  bettingOpen: boolean
  hasBets: boolean
  canRebet: boolean
  selectedChip: ChipValue
  playerName?: string
  onSelectChip: (v: ChipValue) => void
  onUndo: () => void
  onClear: () => void
  onRebet: () => void
  onDouble: () => void
}

export default function GameFooter({
  balance,
  stake,
  bettingOpen,
  hasBets,
  canRebet,
  selectedChip,
  playerName = 'Player',
  onSelectChip,
  onUndo,
  onClear,
  onRebet,
  onDouble,
}: Props) {
  return (
    <footer className={styles.footer}>
      <div className={styles.player}>
        <div className={styles.avatarWrap}>
          <img className={styles.avatar} src={selfAvatarSrc(6)} alt="" draggable={false} />
          <img
            className={styles.frame}
            src="/games/casino-table/players/frame-gold.png"
            alt=""
            draggable={false}
          />
        </div>
        <div className={styles.meta}>
          <span className={styles.name}>{playerName}</span>
          <span className={styles.bal}>
            <img src={ASSET.icon('coin')} alt="" />
            {balance.toLocaleString(undefined, { maximumFractionDigits: 2 })}
          </span>
        </div>
      </div>

      <ChipSelector selected={selectedChip} disabled={!bettingOpen} onSelect={onSelectChip} />

      <div className={styles.actions}>
        <button type="button" className={styles.smallBtn} disabled={!bettingOpen || !hasBets} onClick={onUndo}>
          Undo
        </button>
        <button type="button" className={styles.smallBtn} disabled={!bettingOpen || !hasBets} onClick={onClear}>
          Clear
        </button>
        <button type="button" className={styles.smallBtn} disabled={!bettingOpen || !hasBets} onClick={onDouble}>
          x2
        </button>
        <button
          type="button"
          className={styles.rebet}
          disabled={!bettingOpen || !canRebet}
          onClick={onRebet}
        >
          ReBet
        </button>
      </div>

      <div className={styles.stakeHint} aria-live="polite">
        Bet {stake.toLocaleString()}
      </div>
    </footer>
  )
}
