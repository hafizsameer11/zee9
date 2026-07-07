import { IconCart, IconShare } from './S9Icons'
import styles from './S9BottomBar.module.css'

type Props = {
  onDeposit: () => void
  onWheel: () => void
  onRefer: () => void
  onWelcome: () => void
  onGrabBonus: () => void
  onBetWheel: () => void
  onRebate: () => void
  onScrollTop: () => void
}

const FEATURES = [
  { icon: '🎡', label: 'Wheel', key: 'wheel' as const },
  { icon: '🎁', label: 'Welcome', sub: '2d 23h', key: 'welcome' as const },
  { icon: '🧧', label: 'Grab Bonus', dot: true, key: 'grab' as const },
  { icon: '🎯', label: 'Bet Wheel', key: 'betWheel' as const },
  { icon: '🏺', label: 'Rebate', key: 'rebate' as const },
]

export default function S9BottomBar({
  onDeposit,
  onWheel,
  onRefer,
  onWelcome,
  onGrabBonus,
  onBetWheel,
  onRebate,
  onScrollTop,
}: Props) {
  const handlers = {
    wheel: onWheel,
    welcome: onWelcome,
    grab: onGrabBonus,
    betWheel: onBetWheel,
    rebate: onRebate,
  }
  return (
    <footer className={styles.bar}>
      <button type="button" className={styles.refer} onClick={onRefer}>
        <IconShare size={14} />
        <span>Refer&amp;Earn</span>
        <span className={styles.coinPile}>🪙</span>
      </button>

      <div className={styles.features}>
        {FEATURES.map((f) => (
          <button
            key={f.label}
            type="button"
            className={styles.feature}
            onClick={handlers[f.key]}
          >
            <span className={styles.iconWrap}>
              <span className={styles.featureIcon}>{f.icon}</span>
              {f.dot && <span className={styles.featureDot}>1</span>}
            </span>
            <span className={styles.featureLabel}>{f.label}</span>
            {f.sub && <span className={styles.featureSub}>{f.sub}</span>}
          </button>
        ))}
      </div>

      <div className={styles.right}>
        <button type="button" className={styles.upArrow} onClick={onScrollTop}>▲</button>
        <button type="button" className={styles.addCash} onClick={onDeposit}>
          <IconCart size={18} />
          <span>ADD CASH</span>
          <span className={styles.cashDot}>1</span>
        </button>
      </div>
    </footer>
  )
}
