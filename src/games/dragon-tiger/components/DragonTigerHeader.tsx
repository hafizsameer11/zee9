import DragonCharacter from './DragonCharacter'
import TigerCharacter from './TigerCharacter'
import PlayingCard from './PlayingCard'
import { ASSET, type PlayingCard as Card, type Winner } from '../constants/gameConfig'
import { SCENE } from '../constants/assetManifest'
import styles from './DragonTigerHeader.module.css'

type Props = {
  countdown: number
  bettingOpen: boolean
  statusText: string
  history: Winner[]
  dragonCard: Card | null
  tigerCard: Card | null
  dragonRevealed: boolean
  tigerRevealed: boolean
  dealingPhase: 'idle' | 'dragon' | 'tiger' | 'done'
  winner: Winner | null
  muted: boolean
  reducedMotion?: boolean
  onBack: () => void
  onToggleSound: () => void
  onTrend: () => void
  onHelp: () => void
}

/** Characters emerge from scene mist — no coloured header rectangles. */
export default function DragonTigerHeader({
  countdown,
  bettingOpen,
  statusText,
  history,
  dragonCard,
  tigerCard,
  dragonRevealed,
  tigerRevealed,
  dealingPhase,
  winner,
  muted,
  reducedMotion,
  onBack,
  onToggleSound,
  onTrend,
  onHelp,
}: Props) {
  const dragonMode =
    winner === 'tiger' ? 'losing' : winner === 'dragon' ? 'winner' : bettingOpen ? 'betting' : 'idle'
  const tigerMode =
    winner === 'dragon' ? 'losing' : winner === 'tiger' ? 'winner' : bettingOpen ? 'betting' : 'idle'
  const urgent = bettingOpen && countdown > 0 && countdown <= 3

  return (
    <header className={styles.header}>
      <button type="button" className={styles.iconBtn} onClick={onBack} aria-label="Back">
        <img src={ASSET.icon('back')} alt="" />
      </button>

      <div className={styles.dragonWing}>
        <DragonCharacter mode={dragonMode} variant="header" reducedMotion={reducedMotion} />
        <div className={styles.plaque}>DRAGON</div>
      </div>

      <div className={styles.center}>
        <div className={`${styles.cardSlot} ${styles.dragonSlot}`}>
          <PlayingCard
            key={`d-${dealingPhase}-${dragonCard?.id ?? 'back'}`}
            card={dragonCard}
            faceUp={dragonRevealed}
            dealing={dealingPhase === 'dragon'}
          />
        </div>

        <div className={`${styles.timerWrap} ${urgent ? styles.urgent : ''}`}>
          <img className={styles.emblem} src={SCENE.emblem} alt="" draggable={false} />
          <div className={styles.timerCore}>
            <span className={styles.timerNum}>{bettingOpen ? Math.max(0, countdown) : '•'}</span>
            <span className={styles.timerLabel}>
              {bettingOpen ? 'Betting' : statusText.length > 12 ? 'Showdown' : statusText}
            </span>
          </div>
        </div>

        <div className={`${styles.cardSlot} ${styles.tigerSlot}`}>
          <PlayingCard
            key={`t-${dealingPhase}-${tigerCard?.id ?? 'back'}`}
            card={tigerCard}
            faceUp={tigerRevealed}
            dealing={dealingPhase === 'tiger'}
          />
        </div>
      </div>

      <div className={styles.tigerWing}>
        <TigerCharacter mode={tigerMode} variant="header" reducedMotion={reducedMotion} />
        <div className={styles.plaque}>TIGER</div>
      </div>

      <div className={styles.rightBtns}>
        <button type="button" className={styles.iconBtn} onClick={onToggleSound} aria-label="Sound">
          <img src={ASSET.icon(muted ? 'sound-off' : 'sound')} alt="" />
        </button>
        <button type="button" className={styles.iconBtn} onClick={onTrend} aria-label="Trend">
          <img src={ASSET.icon('trend')} alt="" />
        </button>
        <button type="button" className={styles.iconBtn} onClick={onHelp} aria-label="Help">
          <img src={ASSET.icon('help')} alt="" />
        </button>
      </div>

      <div className={styles.history} aria-label="Recent results">
        {history.slice(0, 18).map((w, i) => (
          <span key={`${w}-${i}`} className={`${styles.bead} ${styles[w]}`}>
            {w === 'dragon' ? 'D' : w === 'tiger' ? 'T' : '·'}
          </span>
        ))}
        <button type="button" className={styles.trendOpen} onClick={onTrend} aria-label="Open trend">
          ▲
        </button>
      </div>
    </header>
  )
}
