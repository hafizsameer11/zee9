import ChipSelector from './ChipSelector'
import { ASSET, type ChipValue } from '../constants/rouletteConfig'
import { colorOfNumber } from '../utils/rouletteNumbers'
import { SELF_FRAME, SPARKLE, selfAvatarSrc } from './SidePlayers'
import styles from './GameChrome.module.css'

type HeaderProps = {
  status: string
  statusKind?: 'default' | 'closing' | 'spin' | 'win'
  countdown: number
  history: number[]
  muted: boolean
  onBack: () => void
  onToggleSound: () => void
  onHelp: () => void
  onSettings: () => void
}

export function GameHeader({
  status,
  statusKind = 'default',
  countdown,
  history,
  muted,
  onBack,
  onToggleSound,
  onHelp,
  onSettings,
}: HeaderProps) {
  return (
    <header className={styles.header}>
      <button type="button" className={styles.iconBtn} onClick={onBack} aria-label="Back">
        <img src={ASSET.icon('back')} alt="" />
      </button>
      <div className={styles.title}>European Roulette</div>
      <div
        className={`${styles.status} ${
          statusKind === 'closing'
            ? styles.statusClosing
            : statusKind === 'spin'
              ? styles.statusSpin
              : statusKind === 'win'
                ? styles.statusWin
                : ''
        }`}
      >
        {status}
      </div>
      <CountdownTimer seconds={countdown} />
      <RecentResults history={history} />
      <div className={styles.spacer} />
      <button type="button" className={styles.iconBtn} onClick={onToggleSound} aria-label="Sound">
        <img src={ASSET.icon(muted ? 'sound-off' : 'sound')} alt="" />
      </button>
      <button type="button" className={styles.iconBtn} onClick={onHelp} aria-label="Help">
        <img src={ASSET.icon('help')} alt="" />
      </button>
      <button type="button" className={styles.iconBtn} onClick={onSettings} aria-label="Settings">
        <img src={ASSET.icon('settings')} alt="" />
      </button>
    </header>
  )
}

export function CountdownTimer({ seconds }: { seconds: number }) {
  const urgent = seconds > 0 && seconds <= 3
  return (
    <div className={`${styles.timer} ${urgent ? styles.timerUrgent : ''}`} aria-live="polite">
      <img src={ASSET.icon('timer')} alt="" />
      <span>{Math.max(0, seconds)}s</span>
    </div>
  )
}

export function RecentResults({ history }: { history: number[] }) {
  return (
    <div className={styles.history} aria-label="Recent results">
      {history.slice(0, 10).map((n, i) => {
        const c = colorOfNumber(n)
        return (
          <span key={`${n}-${i}`} className={`${styles.hPill} ${styles[c]}`}>
            {n}
          </span>
        )
      })}
    </div>
  )
}

type FooterProps = {
  balance: number
  stake: number
  potential: number
  bettingOpen: boolean
  hasBets: boolean
  canRebet: boolean
  selectedChip: ChipValue
  onSelectChip: (v: ChipValue) => void
  onUndo: () => void
  onClear: () => void
  onRebet: () => void
  onDouble: () => void
}

export function GameFooter({
  balance,
  stake,
  potential,
  bettingOpen,
  hasBets,
  canRebet,
  selectedChip,
  onSelectChip,
  onUndo,
  onClear,
  onRebet,
  onDouble,
}: FooterProps) {
  return (
    <footer className={styles.footer}>
      <div className={styles.playerBlock}>
        <div className={styles.avatarWrap}>
          <span className={styles.avatarAura} aria-hidden />
          <img className={styles.avatarImg} src={selfAvatarSrc(6)} alt="" draggable={false} />
          <img className={styles.avatarFrame} src={SELF_FRAME} alt="" draggable={false} />
          <span className={styles.avatarShine} aria-hidden />
          <img className={styles.avatarSparkle} src={SPARKLE} alt="" draggable={false} />
        </div>
        <div className={styles.meta}>
          <span className={styles.metaLabel}>Balance</span>
          <span className={styles.metaValue}>
            <img src={ASSET.icon('coin')} alt="" className={styles.inlineIcon} />
            {balance.toLocaleString()}
          </span>
        </div>
        <div className={styles.meta}>
          <span className={styles.metaLabel}>Bet</span>
          <span className={styles.metaValue}>{stake.toLocaleString()}</span>
        </div>
        <div className={styles.meta}>
          <span className={styles.metaLabel}>Win</span>
          <span className={styles.metaValue}>{potential.toLocaleString()}</span>
        </div>
      </div>
      <div className={styles.chipsRow}>
        <ChipSelector
          selected={selectedChip}
          onSelect={onSelectChip}
          disabled={!bettingOpen}
          balance={balance}
        />
      </div>
      <div className={styles.actionBtns}>
        <button type="button" className={styles.actionBtn} disabled={!bettingOpen || !hasBets} onClick={onUndo}>
          <img src={ASSET.icon('undo')} alt="" /> Undo
        </button>
        <button type="button" className={styles.actionBtn} disabled={!bettingOpen || !hasBets} onClick={onClear}>
          <img src={ASSET.icon('clear')} alt="" /> Clear
        </button>
        <button type="button" className={styles.actionBtn} disabled={!bettingOpen || !canRebet} onClick={onRebet}>
          <img src={ASSET.icon('rebet')} alt="" /> Rebet
        </button>
        <button type="button" className={styles.actionBtn} disabled={!bettingOpen || !hasBets} onClick={onDouble}>
          <img src={ASSET.icon('double')} alt="" /> 2×
        </button>
      </div>
    </footer>
  )
}
